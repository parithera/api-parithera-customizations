import { forwardRef, Module } from '@nestjs/common';
import { SampleController } from './samples.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sample } from './samples.entity';
import { AnalyzersModule } from 'src/base_modules/analyzers/analyzers.module';
import { AnalysesModule } from 'src/base_modules/analyses/analyses.module';
import { ResultsModule } from 'src/codeclarity_modules/results/results.module';
import { OrganizationsModule } from 'src/base_modules/organizations/organizations.module';
import { LinkSamplesGateway } from './samples.gateway';
import { SampleService } from './samples.service';
import { ConfigService } from '@nestjs/config';
import { ChatModule } from '../chat/chat.module';
import { UsersModule } from 'src/base_modules/users/users.module';
import { FileModule } from 'src/base_modules/file/file.module';
import { ProjectsModule } from 'src/base_modules/projects/projects.module';

@Module({
    imports: [
        AnalyzersModule,
        AnalysesModule,
        ResultsModule,
        OrganizationsModule,
        UsersModule,
        FileModule,
        ProjectsModule,
        forwardRef(() => ChatModule),
        TypeOrmModule.forFeature([
            Sample
        ], 'codeclarity')
    ],
    providers: [ConfigService, SampleService, LinkSamplesGateway],
    exports: [SampleService],
    controllers: [SampleController]
})
export class SampleModule {}
