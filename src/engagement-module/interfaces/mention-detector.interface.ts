// MENTION DETECTOR INTERFACE
// interfaces/mention-detector.interface.ts
export interface MentionDetector {
    detectMentions(content: string): string[];
    formatMentions(content: string, mentions: string[]): string;
  }