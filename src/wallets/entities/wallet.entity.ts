import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Wallet {
  @Column({ primary: true, generated: 'uuid' })
  id: string;

  @Index()
  @Column({ unique: true })
  address: string;

  @ManyToOne(() => User)
  @Index()
  user: User;

  @Column({ default: false })
  primary: boolean;

  @Column({ nullable: true })
  label: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 'pending' })
  status: string;
}