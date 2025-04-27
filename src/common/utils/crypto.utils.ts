import { ethers } from 'ethers';

export class CryptoUtils {
  static verifySignature(message: string, signature: string, address: string): boolean {
    try {
      const signer = ethers.utils.verifyMessage(message, signature);
      return signer.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }
}