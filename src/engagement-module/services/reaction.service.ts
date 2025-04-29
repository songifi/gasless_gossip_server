// REACTION SERVICE
// services/reaction.service.ts
import {
    Injectable,
    NotFoundException,
    ConflictException,
    Inject,
    forwardRef,
  } from "@nestjs/common";
  import { InjectRepository } from "@nestjs/typeorm";
  import { Repository } from "typeorm";
  import { Reaction } from "../entities/reaction.entity";
  import {
    CreateReactionDto,
    UpdateReactionDto,
    ReactionResponseDto,
  } from "../dto/reaction.dto";
  import { NotificationService } from "../../notification/services/notification.service";
  import { EngagementMetricsService } from "./engagement-metrics.service";
  import { User } from "../../user/entities/user.entity";
  
  @Injectable()
  export class ReactionService {
    constructor(
      @InjectRepository(Reaction)
      private reactionRepository: Repository<Reaction>,
      private notificationService: NotificationService,
      @Inject(forwardRef(() => EngagementMetricsService))
      private metricsService: EngagementMetricsService
    ) {}
  
    async create(
      userId: string,
      dto: CreateReactionDto
    ): Promise<ReactionResponseDto> {
      // Check if reaction already exists
      const existingReaction = await this.reactionRepository.findOne({
        where: {
          contentId: dto.contentId,
          contentType: dto.contentType,
          creatorId: userId,
          type: dto.type,
        },
      });
  
      if (existingReaction) {
        throw new ConflictException("Reaction already exists");
      }
  
      const reaction = this.reactionRepository.create({
        ...dto,
        creatorId: userId,
      });
  
      const savedReaction = await this.reactionRepository.save(reaction);
  
      // Update engagement metrics
      await this.metricsService.incrementReactionCount(
        dto.contentId,
        dto.contentType,
        dto.type
      );
  
      // Send notification to content owner
      await this.notifyContentOwner(
        userId,
        dto.contentId,
        dto.contentType,
        dto.type
      );
  
      return this.mapToResponseDto(savedReaction);
    }
  
    async findAll(
      contentId: string,
      contentType: string
    ): Promise<ReactionResponseDto[]> {
      const reactions = await this.reactionRepository.find({
        where: {
          contentId,
          contentType,
          isDeleted: false,
        },
        relations: ["creator"],
      });
  
      return reactions.map((reaction) => this.mapToResponseDto(reaction));
    }
  
    async getReactionsByType(
      contentId: string,
      contentType: string
    ): Promise<Record<string, number>> {
      const reactions = await this.reactionRepository
        .createQueryBuilder("reaction")
        .select("reaction.type")
        .addSelect("COUNT(reaction.id)", "count")
        .where("reaction.contentId = :contentId", { contentId })
        .andWhere("reaction.contentType = :contentType", { contentType })
        .andWhere("reaction.isDeleted = false")
        .groupBy("reaction.type")
        .getRawMany();
  
      const result: Record<string, number> = {};
      reactions.forEach((r) => {
        result[r.reaction_type] = parseInt(r.count, 10);
      });
  
      return result;
    }
  
    async findOne(id: string): Promise<ReactionResponseDto> {
      const reaction = await this.reactionRepository.findOne({
        where: { id, isDeleted: false },
        relations: ["creator"],
      });
  
      if (!reaction) {
        throw new NotFoundException("Reaction not found");
      }
  
      return this.mapToResponseDto(reaction);
    }
  
    async update(
      id: string,
      userId: string,
      dto: UpdateReactionDto
    ): Promise<ReactionResponseDto> {
      const reaction = await this.reactionRepository.findOne({
        where: { id, creatorId: userId, isDeleted: false },
      });
  
      if (!reaction) {
        throw new NotFoundException(
          "Reaction not found or you do not have permission"
        );
      }
  
      const previousType = reaction.type;
  
      Object.assign(reaction, dto);
      const updatedReaction = await this.reactionRepository.save(reaction);
  
      // Update metrics if reaction type changed
      if (previousType !== dto.type && dto.type) {
        await this.metricsService.decrementReactionCount(
          reaction.contentId,
          reaction.contentType,
          previousType
        );
        await this.metricsService.incrementReactionCount(
          reaction.contentId,
          reaction.contentType,
          dto.type
        );
      }
  
      return this.mapToResponseDto(updatedReaction);
    }
  
    async remove(id: string, userId: string): Promise<void> {
      const reaction = await this.reactionRepository.findOne({
        where: { id, creatorId: userId, isDeleted: false },
      });
  
      if (!reaction) {
        throw new NotFoundException(
          "Reaction not found or you do not have permission"
        );
      }
  
      // Soft delete
      reaction.isDeleted = true;
      await this.reactionRepository.save(reaction);
  
      // Update metrics
      await this.metricsService.decrementReactionCount(
        reaction.contentId,
        reaction.contentType,
        reaction.type
      );
    }
  
    async hasUserReacted(
      userId: string,
      contentId: string,
      contentType: string,
      type?: string
    ): Promise<boolean> {
      const query = this.reactionRepository
        .createQueryBuilder("reaction")
        .where("reaction.contentId = :contentId", { contentId })
        .andWhere("reaction.contentType = :contentType", { contentType })
        .andWhere("reaction.creatorId = :userId", { userId })
        .andWhere("reaction.isDeleted = false");
  
      if (type) {
        query.andWhere("reaction.type = :type", { type });
      }
  
      const count = await query.getCount();
      return count > 0;
    }
  
    private async notifyContentOwner(
      reactorId: string,
      contentId: string,
      contentType: string,
      reactionType: string
    ): Promise<void> {
      try {
        // Get content owner id based on content type
        const ownerId = await this.getContentOwnerId(contentId, contentType);
  
        if (ownerId && ownerId !== reactorId) {
          await this.notificationService.create({
            type: "reaction",
            recipientId: ownerId,
            senderId: reactorId,
            contentId,
            contentType,
            metadata: { reactionType },
          });
        }
      } catch (error) {
        // Log error but don't fail the reaction creation
        console.error("Failed to send reaction notification:", error);
      }
    }
  
    private async getContentOwnerId(
      contentId: string,
      contentType: string
    ): Promise<string | null> {
      // This would need to be implemented based on your content structure
      // For example, it might query a post repository, comment repository, etc.
  
      // Placeholder implementation:
      if (contentType === "comment") {
        const comment = await this.reactionRepository.manager
          .getRepository("comments")
          .findOne({ where: { id: contentId } });
        return comment?.creatorId;
      } else if (contentType === "post") {
        const post = await this.reactionRepository.manager
          .getRepository("posts")
          .findOne({ where: { id: contentId } });
        return post?.authorId;
      }
  
      return null;
    }
  
    private mapToResponseDto(reaction: Reaction): ReactionResponseDto {
      return {
        id: reaction.id,
        contentId: reaction.contentId,
        contentType: reaction.contentType,
        creatorId: reaction.creatorId,
        type: reaction.type,
        metadata: reaction.metadata,
        createdAt: reaction.createdAt,
        updatedAt: reaction.updatedAt,
      };
    }
  }
  