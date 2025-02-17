import { ApiProperty } from '@nestjs/swagger';

export class AskGPT {
    @ApiProperty()
    request: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    projectId: string;

    @ApiProperty()
    organizationId: string;
}

export interface Request {
    request: string,
    projectId: string,
    userId: string,
    organizationId: string,
}

export enum ResponseType {
    INFO = 'info',
    ERROR = 'error',
    SUCCESS = 'success'}

export interface ResponseData {
    code: string;
    followup: Array<string>;
    text: string;
    json: object;
    image: string;
    agent: string;
    status: string;
    error: string;
}

export interface Response {
    data: ResponseData;
    type: ResponseType;
}

export type Group = {
    name: string;
    files: Array<string>
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