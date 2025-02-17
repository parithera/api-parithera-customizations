import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { File as FileEntity } from 'src/entity/codeclarity/File';
import { File } from '@nest-lab/fastify-multer';
import { AuthenticatedUser } from 'src/types/auth/types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { MemberRole, OrganizationMemberships } from 'src/entity/codeclarity/OrganizationMemberships';
import { Sample } from './samples.entity';
import { AssociateProjectToSamplesPatchBody, SamplesImportBody } from './samples.http';
import { Organization } from 'src/entity/codeclarity/Organization';
import { User } from 'src/entity/codeclarity/User';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { OrganizationLoggerService } from 'src/codeclarity_modules/organizations/organizationLogger.service';
import { ActionType } from 'src/entity/codeclarity/Log';
import { TypedPaginatedData } from 'src/types/paginated/types';
import { UploadData } from 'src/codeclarity_modules/file/file.controller';
import { escapeString } from 'src/utils/cleaner';
import * as fs from 'fs';
import * as amqp from 'amqplib';
import { AnalysisCreateBody } from 'src/types/entities/frontend/Analysis';
import { AnalyzerDoesNotExist, AnaylzerMissingConfigAttribute, EntityNotFound, NotAuthorized, ProjectDoesNotExist, RabbitMQError } from 'src/types/errors/types';
import { Analysis, AnalysisStage, AnalysisStatus } from 'src/entity/codeclarity/Analysis';
import { AnalysisStartMessageCreate } from 'src/types/rabbitMqMessages';
import { Analyzer } from 'src/entity/codeclarity/Analyzer';
import { Project } from 'src/entity/codeclarity/Project';
import { ChatService } from '../chat/chat.service';
import { Result } from 'src/entity/codeclarity/Result';

@Injectable()
export class SampleService {

    constructor(
        private readonly organizationMemberService: OrganizationsMemberService,
        private readonly organizationLoggerService: OrganizationLoggerService,
        private readonly configService: ConfigService,
        private readonly chatService: ChatService,
        @InjectRepository(Sample, 'codeclarity')
        private sampleRepository: Repository<Sample>,
        @InjectRepository(Organization, 'codeclarity')
        private organizationRepository: Repository<Organization>,
        @InjectRepository(User, 'codeclarity')
        private userRepository: Repository<User>,
        @InjectRepository(FileEntity, 'codeclarity')
        private fileRepository: Repository<FileEntity>,
        @InjectRepository(Analysis, 'codeclarity')
        private analysisRepository: Repository<Analysis>,
        @InjectRepository(Analyzer, 'codeclarity')
        private analyzerRepository: Repository<Analyzer>,
        @InjectRepository(Project, 'codeclarity')
        private projectRepository: Repository<Project>,
        @InjectRepository(Result, 'codeclarity')
        private resultRepository: Repository<Result>,
        @InjectRepository(OrganizationMemberships, 'codeclarity')
        private membershipRepository: Repository<OrganizationMemberships>
    ) {
    }


    /**
     * Import a source code project
     * @throws {IntegrationNotSupported}
     * @throws {AlreadyExists}
     * @throws {EntityNotFound}
     * @throws {NotAuthorized}
     *
     * @param orgId The id of the organization
     * @param projectData The project data
     * @param user The authenticated user
     * @returns the id of the created project
     */
    async import(
        orgId: string,
        projectData: SamplesImportBody,
        user: AuthenticatedUser
    ): Promise<string> {
        // (1) Check that the user is a member of the org
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        const sample = new Sample();

        const user_adding = await this.userRepository.findOneOrFail({
            where: {
                id: user.userId
            }
        });

        const organization = await this.organizationRepository.findOneOrFail({
            where: {
                id: orgId
            }
        });

        sample.added_on = new Date()
        sample.name = projectData.name
        sample.description = projectData.description
        sample.tags = projectData.tags
        sample.status = ""
        sample.condition = ""
        sample.projects = []
        sample.files = []
        sample.users = [user_adding]
        sample.organizations = [organization]

        const added_sample = await this.sampleRepository.save(sample);

        const folderPath = join('/private', organization.id, "samples", sample.id);
        await mkdir(folderPath, { recursive: true });

        await this.organizationLoggerService.addAuditLog(
            ActionType.SampleCreate,
            `The User imported sample ${projectData.name} to the organization.`,
            orgId,
            user.userId
        );

        return added_sample.id;
    }

