// COMMENT ENTITY
// entities/comment.entity.ts
import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Index,
  } from "typeorm";
  import { BaseEngagement } from "./base-engagement.entity";
  
  @Entity("comments")
  export class Comment extends BaseEngagement {
    @Column("text")
    content: string;
  
    @Column({ nullable: true })
    @Index()
    parentId: string;
  
    @ManyToOne(() => Comment, (comment) => comment.replies, {
      onDelete: "CASCADE",
    })
    @JoinColumn({ name: "parentId" })
    parent: Comment;
  
    @OneToMany(() => Comment, (comment) => comment.parent)
    replies: Comment[];
  
    @Column("simple-array", { nullable: true })
    mentions: string[];
  
    @Column({ type: "int", default: 0 })
    replyCount: number;
  
    @Column({ nullable: true })
    @Index()
    rootId: string; // For direct access to thread root
  }
  