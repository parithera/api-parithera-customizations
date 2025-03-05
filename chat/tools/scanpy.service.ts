import { Injectable } from "@nestjs/common";
import { Group, Request, ResponseData, ResponseType } from "../types";
import { join } from "path";
import { EntityNotFound } from "src/types/errors/types";
import * as fs from 'fs';
import { AuthenticatedUser } from "src/types/auth/types";
import { AnalysisCreateBody } from "src/types/entities/frontend/Analysis";
import { Socket } from "dgram";
import { BaseToolService } from "./base.service";
import { ChatPrompts } from "../chat.prompts";
import { Chat } from "../chat.entity";
import { choseScript } from "./scanpy.scripts";
import { AnalysisResultsRepository } from "src/codeclarity_modules/results/results.repository";
import { ProjectService } from "src/base_modules/projects/projects.service";
import { AnalyzersService } from "src/base_modules/analyzers/analyzers.service";
import { AnalysesService } from "src/base_modules/analyses/analyses.service";
import { SampleService } from "src/enterprise_modules/samples/samples.service";

export interface ScriptResponse {
    response: ResponseData,
    analysisId: string
}

@Injectable()
export class ScanpyToolService {
    constructor(
        private readonly baseToolService: BaseToolService,
        private readonly resultsRepository: AnalysisResultsRepository,
        private readonly projectService: ProjectService,
        private readonly analyzerService: AnalyzersService,
        private readonly analysisService: AnalysesService,
        private readonly sampleService: SampleService
    ) { }

    async start(data: Request, response_data: ResponseData, chat: Chat, user: AuthenticatedUser, client: Socket) {
        // We initiate the prompts var 
        const prompts = new ChatPrompts();

        // Check whether a script needs to be written
        // or whether we can use a pregenerated one
        let scanpy_messages = this.baseToolService.forgeLLMRequest(prompts.getTypeOfScript(), data.request, chat, false)
        let scanpy_answer = await this.baseToolService.askLLM(scanpy_messages)
        let script = ''

        if (scanpy_answer.includes('custom')) {
            scanpy_messages = this.baseToolService.forgeLLMRequest(prompts.getScanpy(), data.request, chat, false)
            scanpy_answer = await this.baseToolService.askLLM(scanpy_messages)
            response_data = await this.writeCustomScript(scanpy_answer, response_data, data, client)
        } else {
            const scanpy_data = choseScript(
                scanpy_answer,
                response_data,
                data.organizationId,
                data.projectId
            )
            response_data = scanpy_data.response_data
            script = scanpy_data.script
           
            client.emit('chat:status', {
                data: response_data,
                type: ResponseType.INFO
            })
        }


        const script_response = await this.getScriptOutput(data.organizationId, data.projectId, script, user, response_data, client)

        return script_response
    }

    async writeCustomScript(answer: string, response_data: ResponseData, data: Request, client: Socket): Promise<ResponseData> {
        // Warn client that the llm answer was received
        response_data.status = 'llm_answer_received'
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        })

        // Get followups
        const splited_answer = answer.split('--FOLLOWUPS--')

        let script = splited_answer[0];
        script = script.split('```python')[1].split('```')[0]

        // Add followups to answer
        if (splited_answer.length > 1 && splited_answer[0] !== '') {
            response_data.followup = splited_answer[1].split('\n').filter(followup => followup.trim() !== '');
        } else {
            response_data.followup = [];
        }

        // Warn client that the code is ready
        response_data.status = 'code_ready'
        response_data.code = script
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        })

        // Save the script to a file
        const folderPath = join('/private', data.organizationId, "projects", data.projectId, "python");

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        // Remove all content of folderPath
        const filesToDelete = fs.readdirSync(folderPath);
        for (const file of filesToDelete) {
            const path = join(folderPath, file);
            if (!fs.lstatSync(path).isDirectory()) {
                fs.unlinkSync(path);
            }
        }

        const scriptPath = join(folderPath, 'script.py');
        fs.writeFileSync(scriptPath, script);

        return response_data
    }

    async getScriptOutput(organizationId: string, projectId: string, script: string, user: AuthenticatedUser, response_data: ResponseData, client: Socket): Promise<ScriptResponse> {
        const analyzer = await this.analyzerService.getByName(organizationId, 'execute_python_script', user)
        const samples = await this.sampleService.getManyByProject(organizationId, projectId, user)

        const groups = []
        for (const sample of samples.data) {
            const group: Group = {
                name: sample.name,
                files: [sample.id]
            }
            groups.push(group)
        }

        const project = await this.projectService.get(organizationId, projectId, user)

        const data: AnalysisCreateBody = {
            analyzer_id: analyzer.id,
            config: {
                python: {
                    project: projectId,
                    user: project.added_by?.id,
                    groups: groups,
                    script: script,
                    type: 'chat'
                }
            },
            branch: ' ', // This will be removed
            commit_hash: ' ' // This will be removed
        }

        const analysisId = await this.analysisService.create(organizationId, projectId, data, user)

        const filePath = join('/private', organizationId, 'projects', projectId, "data", analysisId);
        let checkCount = 0;
        const maxChecks = 90; // 1min 30sec

        let result = await this.resultsRepository.getByAnalysisIdAndPluginType(analysisId, 'python')

        while (!result && checkCount < maxChecks) {
            result = await this.resultsRepository.getByAnalysisIdAndPluginType(analysisId, 'python')
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
            checkCount++;
        }

        if (!result) {
            response_data.error = 'Script failed to execute'
            return { response: response_data, analysisId: analysisId }
        }

        // Warn client that the script has been executed
        response_data.status = 'script_executed'
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        })

        const jsonContent: object = await new Promise((resolve, reject) => {
            return fs.readFile(filePath+ '.json', 'utf8', (err, data) => {
                if (err) {
                    // reject(err);
                    resolve({});
                }
                const jsonObject = JSON.parse(data);
                resolve(jsonObject);
            });
        });
        if (Object.keys(jsonContent).length === 0) {
            response_data.error = 'Script failed to execute'
            return { response: response_data, analysisId: analysisId }
        }
        response_data.json = jsonContent

        const image: string = await new Promise((resolve, reject) => {
            return fs.readFile(filePath+ '.png', 'base64', (err, data) => {
                if (err) {
                    reject(EntityNotFound);
                }
                resolve(data);
            });
        });

        response_data.image = image
        return { response: response_data, analysisId: analysisId }
    }
}