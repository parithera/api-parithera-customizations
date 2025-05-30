import { Injectable } from "@nestjs/common";
import { ChatCompletionMessageParam } from "openai/resources/index";
import OpenAI from "openai";
import { ConfigService } from "@nestjs/config";
import { Chat } from "../chat.entity";

/**
 * Base tool service for interacting with the LLM.
 */
@Injectable()
export class BaseToolService {
    /**
     * The API key for OpenAI.
     */
    private readonly apiKey: string;

    /**
     * The base URL for OpenAI.
     */
    private readonly baseUrl: string;

    /**
     * The model to use for completions.
     */
    private readonly model: string;

    /**
     * Constructor for the BaseToolService.
     *
     * @param configService - The configuration service instance.
     */
    constructor(
        private readonly configService: ConfigService,
    ) {
        this.apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');
        this.baseUrl = this.configService.getOrThrow<string>('OPENAI_BASEURL');
        this.model = this.configService.getOrThrow<string>('OPENAI_MODEL');
    }

    /**
     * Asks the LLM for a response.
     *
     * @param messages - The input messages to send to the LLM.
     *
     * @returns The response from the LLM as a string.
     */
    async askLLM(messages: ChatCompletionMessageParam[]): Promise<string> {
        const openai = new OpenAI({
            baseURL: this.baseUrl,
            apiKey: this.apiKey
        });

        const chatCompletion = await openai.chat.completions.create({
            model: this.model,
            messages: messages,
            temperature: 0.7
        });

        const parsedMessage = chatCompletion.choices[0].message;

        if (!parsedMessage.content) {
            throw new Error('Call to LLM failed');
        }

        return parsedMessage.content;
    }

    /**
     * Forges a request to the LLM.
     *
     * @param prompt - The system prompt for the conversation.
     * @param request - The user's request.
     * @param chat - The conversation context.
     * @param loadHistory - Whether to include the conversation history in the request.
     *
     * @returns The formatted input messages to send to the LLM.
     */
    forgeLLMRequest(prompt: string, request: string, chat: Chat, loadHistory: boolean): ChatCompletionMessageParam[] {
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: prompt }
        ];

        if (loadHistory) {
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

        return messages;
    }
}