import { Injectable } from "@nestjs/common";
import { Group, Request, ResponseData, ResponseType } from "../types";
import { join } from "path";
import { EntityNotFound } from "src/types/error.types";
import * as fs from 'fs';
import { AuthenticatedUser } from "src/base_modules/auth/auth.types";
import { AnalysisCreateBody } from "src/base_modules/analyses/analysis.types";
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

/**
 * Response object containing analysis results
 */
export interface ScriptResponse {
    /**
     * The response data containing the analysis results
     */
    response: ResponseData,
    /**
     * The ID of the analysis that was executed
     */
    analysisId: string
}

/**
 * Service responsible for executing Scanpy scripts on a user's organization
 */
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

    /**
     * Start the Scanpy script execution process for a given request
     * @param data The request object containing the user's input
     * @param response_data The initial response data to be updated with the analysis results
     * @param chat The chat entity containing the conversation context
     * @param user The authenticated user object
     * @param client The socket object representing the client connection
     */
    async start(data: Request, response_data: ResponseData, chat: Chat, user: AuthenticatedUser, client: Socket) {
        // Initialize the prompts object to store the conversation history
        const prompts = new ChatPrompts();

        // Check whether a script needs to be written or if we can use a pregenerated one
        let scanpy_messages = this.baseToolService.forgeLLMRequest(prompts.getTypeOfScript(), data.request, chat, false);
        let scanpy_answer = await this.baseToolService.askLLM(scanpy_messages);
        let script = '';

        // If the LLM response indicates that a custom script is required
        if (scanpy_answer.includes('custom')) {
            scanpy_messages = this.baseToolService.forgeLLMRequest(prompts.getScanpy(), data.request, chat, false);
            scanpy_answer = await this.baseToolService.askLLM(scanpy_messages);
            response_data = await this.writeCustomScript(scanpy_answer, response_data, data, client);
        } else {
            // Get the pregenerated script based on the LLM response
            const scanpy_data = choseScript(
                scanpy_answer,
                response_data,
                data.organizationId,
                data.projectId
            );
            response_data = scanpy_data.response_data;
            script = scanpy_data.script;

            // Emit a status update to the client indicating that the pregenerated script is being used
            client.emit('chat:status', {
                data: response_data,
                type: ResponseType.INFO
            });
        }

        // Execute the script and get the analysis results
        const script_response = await this.getScriptOutput(data.organizationId, data.projectId, script, user, response_data, client);

        return script_response;
    }

    /**
     * Write a custom script based on the LLM response
     * @param answer The LLM response containing the script code
     * @param response_data The initial response data to be updated with the analysis results
     * @param data The request object containing the user's input
     * @param client The socket object representing the client connection
     */
    async writeCustomScript(answer: string, response_data: ResponseData, data: Request, client: Socket): Promise<ResponseData> {
        // Emit a status update to the client indicating that the LLM answer has been received
        response_data.status = 'llm_answer_received';
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        });

        // Get the follow-up questions from the LLM response
        const splited_answer = answer.split('--FOLLOWUPS--');

        let script = splited_answer[0];
        script = script.split('```python')[1].split('```')[0];

        // Add the follow-up questions to the response data
        if (splited_answer.length > 1 && splited_answer[0] !== '') {
            response_data.followup = splited_answer[1].split('\n').filter(followup => followup.trim() !== '');
        } else {
            response_data.followup = [];
        }

        // Emit a status update to the client indicating that the code is ready
        response_data.status = 'code_ready';
        response_data.code = script;
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        });
        // Save the script to a file on disk
        const folderPath = join('/private', data.organizationId, "projects", data.projectId, "python");

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        // Remove all content of the folder path
        const filesToDelete = fs.readdirSync(folderPath);
        for (const file of filesToDelete) {
            const path = join(folderPath, file);
            if (!fs.lstatSync(path).isDirectory()) {
                fs.unlinkSync(path);
            }
        }

        const scriptPath = join(folderPath, 'script.py');
        fs.writeFileSync(scriptPath, script);

        return response_data;
    }

    /**
     * Execute the script and get the analysis results
     * @param organizationId The ID of the user's organization
     * @param projectId The ID of the project containing the samples to be analyzed
     * @param script The script code to be executed
     * @param user The authenticated user object
     * @param response_data The initial response data to be updated with the analysis results
     * @param client The socket object representing the client connection
     */
    async getScriptOutput(organizationId: string, projectId: string, script: string, user: AuthenticatedUser, response_data: ResponseData, client: Socket): Promise<ScriptResponse> {
        // Get the analyzer service instance for executing Python scripts
        const analyzer = await this.analyzerService.getByName(organizationId, 'execute_python_script', user);

        // Get the samples to be analyzed from the project
        const samples = await this.sampleService.getManyByProject(organizationId, projectId, user);

        // Create groups for each sample
        const groups: Group[] = [];
        for (const sample of samples.data) {
            const group: Group = {
                name: sample.name,
                files: [sample.id]
            };
            groups.push(group);
        }

        // Get the project entity from the database
        const project = await this.projectService.get(organizationId, projectId, user);

        // Create an analysis request body containing the script and configuration
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
            branch: '', // This will be removed
            commit_hash: '' // This will be removed
        };

        // Create a new analysis instance in the database
        const analysisId = await this.analysisService.create(organizationId, projectId, data, user);

        // Get the file path where the script output will be stored
        const filePath = join('/private', organizationId, 'projects', projectId, "data", analysisId);

        let checkCount = 0;
        const maxChecks = 90; // 1min 30sec

        // Check for the analysis results in the database
        let result = await this.resultsRepository.getByAnalysisIdAndPluginType(analysisId, 'python');

        while (!result && checkCount < maxChecks) {
            result = await this.resultsRepository.getByAnalysisIdAndPluginType(analysisId, 'python');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
            checkCount++;
        }

        // If the analysis results are not found after a certain timeout, emit an error to the client
        if (!result) {
            response_data.error = 'Script failed to execute';
            return { response: response_data, analysisId: analysisId };
        }

        // Emit a status update to the client indicating that the script has been executed
        response_data.status = 'script_executed';
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        });

        // Get the JSON content of the analysis results file
        const jsonContent: object = await new Promise((resolve, reject) => {
            return fs.readFile(filePath + '.json', 'utf8', (err, data) => {
                if (err) {
                    // reject(err);
                    resolve({});
                }
                const jsonObject = JSON.parse(data);
                resolve(jsonObject);
            });
        });

        // If the analysis results file is empty, emit an error to the client
        if (Object.keys(jsonContent).length === 0) {
            response_data.error = 'Script failed to execute';
            return { response: response_data, analysisId: analysisId };
        }
        response_data.json = jsonContent;

        // Get the image content of the analysis results file
        const image: string = await new Promise((resolve, reject) => {
            return fs.readFile(filePath + '.png', 'base64', (err, data) => {
                if (err) {
                    reject(EntityNotFound);
                }
                resolve(data);
            });
        });

        response_data.image = image;
        return { response: response_data, analysisId: analysisId };
    }
}