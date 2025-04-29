export interface ReputationFactor {
    name: string;
    weight: number;
    calculate(userId: string): Promise<number>;
    normalize(score: number): number;
  }
  