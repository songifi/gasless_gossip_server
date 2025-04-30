// src/tests/crypto.service.spec.ts
import { Test } from '@nestjs/testing';
import { CryptoService } from '../services/crypto.service';

describe('CryptoService', () => {
  let cryptoService: CryptoService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    cryptoService = moduleRef.get<CryptoService>(CryptoService);
  });

  it('should encrypt and decrypt data correctly', () => {
    const originalText = 'This is a secret message';
    const key = cryptoService.generateSymmetricKey();
    
    const { encryptedData, iv } = cryptoService.encryptWithSymmetricKey(originalText, key);
    const decryptedText = cryptoService.decryptWithSymmetricKey(encryptedData, iv, key);
    
    expect(decryptedText).toBe(originalText);
  });

  it('should derive the same key from the same public keys', () => {
    const publicKeyA = 'public-key-a';
    const publicKeyB = 'public-key-b';
    
    const keyAB = cryptoService.deriveSharedKey(publicKeyA, publicKeyB);
    const keyBA = cryptoService.deriveSharedKey(publicKeyB, publicKeyA);
    
    // Keys should be identical regardless of the order of public keys
    expect(keyAB.toString('hex')).toBe(keyBA.toString('hex'));
  });
});