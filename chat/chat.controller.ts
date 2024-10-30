import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChartData, ChatService } from './chat.service';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/types/auth/types';
import { AuthUser } from 'src/decorators/UserDecorator';
import { TypedResponse } from 'src/types/apiResponses';
import { APIDocTypedManyResponseDecorator } from 'src/decorators/TypedManyResponse';
import {
    EntityNotFound,
    InternalError,
    NotAuthenticated,
    NotAuthorized
} from 'src/types/errors/types';
import { ApiErrorDecorator } from 'src/decorators/ApiException';
import { AskGPT } from 'src/enterprise_modules/chat/types';
import { Chat } from './chat.entity';

@Controller('/gpt')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @ApiTags('Chat')
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @APIDocTypedManyResponseDecorator(AskGPT)
    @Post('ask')
    async askgpt(
        @AuthUser() user: AuthenticatedUser,
        @Body() queryParams: AskGPT
    ): Promise<TypedResponse<ChartData>> {
        return {
            data: await this.chatService.askGPT(queryParams)
        };
    }

    @ApiTags('Chat')
    @ApiErrorDecorator({ statusCode: 401, errors: [NotAuthenticated] })
    @ApiErrorDecorator({ statusCode: 404, errors: [EntityNotFound] })
    @ApiErrorDecorator({ statusCode: 403, errors: [NotAuthorized] })
    @ApiErrorDecorator({ statusCode: 500, errors: [InternalError] })
    @Get(':project_id/history')
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
