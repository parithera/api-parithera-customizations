import { Injectable } from "@nestjs/common";
import { Group, Request, ResponseData, ResponseType } from "../types";
import { DispatcherPluginMessage } from "src/types/rabbitMqMessages";
import { join } from "path";
import { ConfigService } from "@nestjs/config";
import { EntityNotFound, RabbitMQError } from "src/types/errors/types";
import * as fs from 'fs';
import * as amqp from 'amqplib';
import { AnalyzersService } from "src/codeclarity_modules/analyzers/analyzers.service";
import { AuthenticatedUser } from "src/types/auth/types";
import { SampleService } from "src/enterprise_modules/samples/samples.service";
import { AnalysesService } from "src/codeclarity_modules/analyses/analyses.service";
import { AnalysisCreateBody } from "src/types/entities/frontend/Analysis";
import { ProjectService } from "src/codeclarity_modules/projects/projects.service";
import { Socket } from "dgram";

@Injectable()
export class ScanpyToolService {
    constructor(
        private readonly configService: ConfigService,
        private readonly analyzerService: AnalyzersService,
        private readonly analysisService: AnalysesService,
        private readonly sampleService: SampleService,
        private readonly projectService: ProjectService,
    ) { }

    async parseScanpyAnswer(answer: string, response_data: ResponseData, data: Request, client: Socket): Promise<ResponseData> {
        // Warn client that the llm answer was received
        response_data.status = 'llm_answer_received'
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        })

        const splited_answer = answer.split('--FOLLOWUPS--')

        let script = splited_answer[0];
        script = script.split('```python')[1].split('```')[0]

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

        // Send message to aqmp to start the anaylsis
        const queue = 'dispatcher_python';
        const amqpHost = `${this.configService.getOrThrow<string>(
            'AMQP_PROTOCOL'
        )}://${this.configService.getOrThrow<string>('AMQP_USER')}:${process.env.AMQP_PASSWORD
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
                ProjectId: data.projectId
            };
            ch1.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
            await ch1.close();
        } catch (err) {
            throw new RabbitMQError(err);
        }

        // Warn client that the script execution has started
        response_data.status = 'script_started'
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        })

        return response_data
    }

    async getScriptOutput(organizationId: string, projectId: string, user: AuthenticatedUser, response_data: ResponseData, client: Socket): Promise<ResponseData> {
        const analyzer = await this.analyzerService.getByName(organizationId, 'execute_python_script', user)
        const samples = await this.sampleService.getManyByProject(organizationId, projectId, user)

        const groups = []
        for (const sample of samples.data){
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
                    type: 'chat'
                }
            },
            branch: ' ', // This will be removed
            commit_hash: ' ' // This will be removed
        }

        const analysisId = await this.analysisService.create(organizationId, projectId, data, user)
        
        const filePath = join('/private', organizationId, 'projects', projectId, "data", analysisId + '.png');
        let checkCount = 0;
        const maxChecks = 120; // 2 minutes (60 seconds * 2)

        while (!fs.existsSync(filePath) && checkCount < maxChecks) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
            checkCount++;
        }

        if (!fs.existsSync(filePath)) {
            response_data.error = 'No image generated by scanpy'
            return response_data
        }

        // Warn client that the script has been executed
        response_data.status = 'script_executed'
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        })

        const image: string = await new Promise((resolve, reject) => {
            return fs.readFile(filePath, 'base64', (err, data) => {
                if (err) {
                    reject(EntityNotFound);
                }
                resolve(data);
            });
        });

        response_data.image = image
        return response_data
    }
}