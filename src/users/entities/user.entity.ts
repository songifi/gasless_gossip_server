import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Role } from '../enums/role.enum';
import { Exclude } from 'class-transformer';
import { UserSettings } from './user-settings.entity';
import { OneToOne as TypeOrmOneToOne } from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() // Exclude password from response objects
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => UserSettings, settings => settings.user, { cascade: true })
  settings: UserSettings;

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[];

  @Column({ nullable: true })
  mfaSecret?: string;

  @Column({ default: false })
  isMfaEnabled: boolean;

  @Column({ nullable: true })
  mfaEnabledAt?: Date;

  @Column({ type: 'text', nullable: true })
  mfaRecoveryCodes: string;

  @Column({ type: 'boolean', default: false })
  mfaRequired: boolean;

  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt: Date;

  @Column({ type: 'integer', default: 0 })
  tokenVersion: number;
}
