import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReputationSchema1714435281489 implements MigrationInterface {
  name = 'CreateReputationSchema1714435281489';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reputation table
    await queryRunner.query(`
      CREATE TABLE "reputation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "score" float NOT NULL DEFAULT 0,
        "transactionScore" float NOT NULL DEFAULT 0,
        "activityScore" float NOT NULL DEFAULT 0,
        "socialScore" float NOT NULL DEFAULT 0,
        "factorWeights" jsonb NOT NULL DEFAULT '{}',
        "level" varchar(50) NOT NULL DEFAULT 'NEWCOMER',
        "isVerified" boolean NOT NULL DEFAULT false,
        "lastCalculated" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reputation" PRIMARY KEY ("id")
      )
    `);

    // Create reputation_history table
    await queryRunner.query(`
      CREATE TABLE "reputation_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reputationId" uuid NOT NULL,
        "score" float NOT NULL,
        "transactionScore" float NOT NULL,
        "activityScore" float NOT NULL,
        "socialScore" float NOT NULL,
        "level" varchar(50) NOT NULL,
        "changeFactors" jsonb,
        "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reputation_history" PRIMARY KEY ("id")
      )
    `);

    // Create verification table
    await queryRunner.query(`
      CREATE TABLE "verification" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reputationId" uuid NOT NULL,
        "type" varchar(50) NOT NULL,
        "status" varchar(50) NOT NULL,
        "metadata" jsonb,
        "blockchainReference" varchar(255),
        "verificationProof" varchar(255),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_verification" PRIMARY KEY ("id")
      )
    `);

    // Create badge table
    await queryRunner.query(`
      CREATE TABLE "badge" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" varchar(50) NOT NULL,
        "status" varchar(50) NOT NULL,
        "progress" float NOT NULL DEFAULT 0,
        "requirements" jsonb,
        "metadata" jsonb,
        "awardedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_badge" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_reputation_userId" ON "reputation" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_reputation_level" ON "reputation" ("level")`);
    await queryRunner.query(`CREATE INDEX "IDX_reputation_isVerified" ON "reputation" ("isVerified")`);
    await queryRunner.query(`CREATE INDEX "IDX_reputation_history_reputationId" ON "reputation_history" ("reputationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_reputation_history_recordedAt" ON "reputation_history" ("recordedAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_verification_reputationId" ON "verification" ("reputationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_verification_type" ON "verification" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_verification_status" ON "verification" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_badge_userId" ON "badge" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_badge_type" ON "badge" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_badge_status" ON "badge" ("status")`);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "reputation_history" 
      ADD CONSTRAINT "FK_reputation_history_reputation" 
      FOREIGN KEY ("reputationId") REFERENCES "reputation"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "verification" 
      ADD CONSTRAINT "FK_verification_reputation" 
      FOREIGN KEY ("reputationId") REFERENCES "reputation"("id") 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "verification" DROP CONSTRAINT "FK_verification_reputation"`);
    await queryRunner.query(`ALTER TABLE "reputation_history" DROP CONSTRAINT "FK_reputation_history_reputation"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_badge_status"`);
    await queryRunner.query(`DROP INDEX "IDX_badge_type"`);
    await queryRunner.query(`DROP INDEX "IDX_badge_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_verification_status"`);
    await queryRunner.query(`DROP INDEX "IDX_verification_type"`);
    await queryRunner.query(`DROP INDEX "IDX_verification_reputationId"`);
    await queryRunner.query(`DROP INDEX "IDX_reputation_history_recordedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_reputation_history_reputationId"`);
    await queryRunner.query(`DROP INDEX "IDX_reputation_isVerified"`);
    await queryRunner.query(`DROP INDEX "IDX_reputation_level"`);
    await queryRunner.query(`DROP INDEX "IDX_reputation_userId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "badge"`);
    await queryRunner.query(`DROP TABLE "verification"`);
    await queryRunner.query(`DROP TABLE "reputation_history"`);
    await queryRunner.query(`DROP TABLE "reputation"`);
  }
}
