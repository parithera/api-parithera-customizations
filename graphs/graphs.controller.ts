import { Controller, Get, Param } from '@nestjs/common';

import { TypedResponse } from 'src/types/apiResponses';
import { AuthenticatedUser } from 'src/types/auth/types';
import { AuthUser } from 'src/decorators/UserDecorator';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorDecorator } from 'src/decorators/ApiException';
import {
    EntityNotFound,
    InternalError,
    NotAuthenticated,
    NotAuthorized
} from 'src/types/errors/types';
import { readFile } from 'fs';
import { join } from 'path';
import { Result, ResultByAnalysisId } from 'src/entity/codeclarity/Result';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { MemberRole } from 'src/entity/codeclarity/OrganizationMemberships';
import { Project } from 'src/entity/codeclarity/Project';

@Controller('org/:org_id/projects')
export class GraphController {
    constructor(
        private readonly organizationMemberService: OrganizationsMemberService,
        @InjectRepository(Result, 'codeclarity')
        private resultRepository: Repository<Result>,
        @InjectRepository(Project, 'codeclarity')
        private projectRepository: Repository<Project>
    ) { }

    @ApiTags('Graphs')
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get(':project_id/svg_graph')
    async getSVGGraph(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string
    ): Promise<TypedResponse<string>> {
        await this.organizationMemberService.hasRequiredRole(org_id, user.userId, MemberRole.USER);

        const project = await this.projectRepository.findOne({
            where: {
                id: project_id,
                organizations: {
                    id: org_id
                }
            },
            relations: {
                added_by: true
            }
        });
        if (!project) {
            throw new Error('Project not found');
        }

        const filePath = join('/private', project.added_by.id, project_id, 'graph.svg');
        return new Promise((resolve, reject) => {
            return readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(EntityNotFound);
                }
                resolve({
                    data: data
                });
            });
        });
    }

    @ApiTags('Graphs')
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get(':project_id/png_graph/:analysis_id')
    async getAnalysisGraph(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string,
        @Param('analysis_id') analysis_id: string
    ): Promise<TypedResponse<string>> {
        await this.organizationMemberService.hasRequiredRole(org_id, user.userId, MemberRole.USER);

        const project = await this.projectRepository.findOne({
            where: {
                id: project_id,
                organizations: {
                    id: org_id
                }
            },
            relations: {
                added_by: true
            }
        });
        if (!project) {
            throw new Error('Project not found');
        }

        const filePath = join('/private', project.added_by.id, project_id, "data", analysis_id + '.png');
        return new Promise((resolve, reject) => {
            return readFile(filePath, 'base64', (err, data) => {
                if (err) {
                    reject(EntityNotFound);
                }
                resolve({
                    data: data
                });
            });
        });
    }

    @ApiTags('Results')
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get(':project_id/result/:analysis_id')
    async getResultByAnalysisId(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string,
        @Param('analysis_id') analysis_id: string
    ): Promise<TypedResponse<ResultByAnalysisId>> {
        await this.organizationMemberService.hasRequiredRole(org_id, user.userId, MemberRole.USER);
        const res: ResultByAnalysisId = {
            id: '',
            image: ''
        };
        const result = await this.resultRepository.findOne({
            where: {
                analysis: {
                    id: analysis_id
                }
            },
            relations: {
                analysis: true
            }
        });
        if (!result) {
            return {
                data: res
            };
        }

        res.id = result.id;
        res.image = result.analysis.id;

        return {
            data: res
        };
    }
}
