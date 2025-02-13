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
import { ChatService } from './chat.service';
import { ChatPrompts } from './chat.prompts';
import { Chat } from './chat.entity';
import { Request, Response, ResponseData, ResponseType } from './types';
import { RAGToolService } from './tools/rag.service';
import { ScanpyToolService } from './tools/scanpy.service';
import { BaseToolService } from './tools/base.service';
import { Socket } from 'dgram';

@WebSocketGateway({
    cors: {
        origin: '*'
    },
    inheritAppConfig: true
})
@UseGuards(CombinedAuthGuard)
export class ChatGateway {
    constructor(
        private readonly organizationMemberService: OrganizationsMemberService,
        private readonly chatService: ChatService,
        private readonly ragToolService: RAGToolService,
        private readonly scanpyToolService: ScanpyToolService,
        private readonly baseToolService: BaseToolService,
    ) { }
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('chat')
    async graph(
        @MessageBody() data: Request,
        @AuthUser() user: AuthenticatedUser,
        @ConnectedSocket() client: Socket,
    ): Promise<Response> {
        await this.organizationMemberService.hasRequiredRole(
            data.organizationId,
            user.userId,
            MemberRole.USER
        );

        // We initiate the prompts var 
        const prompts = new ChatPrompts();

        // We retrieve the chat fo the Project
        // or create it if it doesn't exist
        const chat: Chat = await this.chatService.createOrRetrieveChat(data.projectId, data.organizationId)

        // We ask the LLM what kind of request it is
        const messages = this.baseToolService.forgeLLMRequest(prompts.getTypeOfRequest(), data.request, chat, false)
        const answer = await this.baseToolService.askLLM(messages)

        // Prepare the object that will contain response data
        let response_data: ResponseData = {
            code: '',
            followup: [],
            text: '',
            JSON: {},
            image: '',
            agent: answer,
            status: 'agent_chosen',
            error: '',
        }

        let response_type = ResponseType.INFO
        client.emit('chat:status', {
            data: response_data,
            type: response_type
        })

        switch (answer) {
            case 'rag':
                const rag_messages = this.baseToolService.forgeLLMRequest(prompts.getRAG(), data.request, chat, false)
                const rag_answer = await this.baseToolService.askLLM(rag_messages)
                response_data = this.ragToolService.parseRAGAnswer(rag_answer, response_data, client)
                response_type = ResponseType.SUCCESS
                break;
            case 'scanpy':
                const scanpy_messages = this.baseToolService.forgeLLMRequest(prompts.getScanpy(), data.request, chat, false)
                const scanpy_answer = await this.baseToolService.askLLM(scanpy_messages)
                response_data = await this.scanpyToolService.parseScanpyAnswer(scanpy_answer, response_data, data, client)
                response_data = await this.scanpyToolService.getScriptOutput(data.organizationId, data.projectId, user, response_data, client)
                response_type = ResponseType.SUCCESS
                break;
            default:
                response_data.error = 'Cannot chose which agent to launch'
                response_type = ResponseType.ERROR
                break;
        }

        // Update chat history in DB
        await this.chatService.updateChatHistory(chat, response_data, data.request)

        response_data.status = 'done'
        const response: Response = {
            data: response_data,
            type: response_type
        };

        return response
    }
}
