import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Project } from 'src/entity/codeclarity/Project';
import { AuthenticatedUser } from 'src/types/auth/types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { MemberRole } from 'src/entity/codeclarity/OrganizationMemberships';
import { Sample } from './samples.entity';

@Injectable()
export class SampleService {

    constructor(
        private readonly organizationMemberService: OrganizationsMemberService,
        @InjectRepository(Sample, 'codeclarity')
        private sampleRepository: Repository<Sample>,
    ) {
    }


    async getHistory(
        project_id: string,
        organization_id: string,
        user: AuthenticatedUser
    ): Promise<Project> {
        await this.organizationMemberService.hasRequiredRole(
            organization_id,
            user.userId,
            MemberRole.USER
        );

        return new Project();
    }
}
