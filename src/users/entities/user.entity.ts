// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Role } from '../enums/role.enum';
import { Exclude } from 'class-transformer';
import { UserSettings } from './user-settings.entity';
import { OneToOne as TypeOrmOneToOne } from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';

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
    default: Role.USER
  })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  @OneToOne(() => UserSettings, settings => settings.user, { cascade: true })
settings: UserSettings;

}
// Removed duplicate implementation of OneToOne

// Removed conflicting local declaration of OneToOne
