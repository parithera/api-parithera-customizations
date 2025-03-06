import { Repository } from 'typeorm';
import { Chat, Message } from './chat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { EntityNotFound } from 'src/types/error.types';
import { ResponseData } from './types';

/**
 * ChatRepository is a service that interacts with the database to perform CRUD operations
 * on chats and their associated messages.
 */
@Injectable()
export class ChatRepository {
  constructor(
    @InjectRepository(Chat, 'codeclarity')
    private chatRepository: Repository<Chat>,
  ) { }

  /**
   * Retrieves a chat associated with a specific project ID.
   *
   * @param projectId - The unique identifier for the project.
   * @param relation - Optional object specifying relations to be loaded along with the chat.
   * @returns A Promise resolving to the Chat entity or throwing an EntityNotFound error if not found.
   */
  async getByProjectId(projectId: string, relation?: object): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { project: { id: projectId } },
      relations: relation,
    });
    if (!chat) {
      throw new EntityNotFound('No history');
    }
    return chat;
  }

  /**
   * Checks whether a chat exists for a given project ID.
   *
   * @param projectId - The unique identifier for the project.
   * @returns A Promise resolving to true if a chat exists, otherwise false.
   */
  async chatExistsByProjectId(projectId: string): Promise<boolean> {
    return this.chatRepository.exists({
      where: { project: { id: projectId } },
    });
  }

  /**
   * Saves a new chat or updates an existing one in the database.
   *
   * @param chat - The Chat entity to be saved or updated.
   * @returns A Promise resolving to the saved Chat entity.
   */
  async saveChat(chat: Chat): Promise<Chat> {
    return this.chatRepository.save(chat);
  }

  /**
   * Removes a chat from the database.
   *
   * @param chat - The Chat entity to be removed.
   * @returns A Promise resolving once the chat is successfully removed.
   */
  async removeChat(chat: Chat): Promise<void> {
    await this.chatRepository.remove(chat);
  }

  /**
   * Updates the chat history by adding a new message.
   *
   * @param chat - The Chat entity to be updated.
   * @param response - The response data containing code, followup, text, json, etc.
   * @param request - The request string that triggered this response.
   * @param analysis_id - The unique identifier for the analysis.
   */
  async updateChatHistory(
    chat: Chat,
    response: ResponseData,
    request: string,
    analysis_id: string,
  ): Promise<void> {
    const newMessage: Message = {
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
    };

    chat.messages.splice(0, 0, newMessage);
    await this.chatRepository.save(chat);
  }

  /**
   * Updates a chat in the database.
   *
   * @param chat - The Chat entity to be updated.
   * @returns A Promise resolving to the updated Chat entity.
   */
  async updateChat(chat: Chat): Promise<Chat> {
    return this.chatRepository.save(chat);
  }
}
