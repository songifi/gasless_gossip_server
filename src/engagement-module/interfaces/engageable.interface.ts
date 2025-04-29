// ENGAGEABLE INTERFACE
// interfaces/engageable.interface.ts
export interface Engageable {
    id: string;
    type: string;
    getOwner(): Promise<string>;
    canBeEngagedBy(userId: string): Promise<boolean>;
  }