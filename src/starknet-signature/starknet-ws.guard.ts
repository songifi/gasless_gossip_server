
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { StarknetSignatureMiddleware } from './starknet-signature.middleware';
import { Socket } from 'socket.io';

@Injectable()
export class StarknetWsGuard implements CanActivate {
  constructor(private readonly starknetSignatureMiddleware: StarknetSignatureMiddleware) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'ws') {
      return true;
    }

    const client = context.switchToWs().getClient<Socket>();
    const message = context.switchToWs().getData();
    
    return this.starknetSignatureMiddleware.verifyWsConnection(client, message);
  }
}
