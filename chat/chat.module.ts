import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Chat } from './chat.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Project } from 'src/entity/codeclarity/Project';

@Module({
    imports: [TypeOrmModule.forFeature([Chat, Project], 'codeclarity')],
    providers: [ChatService],
    controllers: [ChatController]
})
export class ChatModule {}
