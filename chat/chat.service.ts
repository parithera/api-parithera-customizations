import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatPrompts } from './chat.prompts';
import { AskGPT } from 'src/enterprise_modules/chat/types';
import { Project } from 'src/entity/codeclarity/Project';
import * as fs from 'fs';
import { join } from 'path';
import * as amqp from 'amqplib';
import { EntityNotFound, RabbitMQError } from 'src/types/errors/types';
import { DispatcherPluginMessage } from 'src/types/rabbitMqMessages';
import { Chat, Message } from './chat.entity';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { AuthenticatedUser } from 'src/types/auth/types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationsMemberService } from 'src/codeclarity_modules/organizations/organizationMember.service';
import { MemberRole } from 'src/entity/codeclarity/OrganizationMemberships';

export type ChartData = {
    answer: string;
    type: string;
};

export type LLMResponse = {
    choices: {
        finish_reason: string;
        index: number;
        logprobs: {
            tokens: string[];
            token_logprobs: number[];
            top_logprobs: string[];
        };
        message: {
            content: string;
            role: string;
        };
        reference: string;
    }[];
    created: number;
    id: string;
    model: string;
    object: string;
    usage: {
        completion_tokens: number;
        prompt_tokens: number;
        total_tokens: number;
    };
};

@Injectable()
export class ChatService {
    api_key: string;
    base_url: string;
    model: string;

    constructor(
        private readonly organizationMemberService: OrganizationsMemberService,
        private readonly configService: ConfigService,
        @InjectRepository(Project, 'codeclarity')
        private projectRepository: Repository<Project>,
        @InjectRepository(Chat, 'codeclarity')
        private chatRepository: Repository<Chat>
    ) {
        this.api_key = this.configService.getOrThrow<string>('OPENAI_API_KEY');
        this.base_url = this.configService.getOrThrow<string>('OPENAI_BASEURL');
        this.model = this.configService.getOrThrow<string>('OPENAI_MODEL');
    }

    async askGPT(queryParams: AskGPT): Promise<ChartData> {
        await this.organizationMemberService.hasRequiredRole(
            queryParams.organizationId,
            queryParams.userId,
            MemberRole.USER
        );
        if (!queryParams.projectId) {
            return {
                answer: 'Please select a chat in the list on the left',
                type: 'text'
            };
        }

        // retrieve files from project
        const project = await this.projectRepository.findOne({
            where: {
                id: queryParams.projectId,
                organizations: {
                    id: queryParams.organizationId
                }
            },
            relations: {
                files: true,
                added_by: true
            }
        });
        if (!project) {
            throw new Error('Project not found');
        }
        if (project.files.length === 0) {
            return {
                answer: 'Please import a file in the project',
                type: 'text'
            };
        }

        const data_file = project.files.find((file) => file.type === 'DATA');
        if (!data_file) {
            return {
                answer: 'Please provide a file in the project',
                type: 'text'
            };
        }

        let chat = await this.chatRepository.findOne({
            where: {
                project: {
                    id: queryParams.projectId
                }
            }
        });

        if (!chat) {
            const createChat: Chat = new Chat();
            createChat.messages = [
                {
                    request: '',
                    response: 'Hi, how can I help you today?',
                    image: ''
                }
            ];
            createChat.project = project;
            chat = await this.chatRepository.save(createChat);
        }

        const prompts = new ChatPrompts();

        const openai = new OpenAI({
            baseURL: this.base_url,
            apiKey: this.api_key
        });

        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: prompts.getLLAMA() }
        ];

        chat.messages;
        for (const message of chat.messages.reverse()) {
            messages.push({
                role: 'user',
                content: message.request
            });
            messages.push({
                role: 'assistant',
                content: message.response
            });
        }
        messages.push({ role: 'user', content: queryParams.request });

        const chatCompletion = await openai.chat.completions.create({
            // model: 'gpt-4o-mini',
            model: this.model,
            messages: messages,
            temperature: 0.7
        });

        const parsedMessage = chatCompletion.choices[0].message;

        if (!parsedMessage.content) {
            return {
                answer: 'Something went wrong',
                type: 'text'
            };
        }

        const newMessage: Message = new Message();
        newMessage.request = queryParams.request;
        newMessage.response = parsedMessage.content;
        newMessage.image = '';

        chat.messages.splice(0, 0, newMessage);
        await this.chatRepository.save(chat);

        // If the message includes a Script, save it to a file
        if (parsedMessage.content.includes('```R')) {
            let script = parsedMessage.content;
            script = script.split('```R')[1].split('```')[0];

            // Save the script to a file
            const folderPath = join('/private', project.added_by.id, queryParams.projectId);
            const scriptPath = join(folderPath, 'script.R');
            fs.writeFileSync(scriptPath, script);

            // Send message to aqmp to start the anaylsis
            const queue = 'dispatcher_r';
            const amqpHost = `${this.configService.getOrThrow<string>(
                'AMQP_PROTOCOL'
            )}://${this.configService.getOrThrow<string>('AMQP_USER')}:${
                process.env.AMQP_PASSWORD
            }@${this.configService.getOrThrow<string>(
                'AMQP_HOST'
            )}:${this.configService.getOrThrow<string>('AMQP_PORT')}`;

            try {
                const conn = await amqp.connect(amqpHost);
                const ch1 = await conn.createChannel();
                await ch1.assertQueue(queue);

                const message: DispatcherPluginMessage = {
                    Data: {
                        type: 'chat'
                    },
                    AnalysisId: '',
                    ProjectId: queryParams.projectId
                };
                ch1.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
                await ch1.close();
            } catch (err) {
                throw new RabbitMQError(err);
            }

            return {
                answer: parsedMessage.content + '\n Please wait while the script is running',
                type: 'chat'
            };
        }

        return {
            answer: parsedMessage.content,
            type: 'text'
        };
    }

    async getHistory(
        project_id: string,
        organization_id: string,
        user: AuthenticatedUser
    ): Promise<Chat> {
        await this.organizationMemberService.hasRequiredRole(
            organization_id,
            user.userId,
            MemberRole.USER
        );

        const project = await this.projectRepository.findOne({
            where: {
                id: project_id,
                organizations: {
                    id: organization_id
                }
            },
            relations: {
                added_by: true
            }
        });
        if (!project) {
            throw new Error('Project not found');
        }

        const chat = await this.chatRepository.findOne({
            where: {
                project: {
                    id: project_id
                }
            }
        });
        if (!chat) {
            throw EntityNotFound;
        }

        for (let i = 0; i < chat.messages.length; i++) {
            const message = chat.messages[i];
            if (message.image == '') continue;
            const res: string = await new Promise((resolve, reject) => {
                const filePath = join(
                    '/private',
                    project.added_by.id,
                    project_id,
                    message.image + '.png'
                );
                return fs.readFile(filePath, 'base64', (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(data);
                });
            });
            chat.messages[i].image = res;
        }
        return chat;
    }
}
