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
import { ChatService } from './chat.service';
import { ChatPrompts } from './chat.prompts';
import { Chat } from './chat.entity';
import { Request, Response, ResponseData, ResponseType } from './types';
import { RAGToolService } from './tools/rag.service';
import { ScanpyToolService } from './tools/scanpy.service';
import { BaseToolService } from './tools/base.service';
import { Socket } from 'dgram';
import { CombinedAuthGuard } from 'src/base_modules/auth/guards/combined.guard';
import { OrganizationsRepository } from 'src/base_modules/organizations/organizations.repository';
import { MemberRole } from 'src/base_modules/organizations/memberships/organization.memberships.entity';
import { ChatRepository } from './chat.repository';

/**
 * WebSockets gateway for chat functionality
 */
@WebSocketGateway({
    cors: {
        origin: '*', // Allow connections from any origin
    },
    inheritAppConfig: true, // Inherit app config settings
})
@UseGuards(CombinedAuthGuard) // Secure the gateway with combined auth guard
export class ChatGateway {
    /**
     * Constructor for chat gateway
     *
     * @param organizationsRepository Organizations repository instance
     * @param chatRepository Chat repository instance
     * @param chatService Chat service instance
     * @param ragToolService RAG tool service instance
     * @param scanpyToolService Scanpy tool service instance
     * @param baseToolService Base tool service instance
     */
    constructor(
        private readonly organizationsRepository: OrganizationsRepository,
        private readonly chatRepository: ChatRepository,
        private readonly chatService: ChatService,
        private readonly ragToolService: RAGToolService,
        private readonly scanpyToolService: ScanpyToolService,
        private readonly baseToolService: BaseToolService,
    ) { }

    /**
     * Server instance for the gateway
     */
    @WebSocketServer()
    server: Server;

    /**
     * Handle 'chat' message subscription
     *
     * @param data Request data
     * @param user Authenticated user
     * @param client Connected socket client
     * @returns Response to the client
     */
    @SubscribeMessage('chat')
    async graph(
        @MessageBody() data: Request,
        @AuthUser() user: AuthenticatedUser,
        @ConnectedSocket() client: Socket,
    ): Promise<Response> {
        // Check if user has required role in organization
        await this.organizationsRepository.hasRequiredRole(data.organizationId, user.userId, MemberRole.USER);

        // Initialize prompts object
        const prompts = new ChatPrompts();

        // Retrieve or create chat for the project
        const chat: Chat = await this.chatService.createOrRetrieveChat(data.projectId, data.organizationId);

        // Forge LLM request to determine the type of request
        const messages = this.baseToolService.forgeLLMRequest(prompts.getTypeOfRequest(), data.request, chat, false);
        const answer = await this.baseToolService.askLLM(messages);

        // Prepare response object
        let response_data: ResponseData = {
            code: '',
            followup: [],
            text: '',
            json: {},
            image: '',
            agent: answer,
            status: 'agent_chosen',
            error: '',
        };

        // Determine response type based on the answer
        let response_type = ResponseType.INFO;
        client.emit('chat:status', {
            data: response_data,
            type: response_type,
        });

        // Handle different types of answers (RAG, Scanpy, etc.)
        let analysis_id = '';
        switch (answer) {
            case 'rag':
                const rag_messages = this.baseToolService.forgeLLMRequest(prompts.getRAG(), data.request, chat, false);
                const rag_answer = await this.baseToolService.askLLM(rag_messages);
                response_data = this.ragToolService.parseRAGAnswer(rag_answer, response_data, client);
                response_type = ResponseType.SUCCESS;
                break;
            case 'scanpy':
                const script_response = await this.scanpyToolService.start(data, response_data, chat, user, client);
                response_data = script_response.response;
                analysis_id = script_response.analysisId;
                response_type = ResponseType.SUCCESS;
                break;
            default:
                response_data.error = 'Cannot choose which agent to launch';
                response_type = ResponseType.ERROR;
                break;
        }

        // Update chat history in DB
        response_data.status = 'done';
        await this.chatRepository.updateChatHistory(chat, response_data, data.request, analysis_id);

        const response: Response = {
            data: response_data,
            type: response_type,
        };

        return response;
    }
}
