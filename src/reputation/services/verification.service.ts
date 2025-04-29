import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Verification } from '../entities/verification.entity';
import { Reputation } from '../entities/reputation.entity';
import { VerificationProvider, VerificationResult } from '../interfaces/verification-provider.interface';
import { BlockchainVerificationUtil } from '../utils/blockchain-verification.util';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly providers: Map<string, VerificationProvider> = new Map();

  constructor(
    @InjectRepository(Verification)
    private verificationRepository: Repository<Verification>,
    @InjectRepository(Reputation)
    private reputationRepository: Repository<Reputation>,
    private blockchainVerification: BlockchainVerificationUtil,
  ) {
    // Register verification providers
    this.registerProvider('blockchain', this.blockchainVerification);
  }

  registerProvider(name: string, provider: VerificationProvider): void {
    this.providers.set(name, provider);
  }

  async initiateVerification(userId: string, type: string, metadata: any): Promise<Verification> {
    const reputation = await this.reputationRepository.findOne({ where: { userId } });
    if (!reputation) {
      throw new Error(`User ${userId} does not have a reputation profile`);
    }

    // Check if verification already exists
    const existingVerification = await this.verificationRepository.findOne({
      where: {
        reputationId: reputation.id,
        type,
      },
    });

    if (existingVerification && ['VERIFIED', 'PENDING'].includes(existingVerification.status)) {
      return existingVerification;
    }

    const verification = this.verificationRepository.create({
      reputationId: reputation.id,
      type,
      status: 'PENDING',
      metadata,
    });

    return this.verificationRepository.save(verification);
  }

  async processVerification(verificationId: string): Promise<Verification> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
      relations: ['reputation'],
    });

    if (!verification) {
      throw new Error(`Verification ${verificationId} not found`);
    }

    const provider = this.providers.get(verification.type);
    if (!provider) {
      throw new Error(`No provider registered for verification type ${verification.type}`);
    }

    try {
      const result = await provider.verify(
        verification.reputation.userId,
        verification.metadata,
      );

      if (result.success) {
        verification.status = 'VERIFIED';
        verification.verificationProof = result.proof;
        
        // Store proof on blockchain if needed
        if (verification.type === 'blockchain') {
          const blockchainRef = await provider.storeProof(
            verification.reputation.userId,
            result.proof,
          );
          verification.blockchainReference = blockchainRef;
        }

        // Update user reputation verification status
        verification.reputation.isVerified = true;
        await this.reputationRepository.save(verification.reputation);
      } else {
        verification.status = 'REJECTED';
        verification.metadata = {
          ...verification.metadata,
          rejectionReason: result.reason,
        };
      }
    } catch (error) {
      this.logger.error(`Verification process failed: ${error.message}`, error.stack);
      verification.status = 'FAILED';
      verification.metadata = {
        ...verification.metadata,
        error: error.message,
      };
    }

    return this.verificationRepository.save(verification);
  }

  async getVerificationsByUserId(userId: string): Promise<Verification[]> {
    const reputation = await this.reputationRepository.findOne({ where: { userId } });
    if (!reputation) {
      return [];
    }

    return this.verificationRepository.find({
      where: { reputationId: reputation.id },
    });
  }
}
