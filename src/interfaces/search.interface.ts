import { SearchType } from '../dto/search.dto';

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  type: SearchType;
}

export interface SearchOptions {
  limit: number;
  offset: number;
  interests?: string[];
  nearLocation?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}
