// ENGAGEMENT MODULE
// engagement.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReactionController } from "./controllers/reaction.controller";
import { CommentController } from "./controllers/comment.controller";
import { CryptoTipController } from "./controllers/crypto-tip.controller";
import { ReactionService } from "./services/reaction.service";
import { CommentService } from "./services/comment.service";
import { CryptoTipService } from "./services/crypto-tip.service";
import { EngagementMetricsService } from "./services/engagement-metrics.service";
import { Reaction } from "./entities/reaction.entity";
import { Comment } from "./entities/comment.entity";
import { CryptoTip } from "./entities/crypto-tip.entity";
import { UserModule } from "../user/user.module";
import { NotificationModule } from "../notification/notification.module";
import { TransactionModule } from "../transaction/transaction.module";
import { CacheModule } from "../common/cache.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Reaction, Comment, CryptoTip]),
    forwardRef(() => UserModule),
    NotificationModule,
    TransactionModule,
    CacheModule,
  ],
  controllers: [ReactionController, CommentController, CryptoTipController],
  providers: [
    ReactionService,
    CommentService,
    CryptoTipService,
    EngagementMetricsService,
  ],
  exports: [
    ReactionService,
    CommentService,
    CryptoTipService,
    EngagementMetricsService,
  ],
})
export class EngagementModule {}

// MIGRATIONS
// migrations/1714434567000-CreateEngagementEntities.ts
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from "typeorm";

export class CreateEngagementEntities1714434567000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reactions table
    await queryRunner.createTable(
      new Table({
        name: "reactions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          {
            name: "content_id",
            type: "uuid",
          },
          {
            name: "content_type",
            type: "varchar",
          },
          {
            name: "creator_id",
            type: "uuid",
          },
          {
            name: "type",
            type: "varchar",
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "is_deleted",
            type: "boolean",
            default: false,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
      true
    );

    // Create indices for reactions
    await queryRunner.createIndex(
      "reactions",
      new TableIndex({
        name: "IDX_reactions_content",
        columnNames: ["content_id", "content_type"],
      })
    );

    await queryRunner.createIndex(
      "reactions",
      new TableIndex({
        name: "IDX_reactions_creator",
        columnNames: ["creator_id"],
      })
    );

    await queryRunner.createIndex(
      "reactions",
      new TableIndex({
        name: "IDX_reactions_unique",
        columnNames: ["content_id", "content_type", "creator_id", "type"],
        isUnique: true,
      })
    );

    // Create comments table
    await queryRunner.createTable(
      new Table({
        name: "comments",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          {
            name: "content_id",
            type: "uuid",
          },
          {
            name: "content_type",
            type: "varchar",
          },
          {
            name: "creator_id",
            type: "uuid",
          },
          {
            name: "content",
            type: "text",
          },
          {
            name: "parent_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "root_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "mentions",
            type: "varchar",
            isArray: true,
            isNullable: true,
          },
          {
            name: "reply_count",
            type: "integer",
            default: 0,
          },
          {
            name: "is_deleted",
            type: "boolean",
            default: false,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
      true
    );

    // Create indices for comments
    await queryRunner.createIndex(
      "comments",
      new TableIndex({
        name: "IDX_comments_content",
        columnNames: ["content_id", "content_type"],
      })
    );

    await queryRunner.createIndex(
      "comments",
      new TableIndex({
        name: "IDX_comments_creator",
        columnNames: ["creator_id"],
      })
    );

    await queryRunner.createIndex(
      "comments",
      new TableIndex({
        name: "IDX_comments_parent",
        columnNames: ["parent_id"],
      })
    );

    await queryRunner.createIndex(
      "comments",
      new TableIndex({
        name: "IDX_comments_root",
        columnNames: ["root_id"],
      })
    );

    // Create foreign key for comment threading
    await queryRunner.createForeignKey(
      "comments",
      new TableForeignKey({
        columnNames: ["parent_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "comments",
        onDelete: "CASCADE",
      })
    );

    // Create crypto_tips table
    await queryRunner.createTable(
      new Table({
        name: "crypto_tips",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          {
            name: "content_id",
            type: "uuid",
          },
          {
            name: "content_type",
            type: "varchar",
          },
          {
            name: "creator_id",
            type: "uuid",
          },
          {
            name: "amount",
            type: "decimal",
            precision: 18,
            scale: 8,
          },
          {
            name: "token_symbol",
            type: "varchar",
          },
          {
            name: "transaction_id",
            type: "uuid",
          },
          {
            name: "status",
            type: "varchar",
            default: "'pending'",
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "is_deleted",
            type: "boolean",
            default: false,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
      true
    );

    // Create indices for crypto_tips
    await queryRunner.createIndex(
      "crypto_tips",
      new TableIndex({
        name: "IDX_crypto_tips_content",
        columnNames: ["content_id", "content_type"],
      })
    );

    await queryRunner.createIndex(
      "crypto_tips",
      new TableIndex({
        name: "IDX_crypto_tips_creator",
        columnNames: ["creator_id"],
      })
    );

    await queryRunner.createIndex(
      "crypto_tips",
      new TableIndex({
        name: "IDX_crypto_tips_transaction",
        columnNames: ["transaction_id"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("crypto_tips");
    await queryRunner.dropTable("comments");
    await queryRunner.dropTable("reactions");
  }
}

// UNIT
