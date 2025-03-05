import { Injectable } from "@nestjs/common";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import OpenAI from "openai";
import { ConfigService } from "@nestjs/config";
import { Chat } from "../chat.entity";

@Injectable()
export class BaseToolService {
    api_key: string;
    base_url: string;
    model: string;

    constructor(
        private readonly configService: ConfigService,
    ) {
        this.api_key = this.configService.getOrThrow<string>('OPENAI_API_KEY');
        this.base_url = this.configService.getOrThrow<string>('OPENAI_BASEURL');
        this.model = this.configService.getOrThrow<string>('OPENAI_MODEL');
    }

    async askLLM(messages: ChatCompletionMessageParam[]): Promise<string> {
        const openai = new OpenAI({
            baseURL: this.base_url,
            apiKey: this.api_key
        });

        const chatCompletion = await openai.chat.completions.create({
            model: this.model,
            messages: messages,
            temperature: 0.7
        });

        const parsedMessage = chatCompletion.choices[0].message;

        if (!parsedMessage.content) {
            throw new Error('Call to LLM failed')
        }

        return parsedMessage.content
    }

    forgeLLMRequest(prompt: string, request: string, chat: Chat, load_history: boolean): ChatCompletionMessageParam[] {
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: prompt }
        ];

        if (load_history) {
            for (const message of chat.messages.slice(0, 3).reverse()) {
                messages.push({
                    role: 'user',
                    content: message.request
                });
                messages.push({
                    role: 'assistant',
                    content: message.text
                });
            }
        }
        messages.push({ role: 'user', content: request });

        return messages
    }
}