    /**
     * Get many projects of the org
     * @throws {NotAuthorized}
     *
     * @param orgId The id of the org
     * @param paginationUserSuppliedConf Paginiation configuration
     * @param user The authenticatéd user
     * @param searchKey A search key to filter the records by
     * @param sortBy A sort field to sort the records by
     * @param sortDirection A sort direction
     * @returns
     */
    async getMany(
        orgId: string,
        user: AuthenticatedUser,
    ): Promise<TypedPaginatedData<Sample>> {
        // Every member of an org can retrieve all project
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        const samples = await this.sampleRepository.find({
            where: {
                organizations: {
                    id: orgId
                }
            }
        })

        return {
            data: samples,
            page: 0,
            entry_count: samples.length,
            entries_per_page: 0,
            total_entries: samples.length,
            total_pages: 0,
            matching_count: samples.length, // once you apply filters this needs to change
            filter_count: {}
        };
    }

    /**
     * Get many projects of the org
     * @throws {NotAuthorized}
     *
     * @param orgId The id of the org
     * @param paginationUserSuppliedConf Paginiation configuration
     * @param user The authenticatéd user
     * @param searchKey A search key to filter the records by
     * @param sortBy A sort field to sort the records by
     * @param sortDirection A sort direction
     * @returns
     */
    async getQC(
        orgId: string,
        sampleId: string,
        user: AuthenticatedUser,
    ): Promise<string> {
        // Every member of an org can retrieve all project
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        const sample = await this.sampleRepository.findOne({
            where: {
                id: sampleId,
                organizations: {
                    id: orgId
                }
            }
        })
        if (!sample) {
            throw new EntityNotFound()
        }

        const filePath = join('/private', orgId, "samples", sampleId, "multiqc", "multiqc_report.html");

        if (!existsSync(filePath)) {
            throw new EntityNotFound('The MultiQC report file does not exist.');
        }

        const pako = require('pako');
        const fileContent = fs.readFileSync(filePath);
        const compressedFileContent = pako.gzip(fileContent);
        return Buffer.from(compressedFileContent).toString('base64');
    }

    /**
     * Get many projects of the org
     * @throws {NotAuthorized}
     *
     * @param orgId The id of the org
     * @param paginationUserSuppliedConf Paginiation configuration
     * @param user The authenticatéd user
     * @param searchKey A search key to filter the records by
     * @param sortBy A sort field to sort the records by
     * @param sortDirection A sort direction
     * @returns
     */
    async getManyByProject(
        orgId: string,
        project_id: string,
        user: AuthenticatedUser,
    ): Promise<TypedPaginatedData<Sample>> {
        // Every member of an org can retrieve all project
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        const samples = await this.sampleRepository.find({
            where: {
                organizations: {
                    id: orgId
                },
                projects: {
                    id: project_id
                }
            }
        })

        return {
            data: samples,
            page: 0,
            entry_count: samples.length,
            entries_per_page: 0,
            total_entries: samples.length,
            total_pages: 0,
            matching_count: samples.length, // once you apply filters this needs to change
            filter_count: {}
        };
    }

