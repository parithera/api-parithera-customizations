import { Repository } from "typeorm";
import { Chat, Message } from "./chat.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { EntityNotFound } from "src/types/errors/types";
import { ResponseData } from "./types";

@Injectable()
export class ChatRepository {

    constructor(
        @InjectRepository(Chat, 'codeclarity')
        private chatRepository: Repository<Chat>,
    ) { }

    async getByProjectId(projectId: string, relation?: object): Promise<Chat> {
        const chat = await this.chatRepository.findOne({
            where: {
                project: {
                    id: projectId
                }
            },
            relations: relation
        });
        if (!chat) {
            throw new EntityNotFound('No history');
        }
        return chat
    }

    async chatExistsByProjectId(projectId: string): Promise<Boolean> {
        return this.chatRepository.exists({
            where: {
                project: {
                    id: projectId
                }
            }
        });
    }

    async saveChat(chat: Chat): Promise<Chat> {
        return this.chatRepository.save(chat)
    }



    async removeChat(chat: Chat) {
        return this.chatRepository.remove(chat)
    }

    async updateChatHistory(chat: Chat, response: ResponseData, request: string, analysis_id: string) {
        const newMessage: Message =  {
            request: request,
            code: response.code,
            followup: response.followup,
            text: response.text,
            json: response.json,
            image: analysis_id,
            agent: response.agent,
            error: response.error,
            status: response.status,
            timestamp: new Date(),
        }

        chat.messages.splice(0, 0, newMessage);
        await this.chatRepository.save(chat);
    }

    async updateChat(chat: Chat): Promise<Chat> {
        return this.chatRepository.save(chat) 
    }
}
