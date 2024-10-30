import { Module } from '@nestjs/common';
import { GraphController } from './graphs.controller';
import { Result } from 'src/entity/codeclarity/Result';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { OrganizationMemberships } from 'src/entity/codeclarity/OrganizationMemberships';
import { Project } from 'src/entity/codeclarity/Project';

@Module({
    imports: [TypeOrmModule.forFeature([Result, Project, OrganizationMemberships], 'codeclarity')],
    providers: [OrganizationsMemberService],
    controllers: [GraphController]
})
export class GraphModule {}
