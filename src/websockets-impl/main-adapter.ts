import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

/**
 * Example of how to integrate the WebSocket adapter with the main application
 * Add this code to your src/main.ts file
 */
async function setupWebsocketAdapter(app) {
  const logger = new Logger('WebsocketAdapter');
  
  // Create Redis adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  
  try {
    // Connect to Redis
    await redisIoAdapter.connectToRedis();
    
    // Use the adapter
    app.useWebSocketAdapter(redisIoAdapter);
    
    logger.log('WebSocket adapter with Redis configured successfully');
  } catch (error) {
    logger.error(`Failed to connect Redis to WebSocket adapter: ${error.message}`);
    // Fallback to default adapter
    logger.warn('Using default WebSocket adapter as fallback');
  }
}

/**
 * Example of how to bootstrap the application with WebSocket support
 * Replace your existing bootstrap function in src/main.ts
 */
async function bootstrap() {
  // Create the Nest application
  const app = await NestFactory.create(AppModule);
  
  // Set up WebSocket adapter with Redis
  await setupWebsocketAdapter(app);
  
  // Configure other middleware and settings
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  
  // Start the server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
}

// Export the bootstrap function but don't call it directly
// This file serves as documentation for how to integrate
export { setupWebsocketAdapter, bootstrap };