// ENGAGEMENT METRICS SERVICE
// services/engagement-metrics.service.ts
import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Reaction } from "../entities/reaction.entity";
import { Comment } from "../entities/comment.entity";
import { CryptoTip } from "../entities/crypto-tip.entity";
import { CacheService } from "../../common/services/cache.service";

@Injectable()
export class EngagementMetricsService {
  constructor(
    @InjectRepository(Reaction)
    private reactionRepository: Repository<Reaction>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(CryptoTip)
    private cryptoTipRepository: Repository<CryptoTip>,
    private cacheService: CacheService
  ) {}

  private getMetricsCacheKey(contentId: string, contentType: string): string {
    return `engagement_metrics:${contentType}:${contentId}`;
  }

  async getMetrics(contentId: string, contentType: string): Promise<any> {
    const cacheKey = this.getMetricsCacheKey(contentId, contentType);

    // Try to get from cache first
    const cachedMetrics = await this.cacheService.get(cacheKey);
    if (cachedMetrics) {
      return JSON.parse(cachedMetrics);
    }

    // Calculate metrics
    const [reactionCounts, commentCount, tipStats] = await Promise.all([
      this.getReactionCounts(contentId, contentType),
      this.getCommentCount(contentId, contentType),
      this.getTipStats(contentId, contentType),
    ]);

    const metrics = {
      reactions: reactionCounts,
      comments: {
        count: commentCount,
      },
      tips: tipStats,
    };

    // Cache the result for 5 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(metrics), 300);

    return metrics;
  }

  private async getReactionCounts(
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

  private async getCommentCount(
    contentId: string,
    contentType: string
  ): Promise<number> {
    return this.commentRepository.count({
      where: {
        contentId,
        contentType,
        parentId: null, // Count only root comments
        isDeleted: false,
      },
    });
  }

  private async getTipStats(
    contentId: string,
    contentType: string
  ): Promise<any> {
    const tips = await this.cryptoTipRepository
      .createQueryBuilder("tip")
      .select("tip.tokenSymbol")
      .addSelect("COUNT(tip.id)", "count")
      .addSelect("SUM(tip.amount)", "total")
      .where("tip.contentId = :contentId", { contentId })
      .andWhere("tip.contentType = :contentType", { contentType })
      .andWhere("tip.isDeleted = false")
      .andWhere("tip.status = :status", { status: "confirmed" })
      .groupBy("tip.tokenSymbol")
      .getRawMany();

    const result: Record<string, { count: number; total: number }> = {};
    tips.forEach((t) => {
      result[t.tip_tokenSymbol] = {
        count: parseInt(t.count, 10),
        total: parseFloat(t.total),
      };
    });

    return result;
  }

  async incrementReactionCount(
    contentId: string,
    contentType: string,
    type: string
  ): Promise<void> {
    const cacheKey = this.getMetricsCacheKey(contentId, contentType);
    const cachedMetrics = await this.cacheService.get(cacheKey);

    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      if (!metrics.reactions[type]) {
        metrics.reactions[type] = 0;
      }
      metrics.reactions[type] += 1;

      await this.cacheService.set(cacheKey, JSON.stringify(metrics), 300);
    }
  }

  async decrementReactionCount(
    contentId: string,
    contentType: string,
    type: string
  ): Promise<void> {
    const cacheKey = this.getMetricsCacheKey(contentId, contentType);
    const cachedMetrics = await this.cacheService.get(cacheKey);

    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      if (metrics.reactions[type] && metrics.reactions[type] > 0) {
        metrics.reactions[type] -= 1;
      }

      await this.cacheService.set(cacheKey, JSON.stringify(metrics), 300);
    }
  }

  async incrementCommentCount(
    contentId: string,
    contentType: string
  ): Promise<void> {
    const cacheKey = this.getMetricsCacheKey(contentId, contentType);
    const cachedMetrics = await this.cacheService.get(cacheKey);

    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      metrics.comments.count += 1;

      await this.cacheService.set(cacheKey, JSON.stringify(metrics), 300);
    }
  }

  async decrementCommentCount(
    contentId: string,
    contentType: string
  ): Promise<void> {
    const cacheKey = this.getMetricsCacheKey(contentId, contentType);
    const cachedMetrics = await this.cacheService.get(cacheKey);

    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      if (metrics.comments.count > 0) {
        metrics.comments.count -= 1;
      }

      await this.cacheService.set(cacheKey, JSON.stringify(metrics), 300);
    }
  }

  async incrementTipCount(
    contentId: string,
    contentType: string,
    tokenSymbol: string,
    amount: number
  ): Promise<void> {
    const cacheKey = this.getMetricsCacheKey(contentId, contentType);
    const cachedMetrics = await this.cacheService.get(cacheKey);

    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      if (!metrics.tips[tokenSymbol]) {
        metrics.tips[tokenSymbol] = { count: 0, total: 0 };
      }

      metrics.tips[tokenSymbol].count += 1;
      metrics.tips[tokenSymbol].total += amount;

      await this.cacheService.set(cacheKey, JSON.stringify(metrics), 300);
    }
  }
}
