import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorDecorator } from 'src/decorators/ApiException';
import { APIDocCreatedResponseDecorator } from 'src/decorators/CrudResponse';
import { AuthUser } from 'src/decorators/UserDecorator';
import { CreatedResponse, NoDataResponse, TypedPaginatedResponse, TypedResponse } from 'src/types/apiResponses';
import { AlreadyExists, AnalyzerDoesNotExist, AnaylzerMissingConfigAttribute, EntityNotFound, InternalError, NotAuthenticated, NotAuthorized, ProjectDoesNotExist } from 'src/types/errors/types';
import { AssociateProjectToSamplesPatchBody, SamplesImportBody } from './samples.http';
import { AuthenticatedUser } from 'src/types/auth/types';
import { SampleService } from './samples.service';
import { APIDocTypedPaginatedResponseDecorator } from 'src/decorators/TypedPaginatedResponse';
import { Sample } from './samples.entity';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { UploadData } from 'src/codeclarity_modules/file/file.controller';
import { File } from '@nest-lab/fastify-multer';
import { AnalysisCreateBody } from 'src/types/entities/frontend/Analysis';
import { APIDocNoDataResponseDecorator } from 'src/decorators/NoDataResponse';

@Controller('org/:org_id/samples')
export class SampleController {
    constructor(
        private readonly sampleService: SampleService,
    ) { }

    @ApiTags('Samples')
    @APIDocCreatedResponseDecorator()
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 409, errors: [AlreadyExists] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Post('')
    async create(
        @Body() project: SamplesImportBody,
        @AuthUser() user: AuthenticatedUser,
        @Param('org_id') org_id: string
    ): Promise<CreatedResponse> {
        return { id: await this.sampleService.create(org_id, project, user) };
    }

    @ApiTags('Samples')
    @APIDocCreatedResponseDecorator()
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 409, errors: [AlreadyExists] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get('import/:sample_id')
    async import(
        @AuthUser() user: AuthenticatedUser,
        @Param('org_id') org_id: string,
        @Param('sample_id') sample_id: string
    ): Promise<CreatedResponse> {
        return { id: await this.sampleService.import(org_id, sample_id, user) };
    }

    @ApiTags('Samples')
    @APIDocTypedPaginatedResponseDecorator(Sample)
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get('')
    async getMany(
        @AuthUser() user: AuthenticatedUser,
        @Param('org_id') org_id: string,
        // @Query('page', new DefaultValuePipe(0), ParseIntPipe) page?: number,
        // @Query('entries_per_page', new DefaultValuePipe(0), ParseIntPipe) entries_per_page?: number,
        // @Query('search_key') search_key?: string,
        // @Query('sort_key') sort_key?: AllowedOrderByGetProjects,
        // @Query('sort_direction') sort_direction?: SortDirection
    ): Promise<TypedPaginatedResponse<Sample>> {
        // const pageParam = page ? parseInt(page + '') : 0;
        // const entriesPerPageParam = entries_per_page ? parseInt(entries_per_page + '') : 0;
        return await this.sampleService.getMany(
            org_id,
            user
        );
    }

    @ApiTags('Samples')
    @APIDocTypedPaginatedResponseDecorator(Sample)
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get(':sample_id/qc')
    async getMultiQC(
        @AuthUser() user: AuthenticatedUser,
        @Param('org_id') org_id: string,
        @Param('sample_id') sample_id: string,
    ): Promise<TypedResponse<string>> {
        return {
            data: await this.sampleService.getQC(
                org_id,
                sample_id,
                user
            )
        }
    }

    @ApiTags('Samples')
    @APIDocTypedPaginatedResponseDecorator(Sample)
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get('byproject/:project_id')
    async getManyByProject(
        @AuthUser() user: AuthenticatedUser,
        @Param('org_id') org_id: string,
        @Param('project_id') project_id: string,
        // @Query('page', new DefaultValuePipe(0), ParseIntPipe) page?: number,
        // @Query('entries_per_page', new DefaultValuePipe(0), ParseIntPipe) entries_per_page?: number,
        // @Query('search_key') search_key?: string,
        // @Query('sort_key') sort_key?: AllowedOrderByGetProjects,
        // @Query('sort_direction') sort_direction?: SortDirection
    ): Promise<TypedPaginatedResponse<Sample>> {
        // const pageParam = page ? parseInt(page + '') : 0;
        // const entriesPerPageParam = entries_per_page ? parseInt(entries_per_page + '') : 0;
        return await this.sampleService.getManyByProject(
            org_id,
            project_id,
            user
        );
    }

