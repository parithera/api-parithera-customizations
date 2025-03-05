import { Module } from '@nestjs/common';
import { GraphController } from './graphs.controller';
import { GraphsGateway } from './graph.gateway';
import { OrganizationsModule } from 'src/base_modules/organizations/organizations.module';
import { ProjectsModule } from 'src/base_modules/projects/projects.module';
import { ResultsModule } from 'src/codeclarity_modules/results/results.module';

@Module({
    imports: [
        OrganizationsModule,
        ProjectsModule,
        ResultsModule
    ],
    providers: [GraphsGateway],
    controllers: [GraphController]
})
export class GraphModule {}
