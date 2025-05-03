import { WebSocketGateway, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, WsResponse } from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Socket } from 'socket.io';
import { StarknetWsGuard } from './starknet-ws.guard';
import { StarknetSignatureMiddleware } from './starknet-signature.middleware';

@WebSocketGateway()
export class StarknetWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly starknetSignatureMiddleware: StarknetSignatureMiddleware) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      // Initial connection verification
      await this.starknetSignatureMiddleware.verifyWsConnection(client, null);
      console.log(`Client connected: ${client.id}`);
    } catch (error) {
      client.disconnect(true);
      console.error(`Connection rejected: ${error.message}`);
    }
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(StarknetWsGuard)
  @SubscribeMessage('protectedEvent')
  handleProtectedEvent(client: Socket, payload: any): WsResponse<any> {
    // This handler is protected by the StarknetWsGuard
    const publicKey = client['starknetPublicKey'];
    return { event: 'protectedResponse', data: { 
      message: 'Access granted to protected event',
      publicKey: publicKey
    }};
  }
}