    @ApiTags('Samples')
    @APIDocTypedPaginatedResponseDecorator(Sample)
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get('public')
    async getPublicSamples(
        @AuthUser() user: AuthenticatedUser,
        // @Query('page', new DefaultValuePipe(0), ParseIntPipe) page?: number,
        // @Query('entries_per_page', new DefaultValuePipe(0), ParseIntPipe) entries_per_page?: number,
        // @Query('search_key') search_key?: string,
        // @Query('sort_key') sort_key?: AllowedOrderByGetProjects,
        // @Query('sort_direction') sort_direction?: SortDirection
    ): Promise<TypedPaginatedResponse<Sample>> {
        // const pageParam = page ? parseInt(page + '') : 0;
        // const entriesPerPageParam = entries_per_page ? parseInt(entries_per_page + '') : 0;
        return await this.sampleService.getPublicSamples(
            user
        );
    }

    @ApiTags('Samples')
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Patch('upload/:sample_id')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    @ApiBody({
        required: true,
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                },
                type: {
                    type: 'string'
                }
            }
        }
    })
    async uploadFile(
        @AuthUser() user: AuthenticatedUser,
        @Param('org_id') organization_id: string,
        @Param('sample_id') sample_id: string,
        @Body() queryParams: UploadData,
        @UploadedFile() file: File
    ): Promise<void> {
        // https://medium.com/@hackntosh/how-to-handle-file-uploading-with-nestjs-fastify-swagger-81afb08767ce
        if (!file) {
            throw new InternalError('500', 'No file provided');
        }

        this.sampleService.uploadFile(user, file, organization_id, sample_id, queryParams);
        return;
    }

    @ApiTags('Samples')
    @ApiOperation({ description: 'Start an analysis on the project.' })
    @APIDocCreatedResponseDecorator()
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({
        statusCode: 400,
        errors: [AnalyzerDoesNotExist, AnaylzerMissingConfigAttribute]
    })
    @Post(':sample_id/analyses')
    async createAnalysis(
        @AuthUser() user: AuthenticatedUser,
        @Body() analysis: AnalysisCreateBody,
        @Param('org_id') org_id: string,
        @Param('sample_id') sample_id: string
    ): Promise<CreatedResponse> {
        return { id: await this.sampleService.createAnalysis(org_id, sample_id, analysis, user) };
    }

    @ApiTags('Samples')
    @APIDocNoDataResponseDecorator()
    @ApiErrorDecorator({
        statusCode: 400,
        errors: [ProjectDoesNotExist]
    })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Patch('linktoproject')
    async updateAccountPassword(
        @AuthUser() user: AuthenticatedUser,
        @Body() patch: AssociateProjectToSamplesPatchBody,
        @Param('org_id') org_id: string
    ): Promise<NoDataResponse> {
        // await this.usersService.updatePassword(user_id, patch, user);
        await this.sampleService.associateProjectToSamples(org_id, patch, user);
        return {};
    }

    @ApiTags('Samples')
    @APIDocNoDataResponseDecorator()
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Delete(':sample_id')
    async delete(
        @AuthUser() user: AuthenticatedUser,
        @Param('sample_id') sample_id: string,
        @Param('org_id') org_id: string
    ): Promise<NoDataResponse> {
        await this.sampleService.delete(org_id, sample_id, user);
        return {};
    }

    @ApiTags('Samples')
    @APIDocNoDataResponseDecorator()
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Delete('/project/:project_id')
    async deleteProject(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string
    ): Promise<NoDataResponse> {
        await this.sampleService.deleteProject(org_id, project_id, user);
        return {};
    }
}
