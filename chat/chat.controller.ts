import { Controller, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/base_modules/auth/auth.types';
import { AuthUser } from 'src/decorators/UserDecorator';
import { TypedResponse } from 'src/types/apiResponses.types';
import {
    EntityNotFound,
    InternalError,
    NotAuthenticated,
    NotAuthorized
} from 'src/types/error.types';
import { ApiErrorDecorator } from 'src/decorators/ApiException';
import { Chat } from './chat.entity';

@Controller('/gpt')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}
    @ApiTags('Chat')
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get(':project_id/history/:org_id')
    async getSVGElbow(
        @AuthUser() user: AuthenticatedUser,
        @Param('project_id') project_id: string,
        @Param('org_id') org_id: string
    ): Promise<TypedResponse<Chat>> {
        return {
            data: await this.chatService.getHistory(project_id, org_id, user)
        };
    }
}