    async uploadFile(
        user: AuthenticatedUser,
        file: File,
        organization_id: string,
        sample_id: string,
        queryParams: UploadData
    ): Promise<void> {
        await this.organizationMemberService.hasRequiredRole(
            organization_id,
            user.userId,
            MemberRole.USER
        );
        // retrieve files from project
        const sample = await this.sampleRepository.findOne({
            where: {
                id: sample_id,
                organizations: {
                    id: organization_id
                }
            },
            // relations: {
            //     added_by: true
            // }
        });
        if (!sample) {
            throw new Error('Project not found');
        }

        // Retrieve the user who added the file
        const added_by = await this.userRepository.findOne({
            where: {
                id: user.userId
            }
        });
        if (!added_by) {
            throw new Error('User not found');
        }

        // Write the file to the file system
        const folderPath = join('/private', organization_id, "samples", sample.id);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const escapedFileName = escapeString(queryParams.file_name);
        const baseName = escapedFileName.split(".", 1)[0];
        // Pad the id with zeros until it is 5 characters long
        const paddedId = queryParams.id.toString().padStart(5, '0');
        const fileNameWithSuffix = `${baseName}.part${paddedId}`;

        if (queryParams.last == "false") {
            const filePath = join(folderPath, fileNameWithSuffix); // Replace with the desired file path
            const fileStream = fs.createWriteStream(filePath, { flags: "a+" });

            // Handle errors during writing or opening the file
            fileStream.on('error', (err) => {
                console.error('File stream error:', err);
            });

            if (file.buffer) {
                await crypto.subtle.digest('SHA-256', file.buffer).then((hash) => {
                    const hashArray = Array.from(new Uint8Array(hash));
                    const stringHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    if (queryParams.hash != stringHash) {
                        console.error("NOT THE SAME HASH!");
                        console.error('Hash:', stringHash);
                        console.error('Original Hash:', queryParams.hash)
                    }
                });
            }
            fileStream.write(file.buffer);
            await new Promise((resolve, reject) => {
                fileStream.end();  // This automatically calls resolve on finish

                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
            });
        } else {
            const filePath = join(folderPath, fileNameWithSuffix); // Replace with the desired file path
            const fileStream = fs.createWriteStream(filePath, { flags: "a+" });

            fileStream.write(file.buffer);
            await new Promise((resolve, reject) => {
                fileStream.end();  // This automatically calls resolve on finish

                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
            });

            // Get all files in folderPath and sort them alphabetically by name
            const files = fs.readdirSync(folderPath).sort();
            // Remove any files that don't match the expected pattern (e.g., .part01)
            const validFiles = [];
            for (const file of files) {
                if (/\.part\d{5}$/.test(file)) {  // Check if the file does not have a .partXX extension
                    validFiles.push(file);  // Add to list but do not delete from disk
                }
            }

            let index = 0;
            for (const file of validFiles) {
                const match = file.match(/(\d+)$/);
                if (match) {
                    const currentIdx = parseInt(match[1], 10);
                    if (currentIdx !== index) {
                        console.log(`Missing chunk at index ${index} in file: ${file}`);
                    }
                    index++;
                }
            }


            // Concatenate their content to finalFileStream
            for (let i = 0; i < validFiles.length; i++) {
                const finalFilePath = join(folderPath, escapedFileName); // Replace with the desired file path
                const finalFileStream = fs.createWriteStream(finalFilePath, { flags: "a+" });
                // Handle errors during writing or opening the file
                finalFileStream.on('error', (err) => {
                    console.error('File stream error:', err);
                });

                try {
                    const fileContent = fs.readFileSync(join(folderPath, validFiles[i]));
                    finalFileStream.write(fileContent);
                } catch {
                    console.error(`Error reading file ${validFiles[i]}`);
                }

                // Remove the temp file after its content has been written to the final file
                if (validFiles[i] !== escapedFileName) {
                    try {
                        fs.unlinkSync(join(folderPath, validFiles[i]));
                    } catch {
                        console.error(`Error deleting temp file ${validFiles[i]}`);
                    }
                }

                await new Promise((resolve, reject) => {
                    finalFileStream.end();
                    finalFileStream.on('finish', resolve);
                    finalFileStream.on('error', reject);
                });
            }

        }

        if (queryParams.chunk == "false" || queryParams.last == "true") {
            // Save the file to the database
            const file_entity = new FileEntity();
            file_entity.added_by = added_by;
            file_entity.added_on = new Date();
            file_entity.type = queryParams.type;
            file_entity.name = escapedFileName;

            await this.fileRepository.save(file_entity);
        }
    }

