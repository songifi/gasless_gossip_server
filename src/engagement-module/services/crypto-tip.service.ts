// CRYPTO TIP SERVICE
// services/crypto-tip.service.ts
import {
    Injectable,
    NotFoundException,
    BadRequestException,
  } from "@nestjs/common";
  import { InjectRepository } from "@nestjs/typeorm";
  import { Repository } from "typeorm";
  import { CryptoTip } from "../entities/crypto-tip.entity";
  import {
    CreateCryptoTipDto,
    CryptoTipResponseDto,
  } from "../dto/crypto-tip.dto";
  import { NotificationService } from "../../notification/services/notification.service";
  import { TransactionService } from "../../transaction/services/transaction.service";
  import { EngagementMetricsService } from "./engagement-metrics.service";
  import { User } from "../../user/entities/user.entity";
  
  @Injectable()
  export class CryptoTipService {
    constructor(
      @InjectRepository(CryptoTip)
      private cryptoTipRepository: Repository<CryptoTip>,
      private transactionService: TransactionService,
      private notificationService: NotificationService,
      private metricsService: EngagementMetricsService
    ) {}
  
    async create(
      userId: string,
      dto: CreateCryptoTipDto
    ): Promise<CryptoTipResponseDto> {
      // Verify user has enough balance
      const hasBalance = await this.transactionService.verifyBalance(
        userId,
        dto.tokenSymbol,
        dto.amount
      );
  
      if (!hasBalance) {
        throw new BadRequestException("Insufficient balance");
      }
  
      // Create transaction
      const transaction = await this.transactionService.createTransaction({
        senderId: userId,
        receiverId: await this.getContentOwnerId(dto.contentId, dto.contentType),
        amount: dto.amount,
        tokenSymbol: dto.tokenSymbol,
        purpose: "tip",
        metadata: {
          contentId: dto.contentId,
          contentType: dto.contentType,
          ...dto.metadata,
        },
      });
  
      // Create crypto tip record
      const cryptoTip = this.cryptoTipRepository.create({
        ...dto,
        creatorId: userId,
        transactionId: transaction.id,
        status: transaction.status,
      });
  
      const savedTip = await this.cryptoTipRepository.save(cryptoTip);
  
      // Update metrics
      await this.metricsService.incrementTipCount(
        dto.contentId,
        dto.contentType,
        dto.tokenSymbol,
        dto.amount
      );
  
      // Send notification
      await this.sendTipNotification(savedTip, userId);
  
      return this.mapToResponseDto(savedTip);
    }
  
    async findAll(
      contentId: string,
      contentType: string
    ): Promise<CryptoTipResponseDto[]> {
      const tips = await this.cryptoTipRepository.find({
        where: {
          contentId,
          contentType,
          isDeleted: false,
        },
        relations: ["creator"],
        order: { createdAt: "DESC" },
      });
  
      return tips.map((tip) => this.mapToResponseDto(tip));
    }
  
    async findOne(id: string): Promise<CryptoTipResponseDto> {
      const tip = await this.cryptoTipRepository.findOne({
        where: { id, isDeleted: false },
        relations: ["creator"],
      });
  
      if (!tip) {
        throw new NotFoundException("Tip not found");
      }
  
      return this.mapToResponseDto(tip);
    }
  
    async findByUser(
      userId: string,
      limit = 10,
      offset = 0
    ): Promise<CryptoTipResponseDto[]> {
      const tips = await this.cryptoTipRepository.find({
        where: { creatorId: userId, isDeleted: false },
        relations: ["creator"],
        order: { createdAt: "DESC" },
        take: limit,
        skip: offset,
      });
  
      return tips.map((tip) => this.mapToResponseDto(tip));
    }
  
    async updateStatus(
      transactionId: string,
      status: "pending" | "confirmed" | "failed"
    ): Promise<void> {
      await this.cryptoTipRepository.update({ transactionId }, { status });
    }
  
    private async sendTipNotification(
      tip: CryptoTip,
      senderId: string
    ): Promise<void> {
      try {
        const recipientId = await this.getContentOwnerId(
          tip.contentId,
          tip.contentType
        );
  
        if (recipientId && recipientId !== senderId) {
          await this.notificationService.create({
            type: "crypto_tip",
            recipientId,
            senderId,
            contentId: tip.contentId,
            contentType: tip.contentType,
            metadata: {
              amount: tip.amount,
              tokenSymbol: tip.tokenSymbol,
              transactionId: tip.transactionId,
            },
          });
        }
      } catch (error) {
        console.error("Failed to send tip notification:", error);
      }
    }
  
    private async getContentOwnerId(
      contentId: string,
      contentType: string
    ): Promise<string | null> {
      // Similar to the implementation in ReactionService
      if (contentType === "comment") {
        const comment = await this.cryptoTipRepository.manager
          .getRepository("comments")
          .findOne({ where: { id: contentId } });
        return comment?.creatorId;
      } else if (contentType === "post") {
        const post = await this.cryptoTipRepository.manager
          .getRepository("posts")
          .findOne({ where: { id: contentId } });
        return post?.authorId;
      }
  
      return null;
    }
  
    private mapToResponseDto(tip: CryptoTip): CryptoTipResponseDto {
      return {
        id: tip.id,
        contentId: tip.contentId,
        contentType: tip.contentType,
        creatorId: tip.creatorId,
        amount: tip.amount,
        tokenSymbol: tip.tokenSymbol,
        transactionId: tip.transactionId,
        status: tip.status,
        metadata: tip.metadata,
        createdAt: tip.createdAt,
        updatedAt: tip.updatedAt,
        creator: {
          id: tip.creator?.id,
          username: tip.creator?.username,
          avatar: tip.creator?.avatar,
        },
      };
    }
  }
  