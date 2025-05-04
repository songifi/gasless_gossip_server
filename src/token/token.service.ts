import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface TokenTransferJob {
  fromUserId: string;
  toUserId: string;
  amount: number;
  tokenId: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class TokenService {
  constructor(
    @InjectQueue('token') private readonly tokenQueue: Queue<TokenTransferJob>,
  ) {}

  async initiateTransfer(transferData: TokenTransferJob): Promise<{ jobId: string }> {
    const job = await this.tokenQueue.add('transfer', transferData, {
      priority: 1, // High priority
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    return { jobId: job.id.toString() };
  }

  async checkTransferStatus(jobId: string): Promise<any> {
    const job = await this.tokenQueue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }
    
    const state = await job.getState();
    return {
      id: job.id,
      status: state,
      progress: job.progress(),
      data: job.data,
      failedReason: job.failedReason,
    };
  }
}