    /**
     * Create/start an analysis
     * @throws {NotAuthorized} In case the user is not allowed to perform the action on the org
     * @throws {AnalyzerDoesNotExist} In case the referenced analyzer does not exist on the org
     * @throws {AnaylzerMissingConfigAttribute} In case config options required by the anylzer were not provided
     * @param orgId The id of the organizaiton to which the project belongs
     * @param projectId The id of the project on which the analysis should be performed
     * @param analysisData The analysis create body supplied by the user
     * @param user The authenticated user
     * @returns
     */
    async create(
        orgId: string,
        sampleId: string,
        analysisData: AnalysisCreateBody,
        user: AuthenticatedUser
    ): Promise<string> {
        // (1) Check if user has access to org
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        // (2) Check if the project belongs to the org
        const sample = await this.sampleRepository.findOne({
            relations: {
                organizations: true
            },
            where: { id: sampleId, organizations: { id: orgId } }
        });
        if (!sample) {
            throw new NotAuthorized();
        }

        const analyzer = await this.analyzerRepository.findOneBy({
            id: analysisData.analyzer_id
        });

        if (!analyzer) {
            throw new AnalyzerDoesNotExist();
        }

        const creator = await this.userRepository.findOne({
            where: { id: user.userId }
        });
        if (!creator) {
            throw new EntityNotFound();
        }

        const organization = await this.organizationRepository.findOne({
            where: { id: orgId }
        });
        if (!organization) {
            throw new EntityNotFound();
        }

        const config_structure: { [key: string]: any } = {};
        const config: { [key: string]: any } = {};
        const stages: AnalysisStage[][] = [];
        for (const stage of analyzer.steps) {
            const steps: AnalysisStage[] = [];
            for (const step of stage) {
                steps.push({
                    name: step.name,
                    version: step.version,
                    status: AnalysisStatus.REQUESTED,
                    result: undefined,
                    config: {}
                });
                // if (step.persistant_config) {
                //     for (const [key, value] of Object.entries(step.persistant_config)) {
                //         if (!config[step.name]) config[step.name] = {};
                //         config[step.name][key] = value;
                //     }
                // }
                if (step.config) {
                    for (const [key, value] of Object.entries(step.config)) {
                        if (!config_structure[step.name]) config_structure[step.name] = {};
                        config_structure[step.name][key] = value;
                    }
                }
            }
            stages.push(steps);
        }

        // Provider attributes overwrite persistant config attributes
        for (const [pluginName, _] of Object.entries(analysisData.config)) {
            for (const [key, value] of Object.entries(_)) {
                if (!config[pluginName]) config[pluginName] = {};
                config[pluginName][key] = value;
            }
        }

        for (const [pluginName, plugin_config] of Object.entries(config_structure)) {
            for (const [key] of Object.entries(plugin_config)) {
                const config_element = config_structure[pluginName][key];
                if (config_element.required && !config[pluginName][key]) {
                    throw new AnaylzerMissingConfigAttribute();
                }
            }
        }

        const analysis = new Analysis();
        analysis.status = AnalysisStatus.REQUESTED;
        analysis.stage = 0;
        analysis.config = analysisData.config;
        analysis.steps = stages;
        analysis.tag = analysisData.tag;
        analysis.branch = analysisData.branch;
        analysis.commit_hash = analysisData.commit_hash;
        analysis.created_on = new Date();
        analysis.created_by = creator;
        analysis.analyzer = analyzer;
        // analysis.project = project;
        analysis.organization = organization;
        // analysis.integration = project.integration;

        const created_analysis = await this.analysisRepository.save(analysis);

        // Send message to aqmp to start the anaylsis
        const queue = this.configService.getOrThrow<string>('AMQP_ANALYSES_QUEUE');
        const amqpHost = `${this.configService.getOrThrow<string>(
            'AMQP_PROTOCOL'
        )}://${this.configService.getOrThrow<string>('AMQP_USER')}:${process.env.AMQP_PASSWORD
            }@${this.configService.getOrThrow<string>(
                'AMQP_HOST'
            )}:${this.configService.getOrThrow<string>('AMQP_PORT')}`;

        try {
            const conn = await amqp.connect(amqpHost);
            const ch1 = await conn.createChannel();
            await ch1.assertQueue(queue);

            const message: AnalysisStartMessageCreate = {
                analysis_id: created_analysis.id,
                organization_id: orgId,
                integration_id: null,
            };
            ch1.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
            await ch1.close();
        } catch (err) {
            throw new RabbitMQError(err);
        }

        return created_analysis.id;
    }

    /**
     * Update a user's password
     * @throws {EntityNotFound} If the user does not exist
     * @throws {NotAuthorized} If the user is not authorized to perform the action on the indicated userId
     * @throws {PasswordsDoNotMatch} If the provided password and passwordConfirmation do not match
     * @throws {CannotPerformActionOnSocialAccount} If the user tries to update a password on a social account
     *
     * @param userId The id of the user to update
     * @param passwordPatchBody The password update data
     * @param authenticatedUser The authenticated user
     */
    async associateProjectToSamples(
        orgId: string,
        patchBody: AssociateProjectToSamplesPatchBody,
        authenticatedUser: AuthenticatedUser
    ): Promise<void> {
        // (1) Check if user has access to org
        await this.organizationMemberService.hasRequiredRole(orgId, authenticatedUser.userId, MemberRole.USER);

        // (2) Check if the project belongs to the org
        const project = await this.projectRepository.findOne({
            relations: {
                organizations: true,
            },
            where: { id: patchBody.projectId, organizations: { id: orgId } }
        });
        if (!project) {
            throw new ProjectDoesNotExist()
        }

        const samples_to_update = []

        for (const sample_id of patchBody.samples) {
            // (3) Check if the sample belongs to the org
            const sample = await this.sampleRepository.findOne({
                relations: {
                    organizations: true,
                    projects: true
                },
                where: { id: sample_id, organizations: { id: orgId } }
            });
            if (!sample) {
                throw new EntityNotFound()
            }

            sample?.projects.push(project)
            samples_to_update.push(sample)
        }

        await this.sampleRepository.save(samples_to_update)
    }

