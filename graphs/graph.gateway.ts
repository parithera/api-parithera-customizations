import { UseFilters, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import {
    BaseWsExceptionFilter,
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
    WsResponse
} from '@nestjs/websockets';
import { existsSync, readFile } from 'fs';
import { join } from 'path';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Server, Socket } from 'socket.io';
import { CombinedAuthGuard } from 'src/codeclarity_modules/auth/guards/combined.guard';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { AuthUser } from 'src/decorators/UserDecorator';
import { MemberRole } from 'src/entity/codeclarity/OrganizationMemberships';
import { Project } from 'src/entity/codeclarity/Project';
import { Result } from 'src/entity/codeclarity/Result';
import { AuthenticatedUser } from 'src/types/auth/types';
import { Repository } from 'typeorm';

interface Request {
    projectId: string;
    orgId: string;
    type: string;
}

interface Response {
    data: string;
    type: string;
}

@WebSocketGateway({
    cors: {
        origin: '*'
    },
    inheritAppConfig: true
})
@UseGuards(CombinedAuthGuard)
export class GraphsGateway {
    constructor(
        private readonly organizationMemberService: OrganizationsMemberService,
        @InjectRepository(Result, 'codeclarity')
        private resultRepository: Repository<Result>,
        @InjectRepository(Project, 'codeclarity')
        private projectRepository: Repository<Project>
    ) {}
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('graphs')
    async graph(
        @MessageBody() data: Request,
        @AuthUser() user: AuthenticatedUser
    ): Promise<Response> {
        await this.organizationMemberService.hasRequiredRole(
            data.orgId,
            user.userId,
            MemberRole.USER
        );

        const project = await this.projectRepository.findOne({
            where: {
                id: data.projectId,
                organizations: {
                    id: data.orgId
                }
            },
            relations: {
                added_by: true
            }
        });
        if (!project) {
            throw new Error('Project not found');
        }

        const filePath = join(
            '/private',
            project.added_by.id,
            data.projectId,
            'scanpy',
            `${data.type}.png`
        );
        const response: Response = {
            data: '',
            type: data.type
        };

        while (!existsSync(filePath)) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        return new Promise((resolve, reject) => {
            return readFile(filePath, 'base64', (err, data) => {
                if (err) {
                    reject(err);
                }
                response.data = data;
                resolve(response);
            });
        });
    }
}
