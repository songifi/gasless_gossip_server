// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Message } from './entities/message.entity';
import { Session } from './entities/session.entity';
import { UserService } from './services/user.service';
import { CryptoService } from './services/crypto.service';
import { SessionService } from './services/session.service';
import { MessageService } from './services/message.service';
import { AuthService } from './services/auth.service';
import { UserController } from './controllers/user.controller';
import { MessageController } from './controllers/message.controller';
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'e2e_messaging',
      entities: [User, Message, Session],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([User, Message, Session]),
  ],
  controllers: [UserController, MessageController, AuthController],
  providers: [UserService, CryptoService, SessionService, MessageService, AuthService],
})
export class AppModule {}