    /**
     * Delete a sample of an org
     * @throws {NotAuthorized}
     * @throws {EntityNotFound}
     *
     * @param orgId The id of the org
     * @param id The id of the sample
     * @param user The authenticated user
     */
    async delete(orgId: string, id: string, user: AuthenticatedUser): Promise<void> {
        // (1) Check that member is at least a user
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        // (2) Check if project belongs to org
        const isSampleOfOrg = await this.sampleRepository.exists({
            relations: ['organizations'],
            where: {
                id: id,
                organizations: {
                    id: orgId
                }
            }
        });

        if (!isSampleOfOrg) {
            throw new NotAuthorized();
        }

        const membership = await this.membershipRepository.findOne({
            relations: {
                organization: true
            },
            where: {
                organization: {
                    id: orgId
                },
                user: {
                    id: user.userId
                }
            },
            select: {
                role: true,
                organizationMembershipId: true
            }
        });

        if (!membership) {
            throw new EntityNotFound();
        }

        const sample = await this.sampleRepository.findOne({
            relations: {
                files: true
            },
            where: {
                id: id,
                users: {
                    id: user.userId
                }
            }
        })

        if (!sample) {
            throw new NotAuthorized();
        }

        const memberRole = membership.role;

        // Every moderator, admin or owner can remove a project.
        // a normal user can also delete it, iff he is the one that added the project
        if (memberRole == MemberRole.USER) {
            throw new NotAuthorized();
        }

        // Remove project folder
        const filePath = join('/private', orgId, "samples", id);
        if (existsSync(filePath)) {
            await rm(filePath, { recursive: true, force: true });
        }

        if (sample.files.length > 0) {
            const file_ids = sample.files.map(file => file.id);
            await this.fileRepository.delete(file_ids)
        }

        await this.sampleRepository.delete(id);

        await this.organizationLoggerService.addAuditLog(
            ActionType.ProjectDelete,
            `The User removed project ${sample.name} from the organization.`,
            orgId,
            user.userId
        );
    }

    /**
     * Delete a sample of an org
     * @throws {NotAuthorized}
     * @throws {EntityNotFound}
     *
     * @param orgId The id of the org
     * @param id The id of the project
     * @param user The authenticated user
     */
    async deleteProject(orgId: string, id: string, user: AuthenticatedUser): Promise<void> {
        // (1) Check that member is at least a user
        await this.organizationMemberService.hasRequiredRole(orgId, user.userId, MemberRole.USER);

        // (2) Check if project belongs to org
        const isProjectOfOrg = await this.projectRepository.exists({
            relations: ['organizations'],
            where: {
                id: id,
                organizations: {
                    id: orgId
                }
            }
        });

        if (!isProjectOfOrg) {
            throw new NotAuthorized();
        }

        const membership = await this.membershipRepository.findOne({
            relations: {
                organization: true
            },
            where: {
                organization: {
                    id: orgId
                },
                user: {
                    id: user.userId
                }
            },
            select: {
                role: true,
                organizationMembershipId: true
            }
        });

        if (!membership) {
            throw new EntityNotFound();
        }

        const project = await this.projectRepository.findOne({
            relations: {
                analyses: {
                    results: true
                },
                organizations: true
            },
            where: {
                id: id
            }
        })

        if (!project) {
            throw new NotAuthorized();
        }

        // Every moderator, admin or owner can remove a project.
        // a normal user can also delete it, iff he is the one that added the project
        if (membership.role == MemberRole.USER) {
            throw new NotAuthorized();
        }

        const organization = await this.organizationRepository.findOne({relations: {projects: true},where : {id: orgId}})
        if (!organization) {
            throw new EntityNotFound("Organization not found");
        }

        // Find project in organization.projects and remove it
        const updatedProjects = organization.projects.filter(p => p.id !== id);
        organization.projects = updatedProjects;

        await this.organizationRepository.save(organization);

        for (const analysis of project.analyses) {
            await this.resultRepository.remove(analysis.results)
        }
        await this.analysisRepository.remove(project.analyses)
        const chat = await this.chatService.getChatByProjectId(project.id)
        if (chat) {
            await this.chatService.removeChat(chat)
        }

        await this.projectRepository.delete(id);

        // Remove project folder
        const filePath = join('/private', organization.id, "projects", project.id);
        if (existsSync(filePath)) {
            await rm(filePath, {recursive: true, force: true});
        }

        await this.organizationLoggerService.addAuditLog(
            ActionType.ProjectDelete,
            `The User removed project ${project.name} from the organization.`,
            orgId,
            user.userId
        );
    }
}
