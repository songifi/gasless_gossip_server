# Gasless Gossip Backend

This repository contains the NestJS backend service for **Gasless Gossip**, a decentralized messaging platform that integrates seamless cryptocurrency transfers into secure, wallet-to-wallet communication.

---

## Overview

Gasless Gossip’s backend is built with NestJS, providing REST APIs and WebSocket connections to power our decentralized messaging platform on StarkNet’s Layer 2 scaling solution. The service handles message routing, token transfer integration, and user authentication while maintaining end-to-end encryption for privacy.

---

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL with Prisma ORM
- **API:** REST (Express)
- **Real-time:** WebSockets (Socket.io)
- **Blockchain:** StarkNet.js
- **Authentication:** JWT and wallet signature verification

---

## Prerequisites

- Node.js v20+
- PostgreSQL v13+
- Yarn or npm

---

## Installation

```bash
# Clone the repository
git clone https://github.com/gaslessgossip/backend.git
cd backend

# Install dependencies
npm install
# or yarn install
```

---

## Environment Setup

Create a `.env` file in the project root with the following variables:

```dotenv
# Database
database_url="postgresql://username:password@localhost:5432/gaslessgossip?schema=public"

# JWT
jwt_secret="your-secret-key"
jwt_expiration="24h"

# StarkNet
starknet_provider_url="https://alpha-mainnet.starknet.io"
contract_address="0x..."

# Server
port=3000
node_env=development

# WebSockets
ws_port=3001
```

---

## Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init
```

---

## Running the Application

```bash
# Development mode
yarn start:dev

# Production mode
yarn build
yarn start:prod
```

---

## API Documentation

Once the server is running, Swagger docs are available at:  
`http://localhost:3000/api`

### Endpoints

#### Authentication

- `POST /api/auth/login` – Authenticate using wallet signature
- `POST /api/auth/verify` – Verify JWT token

#### Users

- `GET /api/users` – List users
- `GET /api/users/:walletAddress` – Get user details
- `PUT /api/users/:walletAddress` – Update user profile

#### Messages

- `GET /api/messages/:chatId` – Get chat messages
- `POST /api/messages` – Send new message
- `DELETE /api/messages/:messageId` – Delete a message

#### Chats

- `GET /api/chats` – List user’s chats
- `POST /api/chats` – Create new chat
- `POST /api/chats/:chatId/members` – Add members to chat

#### Tokens

- `GET /api/tokens/balances` – Get token balances
- `POST /api/tokens/transfer` – Initiate token transfer

---

## WebSocket Endpoints

- **Messages:** `ws://localhost:3001/messages`
- **Notifications:** `ws://localhost:3001/notifications`

---

## Core Features

- **User Authentication:** Wallet-based signature verification
- **Messaging:** Real-time encrypted delivery
- **Token Transfers:** StarkNet smart contract integration
- **Group Chats:** Creation and management of group conversations
- **DAO Treasury:** Community-driven financial management tools

---

## Testing

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Test coverage
yarn test:cov
```

---

## Project Structure

```plaintext
src/
├── app.module.ts          # Main application module
├── main.ts                # Entry point
├── auth/                  # Authentication modules & guards
├── common/                # Shared utils & interceptors
├── config/                # Configuration modules
├── controllers/           # REST API controllers
│   ├── messages.controller.ts
│   ├── users.controller.ts
│   └── tokens.controller.ts
├── modules/
│   ├── messages/          # Message handling services
│   ├── users/             # User management
│   ├── tokens/            # Token transfer modules
│   └── groups/            # Group chat functionality
├── prisma/                # Prisma schema & migrations
│   ├── schema.prisma
│   └── migrations/
├── services/              # Business logic
│   ├── messages.service.ts
│   ├── users.service.ts
│   └── tokens.service.ts
└── websockets/            # WebSocket gateways
```

---

## Database Schema

```prisma
model User {
  id            String    @id @default(uuid())
  walletAddress String    @unique
  username      String?
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  chats         ChatMember[]
  sentMessages  Message[] @relation("SentMessages")
}

model Message {
  id            String        @id @default(uuid())
  content       String
  chatId        String
  senderId      String
  sender        User          @relation("SentMessages", fields: [senderId], references: [id])
  chat          Chat          @relation(fields: [chatId], references: [id])
  createdAt     DateTime      @default(now())
  tokenTransfer TokenTransfer?
}

model Chat {
  id        String      @id @default(uuid())
  name      String?
  isGroup   Boolean     @default(false)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  messages  Message[]
  members   ChatMember[]
}

model ChatMember {
  id       String   @id @default(uuid())
  chatId   String
  userId   String
  role     String   @default("MEMBER")
  joinedAt DateTime @default(now())
  chat     Chat     @relation(fields: [chatId], references: [id])
  user     User     @relation(fields: [userId], references: [id])

  @@unique([chatId, userId])
}

model TokenTransfer {
  id           String   @id @default(uuid())
  messageId    String   @unique
  message      Message  @relation(fields: [messageId], references: [id])
  tokenAddress String
  amount       String
  tokenType    String
  tokenId      String?
  txHash       String?
  status       String
  createdAt    DateTime @default(now())
}
```

---

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for our code of conduct and pull request guidelines.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Blockchain Integration

Gasless Gossip integrates with StarkNet for gas-efficient token transfers. The backend communicates with Cairo smart contracts to facilitate:

- ERC-20, ERC-721, and ERC-1155 token transfers
- Message signature verification
- DAO treasury management

Check the `src/modules/blockchain` directory for implementation details.

---

## Deployment

Deployment and CI/CD instructions are available in [DEPLOYMENT.md](DEPLOYMENT.md).
