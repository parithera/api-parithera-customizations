import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatPrompts } from './chat.prompts';
import { AskGPT } from 'src/enterprise_modules/chat/types';
import { CodeclarityDB } from 'src/data-source';
import { Project } from 'src/entity/codeclarity/Project';
import * as fs from 'fs';
import { join } from 'path';
import * as amqp from 'amqplib';
import { RabbitMQError } from 'src/types/errors/types';
import { DispatcherPluginMessage } from 'src/types/rabbitMqMessages';

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

    constructor(private readonly configService: ConfigService) {
        this.api_key = this.configService.getOrThrow<string>('OPENAI_API_KEY');
        this.base_url = this.configService.getOrThrow<string>('OPENAI_BASEURL');
        this.model = this.configService.getOrThrow<string>('OPENAI_MODEL');
    }

    async askGPT(queryParams: AskGPT): Promise<ChartData> {
        if (!queryParams.projectId) {
            return {
                answer: 'Please select a chat in the list on the left',
                type: 'text'
            };
        }

        // retrieve files from project
        const project = await CodeclarityDB.getRepository(Project).findOne({
            where: {
                id: queryParams.projectId
            },
            relations: {
                files: true
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

        const prompts = new ChatPrompts();

        const openai = new OpenAI({
            baseURL: this.base_url,
            apiKey: this.api_key
        });

        const chatCompletion = await openai.chat.completions.create({
            // model: 'gpt-4o-mini',
            model: this.model,
            messages: [
                { role: 'system', content: prompts.getLLAMA() },
                // { role: 'user', content: '[INST]' + queryParams.request + '[/INST]' }
                { role: 'user', content: queryParams.request }
            ],
            temperature: 0.7
        });

        const parsedMessage = chatCompletion.choices[0].message;

        if (!parsedMessage.content) {
            return {
                answer: 'Something went wrong',
                type: 'text'
            };
        }

        // If the message includes a Script, save it to a file
        if (parsedMessage.content.includes('```R')) {
            let script = parsedMessage.content;
            script = script.split('```R')[1].split('```')[0];

            // Save the script to a file
            const folderPath = join('/private', queryParams.userId, queryParams.projectId);
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
}
