// COMMENT SERVICE
// services/comment.service.ts
import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Inject,
    forwardRef,
  } from "@nestjs/common";
  import { InjectRepository } from "@nestjs/typeorm";
  import { Repository, getManager } from "typeorm";
  import { Comment } from "../entities/comment.entity";
  import {
    CreateCommentDto,
    UpdateCommentDto,
    CommentResponseDto,
    CommentPaginationDto,
  } from "../dto/comment.dto";
  import { NotificationService } from "../../notification/services/notification.service";
  import { EngagementMetricsService } from "./engagement-metrics.service";
  import { User } from "../../user/entities/user.entity";
  import { MentionDetector } from "../interfaces/mention-detector.interface";
  
  @Injectable()
  export class CommentService implements MentionDetector {
    constructor(
      @InjectRepository(Comment)
      private commentRepository: Repository<Comment>,
      private notificationService: NotificationService,
      @Inject(forwardRef(() => EngagementMetricsService))
      private metricsService: EngagementMetricsService
    ) {}
  
    detectMentions(content: string): string[] {
      // Extract mentions in format @username
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const matches = content.match(mentionRegex) || [];
  
      // Strip @ symbol and return unique usernames
      return [...new Set(matches.map((match) => match.substring(1)))];
    }
  
    formatMentions(content: string, mentions: string[]): string {
      // This would be enhanced in a real app to format mentions as links or styled text
      return content;
    }
  
    async create(
      userId: string,
      dto: CreateCommentDto
    ): Promise<CommentResponseDto> {
      const comment = this.commentRepository.create({
        ...dto,
        creatorId: userId,
      });
  
      // Detect mentions
      const mentions = this.detectMentions(dto.content);
      comment.mentions = mentions.length > 0 ? mentions : null;
  
      // If it's a reply, validate parent and set rootId
      if (dto.parentId) {
        const parentComment = await this.commentRepository.findOne({
          where: { id: dto.parentId, isDeleted: false },
        });
  
        if (!parentComment) {
          throw new NotFoundException("Parent comment not found");
        }
  
        // Set root ID for thread hierarchy
        comment.rootId = parentComment.rootId || parentComment.id;
  
        // Update reply count on parent
        await this.commentRepository.increment(
          { id: dto.parentId },
          "replyCount",
          1
        );
      }
  
      const savedComment = await this.commentRepository.save(comment);
  
      // Update content engagement metrics
      await this.metricsService.incrementCommentCount(
        dto.contentId,
        dto.contentType
      );
  
      // Send notifications
      await this.sendCommentNotifications(savedComment, userId);
  
      return this.mapToResponseDto(savedComment);
    }
  
    async findAll(
      params: CommentPaginationDto
    ): Promise<{
      comments: CommentResponseDto[];
      total: number;
      page: number;
      limit: number;
    }> {
      const {
        contentId,
        contentType,
        parentId,
        page = 1,
        limit = 10,
        orderBy = "createdAt",
        order = "DESC",
      } = params;
  
      const query = this.commentRepository
        .createQueryBuilder("comment")
        .leftJoinAndSelect("comment.creator", "creator")
        .where("comment.contentId = :contentId", { contentId })
        .andWhere("comment.contentType = :contentType", { contentType })
        .andWhere("comment.isDeleted = false");
  
      if (parentId) {
        // Get replies to a specific comment
        query.andWhere("comment.parentId = :parentId", { parentId });
      } else {
        // Get only root comments
        query.andWhere("comment.parentId IS NULL");
      }
  
      // Add ordering
      if (orderBy && ["createdAt", "updatedAt", "replyCount"].includes(orderBy)) {
        query.orderBy(`comment.${orderBy}`, order);
      }
  
      // Add pagination
      const skip = (page - 1) * limit;
      query.skip(skip).take(limit);
  
      const [comments, total] = await query.getManyAndCount();
  
      const commentDtos = comments.map((comment) =>
        this.mapToResponseDto(comment)
      );
  
      return {
        comments: commentDtos,
        total,
        page,
        limit,
      };
    }
  
    async getThreadedComments(
      rootId: string,
      page = 1,
      limit = 10
    ): Promise<CommentResponseDto> {
      // First, get the root comment
      const rootComment = await this.commentRepository.findOne({
        where: { id: rootId, isDeleted: false },
        relations: ["creator"],
      });
  
      if (!rootComment) {
        throw new NotFoundException("Comment not found");
      }
  
      // Then get the replies tree with pagination
      const replies = await this.commentRepository
        .createQueryBuilder("comment")
        .leftJoinAndSelect("comment.creator", "creator")
        .where("comment.rootId = :rootId", { rootId })
        .andWhere("comment.id != :rootId", { rootId }) // Exclude the root comment itself
        .andWhere("comment.isDeleted = false")
        .orderBy("comment.createdAt", "ASC")
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
  
      // Build the hierarchical structure
      const replyMap: Record<string, CommentResponseDto> = {};
  
      // First pass: convert all comments to DTOs and store in map
      const rootDto = this.mapToResponseDto(rootComment);
      rootDto.replies = [];
  
      replies.forEach((reply) => {
        const replyDto = this.mapToResponseDto(reply);
        replyDto.replies = [];
        replyMap[reply.id] = replyDto;
      });
  
      // Second pass: build the hierarchy
      replies.forEach((reply) => {
        if (reply.parentId === rootId) {
          // Direct child of root
          rootDto.replies.push(replyMap[reply.id]);
        } else if (replyMap[reply.parentId]) {
          // Child of another reply
          if (!replyMap[reply.parentId].replies) {
            replyMap[reply.parentId].replies = [];
          }
          replyMap[reply.parentId].replies.push(replyMap[reply.id]);
        }
      });
  
      return rootDto;
    }
  
    async findOne(id: string): Promise<CommentResponseDto> {
      const comment = await this.commentRepository.findOne({
        where: { id, isDeleted: false },
        relations: ["creator"],
      });
  
      if (!comment) {
        throw new NotFoundException("Comment not found");
      }
  
      return this.mapToResponseDto(comment);
    }
  
    async update(
      id: string,
      userId: string,
      dto: UpdateCommentDto
    ): Promise<CommentResponseDto> {
      const comment = await this.commentRepository.findOne({
        where: { id, creatorId: userId, isDeleted: false },
        relations: ["creator"],
      });
  
      if (!comment) {
        throw new NotFoundException(
          "Comment not found or you do not have permission"
        );
      }
  
      // Detect new mentions
      const newMentions = this.detectMentions(dto.content);
      const oldMentions = comment.mentions || [];
  
      // Find newly added mentions for notifications
      const addedMentions = newMentions.filter(
        (mention) => !oldMentions.includes(mention)
      );
  
      // Update the comment
      comment.content = dto.content;
      comment.mentions = newMentions.length > 0 ? newMentions : null;
  
      const updatedComment = await this.commentRepository.save(comment);
  
      // Send notifications for new mentions
      await this.sendMentionNotifications(updatedComment, userId, addedMentions);
  
      return this.mapToResponseDto(updatedComment);
    }
  
    async remove(id: string, userId: string): Promise<void> {
      const comment = await this.commentRepository.findOne({
        where: { id, creatorId: userId, isDeleted: false },
      });
  
      if (!comment) {
        throw new NotFoundException(
          "Comment not found or you do not have permission"
        );
      }
  
      // Soft delete
      comment.isDeleted = true;
      await this.commentRepository.save(comment);
  
      // Update metrics
      await this.metricsService.decrementCommentCount(
        comment.contentId,
        comment.contentType
      );
  
      // If it has a parent, decrement parent's reply count
      if (comment.parentId) {
        await this.commentRepository.decrement(
          { id: comment.parentId },
          "replyCount",
          1
        );
      }
    }
  
    private async sendCommentNotifications(
      comment: Comment,
      senderId: string
    ): Promise<void> {
      try {
        // Notify content owner
        const ownerId = await this.getContentOwnerId(
          comment.contentId,
          comment.contentType
        );
  
        if (ownerId && ownerId !== senderId) {
          await this.notificationService.create({
            type: "comment",
            recipientId: ownerId,
            senderId,
            contentId: comment.contentId,
            contentType: comment.contentType,
            metadata: { commentId: comment.id },
          });
        }
  
        // Notify parent comment owner if it's a reply
        if (comment.parentId) {
          const parentComment = await this.commentRepository.findOne({
            where: { id: comment.parentId },
          });
  
          if (
            parentComment &&
            parentComment.creatorId !== senderId &&
            parentComment.creatorId !== ownerId
          ) {
            await this.notificationService.create({
              type: "reply",
              recipientId: parentComment.creatorId,
              senderId,
              contentId: comment.id,
              contentType: "comment",
              metadata: {
                rootContentId: comment.contentId,
                rootContentType: comment.contentType,
              },
            });
          }
        }
  
        // Notify mentioned users
        if (comment.mentions?.length) {
          await this.sendMentionNotifications(
            comment,
            senderId,
            comment.mentions
          );
        }
      } catch (error) {
        // Log error but don't fail the comment creation
        console.error("Failed to send comment notifications:", error);
      }
    }
  
    private async sendMentionNotifications(
      comment: Comment,
      senderId: string,
      mentions: string[]
    ): Promise<void> {
      try {
        // Get user IDs from usernames
        const users = await this.commentRepository.manager
          .getRepository(User)
          .createQueryBuilder("user")
          .where("user.username IN (:...usernames)", { usernames: mentions })
          .getMany();
  
        for (const user of users) {
          // Don't notify the sender
          if (user.id === senderId) continue;
  
          await this.notificationService.create({
            type: "mention",
            recipientId: user.id,
            senderId,
            contentId: comment.id,
            contentType: "comment",
            metadata: {
              rootContentId: comment.contentId,
              rootContentType: comment.contentType,
            },
          });
        }
      } catch (error) {
        console.error("Failed to send mention notifications:", error);
      }
    }
  
    private async getContentOwnerId(
      contentId: string,
      contentType: string
    ): Promise<string | null> {
      // Similar to the implementation in ReactionService
      if (contentType === "comment") {
        const comment = await this.commentRepository.findOne({
          where: { id: contentId },
        });
        return comment?.creatorId;
      } else if (contentType === "post") {
        const post = await this.commentRepository.manager
          .getRepository("posts")
          .findOne({ where: { id: contentId } });
        return post?.authorId;
      }
  
      return null;
    }
  
    private mapToResponseDto(comment: Comment): CommentResponseDto {
      return {
        id: comment.id,
        content: comment.content,
        contentId: comment.contentId,
        contentType: comment.contentType,
        creatorId: comment.creatorId,
        parentId: comment.parentId,
        rootId: comment.rootId,
        mentions: comment.mentions,
        replyCount: comment.replyCount,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        creator: {
          id: comment.creator?.id,
          username: comment.creator?.username,
          avatar: comment.creator?.avatar,
        },
        replies: [],
      };
    }
  }
  