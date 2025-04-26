import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
  } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { RoomRole } from '../chat-room. interfaces/chat-room-role.enum';
  
  @Entity('chat_room_members')
  export class ChatRoomMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    userId: string;
  
    @Column({ type: 'enum', enum: RoomRole, default: RoomRole.MEMBER })
    role: RoomRole;
  
    @ManyToOne(() => ChatRoom, (room) => room.members, { onDelete: 'CASCADE' })
    room: ChatRoom;
  
    @CreateDateColumn()
    joinedAt: Date;
  }
  