// src/activity/interfaces/feed-options.interface.ts
export interface FeedOptions {
    limit?: number;
    cursor?: string;
    includeRead?: boolean;
    types?: ActivityType[];
  }