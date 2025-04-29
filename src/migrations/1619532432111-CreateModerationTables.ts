import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModerationTables1619532432111 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reports table
    await queryRunner.query(`
      CREATE TYPE report_status_enum AS ENUM ('pending', 'in_review', 'resolved', 'dismissed');
      CREATE TYPE moderation_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
      
      CREATE TABLE reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        content_type VARCHAR NOT NULL,
        content_id VARCHAR NOT NULL,
        status report_status_enum NOT NULL DEFAULT 'pending',
        priority moderation_priority_enum NOT NULL DEFAULT 'medium',
        category VARCHAR NOT NULL,
        description TEXT,
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_automated BOOLEAN NOT NULL DEFAULT false
      );
      
      CREATE INDEX idx_reports_content_type_id ON reports(content_type, content_id);
      CREATE INDEX idx_reports_status ON reports(status);
      CREATE INDEX idx_reports_priority ON reports(priority);
      CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
      CREATE INDEX idx_reports_reported_id ON reports(reported_id);
      CREATE INDEX idx_reports_created_at ON reports(created_at);
    `);

    // Create moderation_actions table
    await queryRunner.query(`
      CREATE TABLE moderation_actions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_automated BOOLEAN NOT NULL DEFAULT false
      );
      
      CREATE INDEX idx_moderation_actions_report_id ON moderation_actions(report_id);
      CREATE INDEX idx_moderation_actions_moderator_id ON moderation_actions(moderator_id);
    `);

    // Create filter_rules table
    await queryRunner.query(`
      CREATE TYPE filter_action_enum AS ENUM ('flag', 'block', 'auto_remove');
      
      CREATE TABLE filter_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR NOT NULL,
        pattern VARCHAR NOT NULL,
        is_regex BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        action filter_action_enum NOT NULL DEFAULT 'flag',
        priority moderation_priority_enum NOT NULL DEFAULT 'medium',
        score INTEGER NOT NULL DEFAULT 0,
        category VARCHAR,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_filter_rules_name ON filter_rules(name);
      CREATE INDEX idx_filter_rules_is_active ON filter_rules(is_active);
    `);

    // Create penalties table
    await queryRunner.query(`
      CREATE TYPE penalty_type_enum AS ENUM ('warning', 'content_removal', 'temporary_restriction', 'permanent_ban');
      
      CREATE TABLE penalties (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type penalty_type_enum NOT NULL,
        reason TEXT,
        metadata JSONB,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        issued_by_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_automated BOOLEAN NOT NULL DEFAULT false
      );
      
      CREATE INDEX idx_penalties_user_id ON penalties(user_id);
      CREATE INDEX idx_penalties_type ON penalties(type);
      CREATE INDEX idx_penalties_created_at ON penalties(created_at);
      CREATE INDEX idx_penalties_issued_by_id ON penalties(issued_by_id);
      CREATE INDEX idx_penalties_is_active ON penalties(is_active);
    `);

    // Create appeals table
    await queryRunner.query(`
      CREATE TABLE appeals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        penalty_id UUID NOT NULL REFERENCES penalties(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        moderator_response TEXT,
        reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_appeals_user_id ON appeals(user_id);
      CREATE INDEX idx_appeals_penalty_id ON appeals(penalty_id);
      CREATE INDEX idx_appeals_status ON appeals(status);
      CREATE INDEX idx_appeals_created_at ON appeals(created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE appeals`);
    await queryRunner.query(`DROP TABLE penalties`);
    await queryRunner.query(`DROP TYPE penalty_type_enum`);
    await queryRunner.query(`DROP TABLE filter_rules`);
    await queryRunner.query(`DROP TYPE filter_action_enum`);
    await queryRunner.query(`DROP TABLE moderation_actions`);
    await queryRunner.query(`DROP TABLE reports`);
    await queryRunner.query(`DROP TYPE moderation_priority_enum`);
    await queryRunner.query(`DROP TYPE report_status_enum`);
  }
}