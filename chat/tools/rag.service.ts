import { Injectable } from "@nestjs/common";
import { ResponseData } from "../types";

@Injectable()
export class RAGToolService {

    parseRAGAnswer(answer: string, response_data: ResponseData): ResponseData {
        const splited_answer = answer.split('--FOLLOWUPS--')

        response_data.text = splited_answer[0]
        if (splited_answer.length > 1 && splited_answer[0] !== '') {
            response_data.followup = splited_answer[1].split('\n').filter(followup => followup.trim() !== '');
        } else {
            response_data.followup = [];
        }
        return response_data
    }
}