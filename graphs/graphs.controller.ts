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

@Controller('org/:org_id/projects')
export class GraphController {
    @ApiTags('Graphs')
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get(':project_id/svg_elbow')
    async getSVGElbow(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string
    ): Promise<TypedResponse<string>> {
        const filePath = join('/private', user.userId, project_id, 'plot_elbow.svg');
        return new Promise((resolve, reject) => {
            return readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
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
    @Get(':project_id/svg_umap')
    async getSVGUMAP(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string
    ): Promise<TypedResponse<string>> {
        const filePath = join('/private', user.userId, project_id, 'plot_umap.svg');
        return new Promise((resolve, reject) => {
            return readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
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
    @Get(':project_id/svg_variable_features')
    async getSVGVariableFeatures(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string
    ): Promise<TypedResponse<string>> {
        const filePath = join(
            process.cwd(),
            'files',
            user.userId,
            project_id,
            'plot_variable_features.svg'
        );
        return new Promise((resolve, reject) => {
            return readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
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
    @Get(':project_id/svg_violin')
    async getSVGViolin(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string
    ): Promise<TypedResponse<string>> {
        const filePath = join('/private', user.userId, project_id, 'plot_violin.svg');
        return new Promise((resolve, reject) => {
            return readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
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
    @Get(':project_id/svg_graph')
    async getSVGGraph(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string
    ): Promise<TypedResponse<string>> {
        const filePath = join('/private', user.userId, project_id, 'graph.svg');
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
}
