// CRYPTO TIP ENTITY
// entities/crypto-tip.entity.ts
import { Entity, Column, Index } from "typeorm";
import { BaseEngagement } from "./base-engagement.entity";

@Entity("crypto_tips")
export class CryptoTip extends BaseEngagement {
  @Column("decimal", { precision: 18, scale: 8 })
  amount: number;

  @Column()
  tokenSymbol: string; // ETH, BTC, etc.

  @Column()
  @Index()
  transactionId: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>; // For additional transaction data

  @Column({ default: "pending" })
  status: "pending" | "confirmed" | "failed";
}
