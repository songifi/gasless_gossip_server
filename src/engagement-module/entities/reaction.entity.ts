// REACTION ENTITY
// entities/reaction.entity.ts
import { Entity, Column, Index } from "typeorm";
import { BaseEngagement } from "./base-engagement.entity";

@Entity("reactions")
@Index(["contentId", "contentType", "creatorId", "type"], { unique: true })
export class Reaction extends BaseEngagement {
  @Column()
  type: string; // emoji code, like, etc.

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>; // For additional reaction data
}
