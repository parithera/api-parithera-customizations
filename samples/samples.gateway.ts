import { UseGuards } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthUser } from 'src/decorators/UserDecorator';
import { AuthenticatedUser } from 'src/base_modules/auth/auth.types';
import { Request, Response, ResponseType } from './types';
import { Socket } from 'dgram';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFound } from 'src/types/error.types';
import { Sample } from './samples.entity';
import { Chat } from '../chat/chat.entity';
import { ChatService } from '../chat/chat.service';
import { AnalyzersService } from 'src/base_modules/analyzers/analyzers.service';
import { AnalysesService } from 'src/base_modules/analyses/analyses.service';
import { OrganizationsRepository } from 'src/base_modules/organizations/organizations.repository';
import { MemberRole } from 'src/base_modules/organizations/memberships/organization.memberships.entity';
import { ProjectsRepository } from 'src/base_modules/projects/projects.repository';
import { CombinedAuthGuard } from 'src/base_modules/auth/guards/combined.guard';
import { AnalysisResultsRepository } from 'src/codeclarity_modules/results/results.repository';
import { ChatRepository } from '../chat/chat.repository';

/**
 * WebSocket gateway for linking samples to a project.
 */
@WebSocketGateway({
    cors: {
        origin: '*',
    },
    inheritAppConfig: true,
})
@UseGuards(CombinedAuthGuard)
export class LinkSamplesGateway {
    /**
     * Constructor.
     *
     * @param analyzerService Analyzers service instance
     * @param analysisService Analyses service instance
     * @param chatService Chat service instance
     * @param chatRepository Chat repository instance
     * @param organizationsRepository Organizations repository instance
     * @param projectsRepository Projects repository instance
     * @param resultsRepository Results repository instance
     * @param sampleRepository Sample repository instance
     */
    constructor(
        private readonly analyzerService: AnalyzersService,
        private readonly analysisService: AnalysesService,
        private readonly chatService: ChatService,
        private readonly chatRepository: ChatRepository,
        private readonly organizationsRepository: OrganizationsRepository,
        private readonly projectsRepository: ProjectsRepository,
        private readonly resultsRepository: AnalysisResultsRepository,
        @InjectRepository(Sample, 'codeclarity')
        private sampleRepository: Repository<Sample>,
    ) { }

    /**
     * Server instance.
     */
    @WebSocketServer()
    server: Server;

    /**
     * Handle link samples message.
     *
     * @param data Request data
     * @param user Authenticated user instance
     * @param client Connected socket instance
     * @returns Response object
     */
    @SubscribeMessage('link_samples')
    async graph(
        @MessageBody() data: Request,
        @AuthUser() user: AuthenticatedUser,
        @ConnectedSocket() client: Socket,
    ): Promise<Response> {
        // (1) Check if user has access to org
        await this.organizationsRepository.hasRequiredRole(
            data.organizationId,
            user.userId,
            MemberRole.USER,
        );

        // (2) Check if the project belongs to the org
        const project = await this.projectsRepository.getProjectByIdAndOrganization(
            data.projectId,
            data.organizationId,
            {
                organizations: true,
            },
        );

        const samplesToUpdate = [];

        for (const sampleElement of data.groups) {
            // (3) Check if the sample belongs to the org
            const sample = await this.sampleRepository.findOne({
                relations: {
                    organizations: true,
                    projects: true,
                },
                where: { id: sampleElement.files[0], organizations: { id: data.organizationId } },
            });

            if (!sample) {
                throw new EntityNotFound();
            }

            sample.projects.push(project);
            samplesToUpdate.push(sample);
        }

        // We retrieve the chat fo the Project
        // or create it if it doesn't exist
        const chat: Chat = await this.chatService.createOrRetrieveChat(
            data.projectId,
            data.organizationId,
        );

        const response_data = {
            error: '',
            status: 'done',
        };

        const analyzer = await this.analyzerService.getByName(
            data.organizationId,
            'execute_python_script',
            user,
        );
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
                        type: 'chat',
                    },
                },
                branch: '',
            },
            user,
        );

        let checkCount = 0;
        const maxChecks = 60 * 10;

        let result = await this.resultsRepository.getByAnalysisIdAndPluginType(
            analysisId,
            'python',
        );

        while (!result && checkCount < maxChecks) {
            result = await this.resultsRepository.getByAnalysisIdAndPluginType(
                analysisId,
                'python',
            );
            await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 second
            checkCount++;
        }

        if (!result) {
            response_data.error = 'Script failed to execute';
            return {
                data: response_data,
                type: ResponseType.ERROR,
            };
        }

        const chatToModify = await this.chatRepository.getByProjectId(project.id);
        chat.messages[0].text = 'Hi, how can I help you today?';
        await this.chatRepository.updateChat(chat);

        // Warn client that the script has been executed
        response_data.status = 'script_executed';
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO,
        });
        await this.sampleRepository.save(samplesToUpdate);

        response_data.status = 'done';
        return {
            data: response_data,
            type: ResponseType.SUCCESS,
        };
    }
}
