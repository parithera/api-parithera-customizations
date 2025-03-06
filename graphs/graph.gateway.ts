import { UseGuards } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from '@nestjs/websockets';
import { existsSync, readFile } from 'fs';
import { join } from 'path';
import { Server, Socket } from 'socket.io';
import { AuthUser } from 'src/decorators/UserDecorator';
import { AuthenticatedUser } from 'src/base_modules/auth/auth.types';
import { Request, Response, ResponseType } from './types';
import { OrganizationsRepository } from 'src/base_modules/organizations/organizations.repository';
import { CombinedAuthGuard } from 'src/base_modules/auth/guards/combined.guard';
import { MemberRole } from 'src/base_modules/organizations/memberships/organization.memberships.entity';

/**
 * GraphsGateway is a WebSocket gateway that provides real-time updates to the client.
 *
 * It uses the `CombinedAuthGuard` to authenticate and authorize users.
 */
@WebSocketGateway({
    cors: {
    origin: '*',
    },
  inheritAppConfig: true,
})
@UseGuards(CombinedAuthGuard)
export class GraphsGateway {
  /**
   * Constructor for the GraphsGateway class.
   *
   * @param organizationsRepository - The OrganizationsRepository instance used to retrieve data.
   */
    constructor(
        private readonly organizationsRepository: OrganizationsRepository,
    ) {}

  /**
   * The WebSocket server instance.
   */
    @WebSocketServer()
    server: Server;

  /**
   * Handles the 'data' message from the client and returns a response with QC status updates.
   *
   * @param data - The request object containing the organization ID, sample ID, and other parameters.
   * @param user - The authenticated user instance.
   * @param client - The connected socket instance.
   * @returns A promise that resolves to a Response object containing the QC status updates.
   */
    @SubscribeMessage('data')
    async data(
        @MessageBody() data: Request,
        @AuthUser() user: AuthenticatedUser,
        @ConnectedSocket() client: Socket,
    ): Promise<Response> {
    // Check if the user has the required role in the organization
        await this.organizationsRepository.hasRequiredRole(
            data.orgId,
            user.userId,
      MemberRole.USER,
        );

    // Get the file path for PCA variance ratio data
        let filePath = join('/private', data.orgId, 'samples', data.sampleId, 'scanpy', 'pca_variance_ratio_data.json');

    // Check if the file exists and throw an error if it doesn't
        if (!existsSync(filePath)) {
            throw new WsException(`File not found: ${filePath}`);
        }

    // Read the file content as a string
        let fileContent = await new Promise<string>((resolve, reject) => {
            readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

    // Parse the JSON content and emit a QC status update
        let jsonData = JSON.parse(fileContent);
        client.emit('qc:status', {
            data: {
                content: jsonData,
                error: '',
        status: 'pca_variance_ratio',
            },
      type: ResponseType.INFO,
    });

    // Get the file path for violin and scatter plot data
        filePath = join('/private', data.orgId, 'samples', data.sampleId, 'scanpy', 'violin_and_scatter_plot_data.json');

    // Check if the file exists and throw an error if it doesn't
        if (!existsSync(filePath)) {
            throw new WsException(`File not found: ${filePath}`);
        }

    // Read the file content as a string
        fileContent = await new Promise<string>((resolve, reject) => {
            readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

    // Parse the JSON content and emit a QC status update
        jsonData = JSON.parse(fileContent);
        client.emit('qc:status', {
            data: {
                content: jsonData,
                error: '',
        status: 'violin_and_scatter_plot_data',
            },
      type: ResponseType.INFO,
    });

    // Get the file path for highly variable genes data
        filePath = join('/private', data.orgId, 'samples', data.sampleId, 'scanpy', 'highly_variable_genes_data.json');

    // Check if the file exists and throw an error if it doesn't
        if (!existsSync(filePath)) {
            throw new WsException(`File not found: ${filePath}`);
        }

    // Read the file content as a string
        fileContent = await new Promise<string>((resolve, reject) => {
            readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

    // Parse the JSON content and emit a QC status update
        jsonData = JSON.parse(fileContent);
        client.emit('qc:status', {
            data: {
                content: jsonData,
                error: '',
        status: 'highly_variable_genes_data',
            },
      type: ResponseType.INFO,
    });

    // Get the file path for UMAP data
        filePath = join('/private', data.orgId, 'samples', data.sampleId, 'scanpy', 'umap_data.json');

    // Check if the file exists and throw an error if it doesn't
        if (!existsSync(filePath)) {
            throw new WsException(`File not found: ${filePath}`);
        }

    // Read the file content as a string
        fileContent = await new Promise<string>((resolve, reject) => {
            readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

    // Parse the JSON content and emit a QC status update
        jsonData = JSON.parse(fileContent);
        client.emit('qc:status', {
            data: {
                content: jsonData,
                error: '',
        status: 'umap_data',
            },
      type: ResponseType.INFO,
    });

    // Return a success response with an empty content object
        return {
            data: {
                content: {},
                error: '',
        status: '',
            },
      type: ResponseType.SUCCESS,
    };
}
}
