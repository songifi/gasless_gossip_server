import { Injectable } from '@nestjs/common';
import { Connection, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { FilterService } from '../services/filter.service';
import { InjectConnection } from '@nestjs/typeorm';

@Injectable()
export class ContentSubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectConnection() readonly connection: Connection,
    private readonly filterService: FilterService,
  ) {
    connection.subscribers.push(this);
  }

  /**
   * This subscriber is intended to hook into content creation/updates
   * from other modules (Post, Comment, Message, etc.)
   * 
   * For this example, we'll use a simplified approach assuming entities
   * have content, type, and userId fields
   */

  // Implement listenTo method to specify which entities to listen to
  // For example:
  // listenTo() {
  //   return [Post, Comment, Message];
  // }

  // Process content when it's created
  async afterInsert(event: InsertEvent<any>): Promise<void> {
    await this.processContent(event.entity);
  }

  // Process content when it's updated
  async afterUpdate(event: UpdateEvent<any>): Promise<void> {
    // Only process if content field was updated
    if (event.updatedColumns.some(column => column.propertyName === 'content')) {
      await this.processContent(event.entity);
    }
  }

  private async processContent(entity: any): Promise<void> {
    // Skip processing if entity doesn't have required fields
    if (!entity.content || !entity.id || !entity.userId) {
      return;
    }

    // Determine contentType based on entity constructor name or other logic
    const contentType = entity.constructor.name.toLowerCase();

    // Process content through filter service
    await this.filterService.filterContent({
      id: entity.id,
      type: contentType,
      content: entity.content,
      userId: entity.userId,
    });
  }
}