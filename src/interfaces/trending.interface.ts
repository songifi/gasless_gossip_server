export interface TrendingTopicData {
    topic: string;
    score: number;
    mentionCount: number;
    engagementCount: number;
    relatedTopics: Record<string, number>;
    relevantHashtags: string[];
  }
  
  export interface TrendingTimeframe {
    hours: number;
    decayFactor: number;
  }
  