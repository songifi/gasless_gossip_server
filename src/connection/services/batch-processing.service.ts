// src/connection/services/batch-processing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConnectionRepository } from '../repositories/connection.repository';
import { Connection } from '../entities/connection.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class BatchProcessingService {
  private readonly logger = new Logger(BatchProcessingService.name);
  private readonly BATCH_SIZE = 100;
  
  constructor(
    private readonly connectionRepository: ConnectionRepository,
    @InjectQueue('connections') private readonly connectionsQueue: Queue
  ) {}
  
  // Process large user imports (e.g., from another platform)
  async batchImportConnections(importData: any[]): Promise<void> {
    this.logger.log(`Starting batch import of ${importData.length} connections`);
    
    // Process in batches to avoid memory issues
    for (let i = 0; i < importData.length; i += this.BATCH_SIZE) {
      const batch = importData.slice(i, i + this.BATCH_SIZE);
      
      // Add batch to processing queue
      await this.connectionsQueue.add('importBatch', {
        batch,
        batchNumber: Math.floor(i / this.BATCH_SIZE) + 1,
        totalBatches: Math.ceil(importData.length / this.BATCH_SIZE)
      });
    }
    
    this.logger.log('All connection import batches queued');
  }
  
  // Process connection updates in batch (e.g., recalculate all strengths)
  async recalculateAllConnectionStrengths(): Promise<void> {
    this.logger.log('Starting strength recalculation for all connections');
    
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Get batch of connections
      const [connections, total] = await this.connectionRepository.findActiveConnections(
        page * this.BATCH_SIZE,
        this.BATCH_SIZE
      );
      
      if (connections.length === 0) {
        hasMore = false;
        break;
      }
      
      // Add to processing queue
      await this.connectionsQueue.add('recalculateStrengthBatch', {
        connectionIds: connections.map(conn => conn.id),
        batchNumber: page + 1,
        totalBatches: Math.ceil(total / this.BATCH_SIZE)
      });
      
      page++;
    }
    
    this.logger.log('All strength recalculation batches queued');
  }
  
  // Clean up old rejected connections
  async cleanupRejectedConnections(olderThan: Date): Promise<void> {
    this.logger.log(`Starting cleanup of rejected connections older than ${olderThan}`);
    
    let deleted = 0;
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Find batch of old rejected connections
      const connections = await this.connectionRepository.findOldRejectedConnections(
        olderThan,
        page * this.BATCH_SIZE,
        this.BATCH_SIZE
      );
      
      if (connections.length === 0) {
        hasMore = false;
        break;
      }
      
      // Delete batch
      await Promise.all(
        connections.map(conn => this.connectionRepository.remove(conn.id))
      );
      
      deleted += connections.length;
      page++;
    }
    
    this.logger.log(`Cleaned up ${deleted} old rejected connections`);
  }
}