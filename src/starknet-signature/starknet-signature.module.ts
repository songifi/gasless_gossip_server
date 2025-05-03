
// starknet-signature.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { StarknetSignatureMiddleware } from './starknet-signature.middleware';

@Module({
  providers: [StarknetSignatureMiddleware],
  exports: [StarknetSignatureMiddleware],
})
export class StarknetSignatureModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the middleware to protected routes
    consumer
      .apply(StarknetSignatureMiddleware)
      .forRoutes('protected');
  }
}
