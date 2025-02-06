import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Chat } from './chat.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Project } from 'src/entity/codeclarity/Project';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { OrganizationMemberships } from 'src/entity/codeclarity/OrganizationMemberships';
import { Result } from 'src/entity/codeclarity/Result';
import { Sample } from '../samples/samples.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Chat, Project, OrganizationMemberships, Result, Sample], 'codeclarity')
    ],
    providers: [ChatService, OrganizationsMemberService],
    controllers: [ChatController]
})
export class ChatModule {}
