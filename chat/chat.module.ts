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
import { ChatGateway } from './chat.gateway';
import { ToolsModule } from './tools/tools.module';

@Module({
	imports: [
		ToolsModule,
		TypeOrmModule.forFeature([Chat, Project, OrganizationMemberships, Result, Sample], 'codeclarity')
	],
	exports:[ChatService],
	providers: [
		ChatService,
		OrganizationsMemberService,
		ChatGateway,
	],
	controllers: [ChatController]
})
export class ChatModule { }
