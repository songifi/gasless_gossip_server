import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany,
  } from 'typeorm';
import { ChatRoomMember } from './chat-room-member.entity';
  
  export enum RoomType {
    DIRECT = 'DIRECT',
    GROUP = 'GROUP',
  }
  
  @Entity('chat_rooms')
  export class ChatRoom {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    name: string;
  
    @Column({ nullable: true })
    description?: string;
  
    @Column({ type: 'enum', enum: RoomType })
    type: RoomType;
  
    @Column({ default: false })
    isPrivate: boolean;
  
    @OneToMany(() => ChatRoomMember, (member) => member.room, { cascade: true })
    members: ChatRoomMember[];
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @DeleteDateColumn()
    deletedAt?: Date;
  }
  