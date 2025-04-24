Gasless Gossip Backend
This repository contains the NestJS backend service for Gasless Gossip, a decentralized messaging platform that integrates seamless cryptocurrency transfers into secure, wallet-to-wallet communication.
Overview
Gasless Gossip's backend is built with NestJS, providing REST APIs and WebSocket connections to power our decentralized messaging platform on StarkNet's Layer 2 scaling solution. The service handles message routing, token transfer integration, and user authentication while maintaining end-to-end encryption for privacy.
Tech Stack

Framework: NestJS
Database: PostgreSQL with Prisma ORM
API: REST with Express
Real-time Communication: WebSockets via Socket.io
Blockchain Integration: StarkNet.js for StarkNet interaction
Authentication: JWT and wallet signature verification

Prerequisites

Node.js (v16+)
PostgreSQL (v13+)
Yarn or NPM

Installation
bash# Clone the repository
git clone https://github.com/gaslessgossip/backend.git
cd backend

# Install dependencies
yarn install
Environment Setup
Create a .env file in the root directory with the following variables:
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/gaslessgossip?schema=public"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="24h"

# StarkNet
STARKNET_PROVIDER_URL="https://alpha-mainnet.starknet.io"
CONTRACT_ADDRESS="0x..."

# Server
PORT=3000
NODE_ENV=development

# WebSockets
WS_PORT=3001
Database Setup
bash# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init
Running the Application
bash# Development mode
yarn start:dev

# Production mode
yarn build
yarn start:prod
API Documentation
After starting the server, Swagger documentation is available at:

http://localhost:3000/api

API Endpoints

Authentication

POST /api/auth/login - Authenticate using wallet signature
POST /api/auth/verify - Verify JWT token


Users

GET /api/users - List users
GET /api/users/:walletAddress - Get user details
PUT /api/users/:walletAddress - Update user profile


Messages

GET /api/messages/:chatId - Get chat messages
POST /api/messages - Send new message
DELETE /api/messages/:messageId - Delete a message


Chats

GET /api/chats - Get user's chats
POST /api/chats - Create new chat
POST /api/chats/:chatId/members - Add members to chat


Tokens

GET /api/tokens/balances - Get token balances
POST /api/tokens/transfer - Initiate token transfer



WebSocket Endpoints

Messages: ws://localhost:3001/messages
Notifications: ws://localhost:3001/notifications

Core Features

User Authentication: Wallet-based authentication with signature verification
Messaging Service: Real-time message delivery with encryption
Token Transfer Integration: StarkNet smart contract integration for gas-efficient transactions
Group Chat Management: Creating and managing group conversations
DAO Treasury Features: Tools for community-driven financial management

Testing
bash# Unit tests
yarn test

# e2e tests
yarn test:e2e

# Test coverage
yarn test:cov
Project Structure
src/
├── app.module.ts              # Main application module
├── main.ts                    # Application entry point
├── auth/                      # Authentication modules and guards
├── common/                    # Shared utilities and interceptors
├── config/                    # Configuration modules
├── controllers/               # REST API controllers
│   ├── messages.controller.ts
│   ├── users.controller.ts
│   └── tokens.controller.ts
├── modules/
│   ├── messages/              # Message handling services
│   ├── users/                 # User management
│   ├── tokens/                # Token transfer modules
│   └── groups/                # Group chat functionality
├── prisma/                    # Prisma ORM configuration and schema
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── services/                  # Business logic
│   ├── messages.service.ts
│   ├── users.service.ts
│   └── tokens.service.ts
└── websockets/                # WebSocket gateway implementations
Database Schema
The PostgreSQL database uses the following core models:
// Users
model User {
  id              String    @id @default(uuid())
  walletAddress   String    @unique
  username        String?
  avatarUrl       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  chats           ChatMember[]
  sentMessages    Message[] @relation("SentMessages")
}

// Messages
model Message {
  id          String    @id @default(uuid())
  content     String
  chatId      String
  senderId    String
  sender      User      @relation("SentMessages", fields: [senderId], references: [id])
  chat        Chat      @relation(fields: [chatId], references: [id])
  createdAt   DateTime  @default(now())
  tokenTransfer TokenTransfer?
}

// Chats
model Chat {
  id          String      @id @default(uuid())
  name        String?     // For group chats
  isGroup     Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  messages    Message[]
  members     ChatMember[]
}

model ChatMember {
  id          String    @id @default(uuid())
  chatId      String
  userId      String
  role        String    @default("MEMBER") // ADMIN, MEMBER
  joinedAt    DateTime  @default(now())
  chat        Chat      @relation(fields: [chatId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@unique([chatId, userId])
}

// Token Transfers
model TokenTransfer {
  id            String    @id @default(uuid())
  messageId     String    @unique
  message       Message   @relation(fields: [messageId], references: [id])
  tokenAddress  String
  amount        String
  tokenType     String    // ERC20, ERC721, ERC1155
  tokenId       String?   // For NFTs
  txHash        String?
  status        String    // PENDING, CONFIRMED, FAILED
  createdAt     DateTime  @default(now())
}
Contributing
Please read our CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.
License
This project is licensed under the MIT License - see the LICENSE file for details.
Blockchain Integration
Gasless Gossip integrates with StarkNet for gas-efficient token transfers. The backend communicates with smart contracts written in Cairo to facilitate:

Token transfers (ERC-20, ERC-721, ERC-1155)
Message signatures and verification
DAO treasury management

Check the src/modules/blockchain directory for implementation details.
Deployment
Deployment instructions and CI/CD pipeline configurations can be found in the DEPLOYMENT.md file.