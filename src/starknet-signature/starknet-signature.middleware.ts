import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ec, Provider, stark } from 'starknet';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class StarknetSignatureMiddleware implements NestMiddleware {
  // Common verification logic
  private async verifySignature(
    publicKey: string, 
    message: string, 
    signature: string,
  ): Promise<boolean> {
    try {
      // Ensure proper formatting
      if (!publicKey.startsWith('0x')) {
        publicKey = `0x${publicKey}`;
      }
      
      // Check if signature and public key are valid hex strings
      if (!/^0x[0-9a-fA-F]+$/.test(signature) || !/^0x[0-9a-fA-F]+$/.test(publicKey)) {
        return false;
      }
      
      // Hash the message using Pedersen hash (Starknet's hash method)
      const messageHash = stark.hashMessage(message);
      
      // Verify the signature
      return stark.verifySignature(
        messageHash,
        signature,
        publicKey
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  // HTTP middleware implementation
  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract authentication headers
      const publicKey = req.headers['x-starknet-public-key'] as string;
      const signature = req.headers['x-starknet-signature'] as string;
      const timestamp = req.headers['x-starknet-timestamp'] as string;
      
      if (!publicKey || !signature || !timestamp) {
        throw new HttpException('Missing Starknet authentication headers', HttpStatus.UNAUTHORIZED);
      }
      
      // Validate timestamp to prevent replay attacks (5 minute window)
      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(timestamp);
      
      if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > 300) {
        throw new HttpException('Request timestamp expired or invalid', HttpStatus.UNAUTHORIZED);
      }
      
      // Construct message from request data
      const method = req.method;
      const path = req.originalUrl;
      const body = JSON.stringify(req.body || {});
      const message = `${method}:${path}:${body}:${timestamp}`;
      
      // Verify the signature
      const isValid = await this.verifySignature(publicKey, message, signature);
      
      if (!isValid) {
        throw new HttpException('Invalid Starknet signature', HttpStatus.UNAUTHORIZED);
      }
      
      // Store the verified public key for use in controllers
      req['starknetPublicKey'] = publicKey;
      
      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Starknet signature verification failed', HttpStatus.UNAUTHORIZED);
    }
  }

  // WebSocket guard method (can be used in WS gateway)
  async verifyWsConnection(client: Socket, message: any): Promise<boolean> {
    try {
      const publicKey = client.handshake.headers['x-starknet-public-key'] as string;
      const signature = client.handshake.headers['x-starknet-signature'] as string;
      const timestamp = client.handshake.headers['x-starknet-timestamp'] as string;
      
      if (!publicKey || !signature || !timestamp) {
        throw new WsException('Missing Starknet authentication headers');
      }
      
      // Validate timestamp to prevent replay attacks (5 minute window)
      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(timestamp);
      
      if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > 300) {
        throw new WsException('Request timestamp expired or invalid');
      }
      
      // Create message from the connection data and initial message if available
      const path = client.handshake.url || '';
      const messageData = message ? JSON.stringify(message) : '';
      const verificationMessage = `WS:${path}:${messageData}:${timestamp}`;
      
      // Verify the signature
      const isValid = await this.verifySignature(publicKey, verificationMessage, signature);
      
      if (!isValid) {
        throw new WsException('Invalid Starknet signature');
      }
      
      // Store the verified public key for use in gateway
      client['starknetPublicKey'] = publicKey;
      
      return true;
    } catch (error) {
      throw new WsException('Starknet WebSocket verification failed');
    }
  }
}
