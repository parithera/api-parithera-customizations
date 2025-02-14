import { UseGuards } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { CombinedAuthGuard } from 'src/codeclarity_modules/auth/guards/combined.guard';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { AuthUser } from 'src/decorators/UserDecorator';
import { MemberRole } from 'src/entity/codeclarity/OrganizationMemberships';
import { AuthenticatedUser } from 'src/types/auth/types';
import { Request, Response, ResponseType } from './types';
import { Socket } from 'dgram';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from 'src/entity/codeclarity/Project';
import { Repository } from 'typeorm';
import { EntityNotFound, ProjectDoesNotExist } from 'src/types/errors/types';
import { Sample } from './samples.entity';
import { AnalyzersService } from 'src/codeclarity_modules/analyzers/analyzers.service';
import { AnalysesService } from 'src/codeclarity_modules/analyses/analyses.service';
import { AnalysisResultsService } from 'src/codeclarity_modules/results/results.service';
import { Result } from 'src/entity/codeclarity/Result';
import { Chat } from '../chat/chat.entity';
import { ChatService } from '../chat/chat.service';

@WebSocketGateway({
    cors: {
        origin: '*'
    },
    inheritAppConfig: true
})
@UseGuards(CombinedAuthGuard)
export class LinkSamplesGateway {
    constructor(
        private readonly organizationMemberService: OrganizationsMemberService,
        private readonly analyzerService: AnalyzersService,
        private readonly analysisService: AnalysesService,
        private readonly chatService: ChatService,
        @InjectRepository(Project, 'codeclarity')
        private projectRepository: Repository<Project>,
        @InjectRepository(Sample, 'codeclarity')
        private sampleRepository: Repository<Sample>,
        @InjectRepository(Result, 'codeclarity')
        private resultRepository: Repository<Result>,
    ) { }
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('link_samples')
    async graph(
        @MessageBody() data: Request,
        @AuthUser() user: AuthenticatedUser,
        @ConnectedSocket() client: Socket,
    ): Promise<Response> {
        // (1) Check if user has access to org
        await this.organizationMemberService.hasRequiredRole(
            data.organizationId,
            user.userId,
            MemberRole.USER
        );

        // (2) Check if the project belongs to the org
        const project = await this.projectRepository.findOne({
            relations: {
                organizations: true,
            },
            where: { id: data.projectId, organizations: { id: data.organizationId } }
        });
        if (!project) {
            throw new ProjectDoesNotExist()
        }

        const samples_to_update = []

        for (const sample_element of data.groups) {
            // (3) Check if the sample belongs to the org
            const sample = await this.sampleRepository.findOne({
                relations: {
                    organizations: true,
                    projects: true
                },
                where: { id: sample_element.files[0], organizations: { id: data.organizationId } }
            });
            if (!sample) {
                throw new EntityNotFound()
            }

            sample?.projects.push(project)
            samples_to_update.push(sample)
        }

        // We retrieve the chat fo the Project
        // or create it if it doesn't exist
        const chat: Chat = await this.chatService.createOrRetrieveChat(data.projectId, data.organizationId)

        const response_data = {
            error: '',
            status: 'done'
        }

        const analyzer = await this.analyzerService.getByName(data.organizationId, 'execute_python_script', user)
        const analysisId = await this.analysisService.create(
            data.organizationId,
            data.projectId,
            {
                analyzer_id: analyzer.id,
                config: {
                    python: {
                        project: data.projectId,
                        user: project.added_by?.id,
                        groups: data.groups,
                        script: 'link_to_project',
                        type: 'chat'
                    }
                },
                branch: '',
            },
            user
        )

         let checkCount = 0;
        const maxChecks = 60; // 2 minutes (60 seconds * 2)

        let result = await this.resultRepository.findOne({
            where: {
                analysis: {id: analysisId}
            }
        })

        while (!result && checkCount < maxChecks) {
            result = await this.resultRepository.findOne({
                where: {
                    analysis: {id: analysisId},
                    plugin: 'python'
                }
            })
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
            checkCount++;
        }

        if (!result) {
            response_data.error = 'Script failed to execute'
            return {
                data: response_data,
                type: ResponseType.ERROR
            }
        }

        // Warn client that the script has been executed
        response_data.status = 'script_executed'
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        })

        await this.sampleRepository.save(samples_to_update)

        response_data.status = 'done'
        return {
            data: response_data,
            type: ResponseType.SUCCESS
        }
    }
}
