import { Injectable } from "@nestjs/common";
import { ResponseData, ResponseType } from "../types";
import { Socket } from "dgram";

@Injectable()
export class RAGToolService {

    parseRAGAnswer(answer: string, response_data: ResponseData, client: Socket): ResponseData {
        // Warn client that the llm answer was received
        response_data.status = 'llm_answer_received'
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        })

        const splited_answer = answer.split('--FOLLOWUPS--')

        // Warn client that we are preparing the follow-up questions
        response_data.status = 'generating_follow_up'
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        })

        response_data.text = splited_answer[0]
        if (splited_answer.length > 1 && splited_answer[0] !== '') {
            response_data.followup = splited_answer[1].split('\n').filter(followup => followup.trim() !== '');
        } else {
            response_data.followup = [];
        }
        return response_data
    }
}