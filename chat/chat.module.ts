import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Chat } from './chat.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ToolsModule } from './tools/tools.module';
import { SampleModule } from '../samples/samples.module';
import { OrganizationsModule } from 'src/base_modules/organizations/organizations.module';
import { ProjectsModule } from 'src/base_modules/projects/projects.module';
import { ResultsModule } from 'src/codeclarity_modules/results/results.module';
import { ChatRepository } from './chat.repository';

@Module({
	imports: [
		ToolsModule,
		SampleModule,
		OrganizationsModule,
		ProjectsModule,
		ResultsModule,
		TypeOrmModule.forFeature([Chat], 'codeclarity')
	],
	exports:[ChatService, ChatRepository],
	providers: [
		ChatService,
		ChatGateway,
		ChatRepository
	],
	controllers: [ChatController]
})
export class ChatModule { }
