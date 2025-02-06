import { Module } from '@nestjs/common';
import { SampleController } from './samples.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sample } from './samples.entity';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { OrganizationMemberships } from 'src/entity/codeclarity/OrganizationMemberships';
import { User } from 'src/entity/codeclarity/User';
import { Organization } from 'src/entity/codeclarity/Organization';
import { OrganizationLoggerService } from 'src/codeclarity_modules/organizations/organizationLogger.service';
import { Log } from 'src/entity/codeclarity/Log';
import { SampleService } from './samples.service';
import { File } from 'src/entity/codeclarity/File';
import { ConfigService } from '@nestjs/config';
import { Analysis } from 'src/entity/codeclarity/Analysis';
import { Analyzer } from 'src/entity/codeclarity/Analyzer';
import { Project } from 'src/entity/codeclarity/Project';

@Module({
    imports: [TypeOrmModule.forFeature([Sample, OrganizationMemberships, User, Organization, Analysis, Analyzer, Project, Log, File], 'codeclarity')],
    providers: [OrganizationsMemberService, OrganizationLoggerService, ConfigService, SampleService],
    controllers: [SampleController]
})
export class SampleModule {}
