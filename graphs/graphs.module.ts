import { Module } from '@nestjs/common';
import { GraphController } from './graphs.controller';
import { Result } from 'src/entity/codeclarity/Result';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { OrganizationMemberships } from 'src/entity/codeclarity/OrganizationMemberships';
import { Project } from 'src/entity/codeclarity/Project';
import { GraphsGateway } from './graph.gateway';

@Module({
    imports: [TypeOrmModule.forFeature([Result, Project, OrganizationMemberships], 'codeclarity')],
    providers: [OrganizationsMemberService, GraphsGateway],
    controllers: [GraphController]
})
export class GraphModule {}
