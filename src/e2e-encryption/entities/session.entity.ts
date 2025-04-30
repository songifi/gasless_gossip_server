// src/entities/session.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userIdA: string;

  @Column()
  userIdB: string;

  @Column()
  keyIdentifier: string; // Hash of the two user IDs to identify the session

  @Column({ type: 'text', nullable: true })
  encryptedSessionKey: string; // Encrypted with the server's public key for recovery purposes

  @CreateDateColumn()
  createdAt: Date;
}