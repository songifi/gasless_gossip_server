// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../enums/role.enum';
import { Exclude } from 'class-transformer';
import { UserSettings } from './user-settings.entity';
import { OneToOne as TypeOrmOneToOne } from 'typeorm';
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
function OneToOne(
  relatedEntity: () => Function,
  inverseSide: (object: any) => any,
  options: { cascade: boolean }
): PropertyDecorator {
  return TypeOrmOneToOne(relatedEntity, inverseSide, options);
}

function OneToOne(arg0: () => typeof UserSettings, arg1: (settings: any) => any, arg2: { cascade: boolean; }): (target: User, propertyKey: "settings") => void {
  throw new Error('Function not implemented.');
}
