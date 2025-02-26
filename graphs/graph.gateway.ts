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
import { Request, Response, ResponseType } from './types';

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

    @SubscribeMessage('data')
    async data(
        @MessageBody() data: Request,
        @AuthUser() user: AuthenticatedUser,
        @ConnectedSocket() client: Socket,
    ): Promise<Response> {
        await this.organizationMemberService.hasRequiredRole(
            data.orgId,
            user.userId,
            MemberRole.USER
        );

        let filePath = join('/private', data.orgId, 'samples', data.sampleId, 'scanpy', 'pca_variance_ratio_data.json');

        if (!existsSync(filePath)) {
            throw new WsException(`File not found: ${filePath}`);
        }

        let fileContent = await new Promise<string>((resolve, reject) => {
            readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        let jsonData = JSON.parse(fileContent);

        client.emit('qc:status', {
            data: {
                content: jsonData,
                error: '',
                status: 'pca_variance_ratio'
            },
            type: ResponseType.INFO
        })

        filePath = join('/private', data.orgId, 'samples', data.sampleId, 'scanpy', 'violin_and_scatter_plot_data.json');

        if (!existsSync(filePath)) {
            throw new WsException(`File not found: ${filePath}`);
        }

        fileContent = await new Promise<string>((resolve, reject) => {
            readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        jsonData = JSON.parse(fileContent);

        client.emit('qc:status', {
            data: {
                content: jsonData,
                error: '',
                status: 'violin_and_scatter_plot_data'
            },
            type: ResponseType.INFO
        })

        filePath = join('/private', data.orgId, 'samples', data.sampleId, 'scanpy', 'highly_variable_genes_data.json');

        if (!existsSync(filePath)) {
            throw new WsException(`File not found: ${filePath}`);
        }

        fileContent = await new Promise<string>((resolve, reject) => {
            readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        jsonData = JSON.parse(fileContent);

        client.emit('qc:status', {
            data: {
                content: jsonData,
                error: '',
                status: 'highly_variable_genes_data'
            },
            type: ResponseType.INFO
        })

        filePath = join('/private', data.orgId, 'samples', data.sampleId, 'scanpy', 'umap_data.json');

        if (!existsSync(filePath)) {
            throw new WsException(`File not found: ${filePath}`);
        }

        fileContent = await new Promise<string>((resolve, reject) => {
            readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        jsonData = JSON.parse(fileContent);

        client.emit('qc:status', {
            data: {
                content: jsonData,
                error: '',
                status: 'umap_data'
            },
            type: ResponseType.INFO
        })

        return {
            data: {
                content: {},
                error: '',
                status: ''
            },
            type: ResponseType.SUCCESS
        }
    }
}
