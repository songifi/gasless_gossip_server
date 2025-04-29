export interface VerificationProvider {
    name: string;
    verify(userId: string, metadata: any): Promise<VerificationResult>;
    storeProof(userId: string, proof: string): Promise<string>;
  }
  
  export interface VerificationResult {
    success: boolean;
    proof?: string;
    metadata?: any;
    reason?: string;
  }