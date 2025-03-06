import { Injectable } from "@nestjs/common";
import { ResponseData, ResponseType } from "../types";
import { Socket } from "dgram";

@Injectable()
export class RAGToolService {
    /**
     * Parses the answer received from a language model and updates the response data accordingly.
     *
     * @param {string} answer - The answer string received from the language model.
     * @param {ResponseData} responseData - The current state of the response data to be updated.
     * @param {Socket} client - The socket client associated with the request.
     * @returns {ResponseData} - The updated response data object.
     */
    parseRAGAnswer(answer: string, response_data: ResponseData, client: Socket): ResponseData {
        // Update the status in response_data to indicate that the LLM answer has been received.
        response_data.status = 'llm_answer_received';

        // Emit an event to the client with updated response data and info type.
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        });

        // Split the answer into two parts using '--FOLLOWUPS--' as a delimiter.
        const splited_answer = answer.split('--FOLLOWUPS--');

        // Update the status in response_data to indicate that follow-up questions are being generated.
        response_data.status = 'generating_follow_up';

        // Emit an event to the client with updated response data and info type.
        client.emit('chat:status', {
            data: response_data,
            type: ResponseType.INFO
        });

        // Assign the first part of the split answer as the main text in response_data.
        response_data.text = splited_answer[0];

        // Check if there is a second part and it's not empty, then parse follow-up questions.
        if (splited_answer.length > 1 && splited_answer[0] !== '') {
            response_data.followup = splited_answer[1].split('\n').filter(followup => followup.trim() !== '');
        } else {
            // If no valid follow-ups, set an empty array for follow-up questions.
            response_data.followup = [];
        }
        // Return the updated response data.
        return response_data;
    }
}