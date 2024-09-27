import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import OpenAI from 'openai';
import { ChatPrompts } from './chat.prompts';
import { AskGPT } from 'src/enterprise_modules/chat/types';
import { CodeclarityDB } from 'src/data-source';
import { Project } from 'src/entity/codeclarity/Project';
import * as fs from 'fs';
import { join } from 'path';
import { exec } from 'child_process';

export type ChartData = {
    answer: string;
    type: string;
};

@Injectable()
export class ChatService {
    // api_key: string;

    // constructor(private readonly configService: ConfigService) {
    //     this.api_key = this.configService.getOrThrow<string>('OPENAI_API_KEY');
    // }

    async askGPT(queryParams: AskGPT): Promise<ChartData> {
        // const prompt = queryParams.request;
        const prompt = `Building a website can be done in 10 simple steps:`;

        let response = await fetch("http://llm-server:8000/completion", {
            method: 'POST',
            body: JSON.stringify({
                prompt,
                n_predict: 512,
            })
        })
        const res = await response.json()
        return {
                    answer: res.content,
                    type: 'text'
                };
        // if (!queryParams.projectId) {
        //     return {
        //         answer: 'Please select a chat in the list on the left',
        //         type: 'text'
        //     };
        // }

        // // retrieve files from project
        // const project = await CodeclarityDB.getRepository(Project).findOne({
        //     where: {
        //         id: queryParams.projectId
        //     },
        //     relations: {
        //         files: true
        //     }
        // });
        // if (!project) {
        //     throw new Error('Project not found');
        // }
        // if (project.files.length === 0) {
        //     return {
        //         answer: 'Please import a file in the project',
        //         type: 'text'
        //     };
        // }

        // const data_file = project.files.find((file) => file.type === 'DATA');
        // if (!data_file) {
        //     return {
        //         answer: 'Please provide a file in the project',
        //         type: 'text'
        //     };
        // }

        // const prompts = new ChatPrompts();

        // const openai = new OpenAI({
        //     apiKey: this.api_key // This is the default and can be omitted
        // });

        // const chatCompletion = await openai.chat.completions.create({
        //     model: 'gpt-4o-mini',
        //     messages: [
        //         { role: 'system', content: prompts.getCancerPrompt() },
        //         { role: 'user', content: queryParams.request }
        //     ],
        //     temperature: 0
        // });

        // const parsedMessage = chatCompletion.choices[0].message;

        // if (!parsedMessage.content) {
        //     return {
        //         answer: 'Something went wrong',
        //         type: 'text'
        //     };
        // }

        // // If the message includes a Script, save it to a file
        // if (parsedMessage.content.includes('```R')) {
        //     let script = parsedMessage.content;
        //     script = script.split('```R')[1].split('```')[0];

        //     // Save the script to a file
        //     const folderPath = 'files/' + queryParams.userId + '/' + queryParams.projectId;
        //     const scriptPath = join(process.cwd(), folderPath, 'script.R');
        //     fs.writeFileSync(scriptPath, script);

        //     await exec(
        //         `Rscript ${scriptPath} ${folderPath}`,
        //         (error: Error | null, stdout: string, stderr: string) => {
        //             if (error) {
        //                 throw new Error(`Failed to run Rscript: ${error.message}`);
        //             }
        //             console.log(stdout);
        //             console.error(stderr);
        //             return {
        //                 answer:
        //                     parsedMessage.content + '\n Please wait while the script is running',
        //                 type: 'text'
        //             };
        //         }
        //     );
        // }

        // return {
        //     answer: parsedMessage.content,
        //     type: 'text'
        // };
    }
}