import { Injectable } from '@nestjs/common';
import { Chat } from './chat.entity';
import { AuthenticatedUser } from 'src/base_modules/auth/auth.types';
import { join } from 'path';
import * as fs from 'fs';
import { OrganizationsRepository } from 'src/base_modules/organizations/organizations.repository';
import { MemberRole } from 'src/base_modules/organizations/memberships/organization.memberships.entity';
import { ChatRepository } from './chat.repository';
import { ProjectsRepository } from 'src/base_modules/projects/projects.repository';
import { AnalysisResultsRepository } from 'src/codeclarity_modules/results/results.repository';


export type ChartData = {
    answer: string;
    type: string;
};

@Injectable()
export class ChatService {

    constructor(
        private readonly organizationsRepository: OrganizationsRepository,
        private readonly chatRepository: ChatRepository,
        private readonly projectsRepository: ProjectsRepository,
        private readonly resultsRepository: AnalysisResultsRepository
    ) {}

    async getHistory(
        project_id: string,
        organization_id: string,
        user: AuthenticatedUser
    ): Promise<Chat> {
        await this.organizationsRepository.hasRequiredRole(
            organization_id,
            user.userId,
            MemberRole.USER
        );

        const chat = await this.chatRepository.getByProjectId(project_id)

        for (let i = 0; i < chat.messages.length; i++) {
            const message = chat.messages[i];
            if (message.image == '') continue;
            const resultExists = await this.resultsRepository.resultOfAnalysisReady(message.image)

            if (!resultExists) continue;

            const result = await this.resultsRepository.getByAnalysisId(message.image)
            if (result.result.analysis_info.errors.length != 0) {
                chat.messages[i].image =
                    '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';
                continue;
            }


            const jsonContent: object = await new Promise((resolve, reject) => {
                const filePath = join(
                    '/private',
                    organization_id,
                    'projects',
                    project_id,
                    'data',
                    message.image + '.json'
                );
                return fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        reject(err);
                        // resolve('');
                    }
                    const jsonObject = JSON.parse(data);
                    resolve(jsonObject);
                });
            });
            chat.messages[i].json = jsonContent

            const res: string = await new Promise((resolve, reject) => {
                const filePath = join(
                    '/private',
                    organization_id,
                    'projects',
                    project_id,
                    'data',
                    message.image + '.png'
                );
                return fs.readFile(filePath, 'base64', (err, data) => {
                    if (err) {
                        // reject(err);
                        resolve('');
                    }
                    resolve(data);
                });
            });
            chat.messages[i].image = res;
        }
        return chat;
    }

    async createOrRetrieveChat(projectId: string, organizationId: string): Promise<Chat> {
        // retrieve files from project
        const project = await this.projectsRepository.getProjectByIdAndOrganization(projectId, organizationId, {
            files: true,
            added_by: true
        })

        const chat_exists = await this.chatRepository.chatExistsByProjectId(projectId)

        if (!chat_exists) {
            const createChat: Chat = new Chat();
            createChat.messages = [
                {
                    request: '',
                    text: 'Hi, how can I help you today?',
                    code: '',
                    followup: [],
                    json: {},
                    image: '',
                    agent: '',
                    error: '',
                    status: '',
                    timestamp: new Date()
                }
            ];
            createChat.project = project;
            return await this.chatRepository.saveChat(createChat);
        } else {
            return await this.chatRepository.getByProjectId(projectId)
        }
    }
}
