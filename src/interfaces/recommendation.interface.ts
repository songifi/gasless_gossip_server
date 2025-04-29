import { RecommendationType } from '../entities/recommendation.entity';

export interface RecommendationConfig {
  socialGraphWeight: number;
  interestSimilarityWeight: number;
  activitySimilarityWeight: number;
  engagementWeight: number;
  recencyFactor: number;
}

export interface RecommendationCandidate {
  targetId: string;
  type: RecommendationType;
  score: number;
  metadata: Record<string, any>;
  reasons: RecommendationReason[];
}

export interface RecommendationReason {
  type: string;
  description: string;
  weight: number;
}
