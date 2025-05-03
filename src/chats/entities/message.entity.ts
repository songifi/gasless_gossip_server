import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Room } from './room.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column()
  userId: string;

  @Column()
  username: string;

  @ManyToOne(() => Room, room => room.messages)
  room: Room;

  @Column()
  roomId: string;

  @Column({ default: 'text' })
  type: string;

  @CreateDateColumn()
  createdAt: Date;
}
