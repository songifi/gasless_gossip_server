import { Injectable, Logger } from '@nestjs/common';
import { WebsocketMessage } from '../interfaces/websocket-message.interface';

@Injectable()
export class WebsocketEventLoggerService {
  private readonly logger = new Logger('WebsocketEvents');
  private readonly MAX_DATA_LENGTH = 500; // Truncate long messages in logs

  logIncomingMessage(message: WebsocketMessage): void {
    const sanitizedData = this.sanitizeMessageData(message.data);
    this.logger.debug(
      `INCOMING - Event: ${message.event}, Room: ${message.room || 'N/A'}, User: ${message.userId || 'broadcast'}, Data: ${sanitizedData}`,
    );
  }

  logOutgoingMessage(message: WebsocketMessage): void {
    const sanitizedData = this.sanitizeMessageData(message.data);
    this.logger.debug(
      `OUTGOING - Event: ${message.event}, Room: ${message.room || 'N/A'}, User: ${message.userId || 'broadcast'}, Data: ${sanitizedData}`,
    );
  }

  logConnectionEvent(socketId: string, userId: string, event: 'connected' | 'disconnected', metadata?: Record<string, any>): void {
    this.logger.log(
      `CONNECTION - Socket: ${socketId}, User: ${userId}, Event: ${event}, Metadata: ${JSON.stringify(metadata || {})}`,
    );
  }

  logError(socketId: string, userId: string, error: Error): void {
    this.logger.error(
      `ERROR - Socket: ${socketId}, User: ${userId}, Error: ${error.message}, Stack: ${error.stack}`,
    );
  }

  logRateLimitExceeded(socketId: string, userId: string, event: string): void {
    this.logger.warn(
      `RATE LIMIT - Socket: ${socketId}, User: ${userId}, Event: ${event}`,
    );
  }

  logPerformanceMetric(metricName: string, durationMs: number, metadata?: Record<string, any>): void {
    this.logger.log(
      `PERFORMANCE - Metric: ${metricName}, Duration: ${durationMs}ms, Metadata: ${JSON.stringify(metadata || {})}`,
    );
  }

  // Helper to prevent logging sensitive or large data
  private sanitizeMessageData(data: any): string {
    try {
      if (!data) return 'null';
      
      // Clone the data
      const clonedData = JSON.parse(JSON.stringify(data));
      
      // Remove sensitive fields
      if (typeof clonedData === 'object') {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
        for (const field of sensitiveFields) {
          if (clonedData[field]) {
            clonedData[field] = '[REDACTED]';
          }
        }
      }
      
      // Convert to string and truncate if too long
      const dataString = JSON.stringify(clonedData);
      if (dataString.length > this.MAX_DATA_LENGTH) {
        return dataString.substring(0, this.MAX_DATA_LENGTH) + '... [truncated]';
      }
      
      return dataString;
    } catch (error) {
      return String(data);
    }
  }
}