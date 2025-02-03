import { Module } from '@nestjs/common';
import { SampleController } from './samples.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sample } from './samples.entity';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { OrganizationMemberships } from 'src/entity/codeclarity/OrganizationMemberships';

@Module({
    imports: [TypeOrmModule.forFeature([Sample, OrganizationMemberships], 'codeclarity')],
    providers: [OrganizationsMemberService],
    controllers: [SampleController]
})
export class SampleModule {}
