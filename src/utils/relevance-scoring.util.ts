import { RecommendationConfig } from '../interfaces/recommendation.interface';

interface ScoringFactors {
  socialGraphFactor: number;
  interestSimilarity: number;
  activitySimilarity?: number;
  engagementRate?: number;
  recency: number;
}

/**
 * Calculate the relevance score for a recommendation
 */
export function calculateRelevanceScore(
  factors: ScoringFactors,
  config: RecommendationConfig
): number {
  // Ensure factors are between 0 and 1
  const normalizedFactors = {
    socialGraphFactor: Math.min(1, Math.max(0, factors.socialGraphFactor)),
    interestSimilarity: Math.min(1, Math.max(0, factors.interestSimilarity)),
    activitySimilarity: factors.activitySimilarity 
      ? Math.min(1, Math.max(0, factors.activitySimilarity))
      : 0,
    engagementRate: factors.engagementRate
      ? Math.min(1, Math.max(0, factors.engagementRate))
      : 0,
    recency: Math.min(1, Math.max(0, factors.recency)),
  };
  
  // Calculate weighted score