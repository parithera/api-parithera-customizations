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
import { Result } from 'src/entity/codeclarity/Result';

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
        private chatRepository: Repository<Chat>,
        @InjectRepository(Result, 'codeclarity')
        private resultRepository: Repository<Result>
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
                    image: '',
                    timestamp: new Date()
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
        newMessage.timestamp = new Date();

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
            const result = await this.resultRepository.findOne({
                where: {
                    analysis: {
                        id: message.image
                    }
                }
            });
            if (!result) continue;
            if (result.result.analysis_info.errors.length != 0) {
                chat.messages[i].image =
                    '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';
                continue;
            }
            const res: string = await new Promise((resolve, reject) => {
                const filePath = join(
                    '/private',
                    project.added_by.id,
                    project_id,
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
}
