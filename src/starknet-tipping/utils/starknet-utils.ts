import { Provider, Contract, Account, cairo, stark, constants } from 'starknet';

// ABI for a standard ERC-20 token contract
export const TOKEN_ABI = [
  {
    members: [
      {
        name: 'low',
        offset: 0,
        type: 'felt',
      },
      {
        name: 'high',
        offset: 1,
        type: 'felt',
      },
    ],
    name: 'Uint256',
    size: 2,
    type: 'struct',
  },
  {
    inputs: [
      {
        name: 'sender',
        type: 'felt',
      },
      {
        name: 'recipient',
        type: 'felt',
      },
      {
        name: 'amount',
        type: 'Uint256',
      },
    ],
    name: 'transfer_from',
    outputs: [
      {
        name: 'success',
        type: 'felt',
      },
    ],
    type: 'function',
  },
  {
    inputs: [
      {
        name: 'account',
        type: 'felt',
      },
    ],
    name: 'balance_of',
    outputs: [
      {
        name: 'balance',
        type: 'Uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        name: 'owner',
        type: 'felt',
      },
      {
        name: 'spender',
        type: 'felt',
      },
    ],
    name: 'allowance',
    outputs: [
      {
        name: 'allowance',
        type: 'Uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        name: 'spender',
        type: 'felt',
      },
      {
        name: 'amount',
        type: 'Uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        name: 'success',
        type: 'felt',
      },
    ],
    type: 'function',
  },
];

export class StarknetUtils {
  private provider: Provider;
  private account: Account;

  constructor(providerUrl: string, accountAddress: string, privateKey: string) {
    this.provider = new Provider({ sequencer: { baseUrl: providerUrl } });
    this.account = new Account(this.provider, accountAddress, privateKey);
  }

  async getTokenContract(tokenAddress: string): Promise<Contract> {
    return new Contract(TOKEN_ABI, tokenAddress, this.provider);
  }

  async estimateFee(
    tokenAddress: string,
    senderAddress: string,
    recipientAddress: string,
    amount: number,
  ): Promise<bigint> {
    const tokenContract = await this.getTokenContract(tokenAddress);
    const amountUint256 = cairo.uint256(amount.toString());

    const { suggestedMaxFee } = await this.account.estimateInvokeFee({
      contractAddress: tokenAddress,
      entrypoint: 'transfer_from',
      calldata: stark.compileCalldata({
        sender: senderAddress,
        recipient: recipientAddress,
        amount: amountUint256,
      }),
    });

    return suggestedMaxFee;
  }

  async verifySignature(
    senderAddress: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    try {
      // This is a simplified version. In production, you'd need to verify the signature
      // properly according to Starknet's signature format
      const messageHash = stark.keccakBn(message);
      const starkKeyPub = BigInt(senderAddress);
      return stark.verifySignature(messageHash, signature, starkKeyPub);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  async executeTip(
    tokenAddress: string,
    senderAddress: string,
    recipientAddress: string,
    amount: number,
  ): Promise<string> {
    const amountUint256 = cairo.uint256(amount.toString());

    const { transaction_hash } = await this.account.execute({
      contractAddress: tokenAddress,
      entrypoint: 'transfer_from',
      calldata: stark.compileCalldata({
        sender: senderAddress,
        recipient: recipientAddress,
        amount: amountUint256,
      }),
    });

    return transaction_hash;
  }

  async getTransactionStatus(transactionHash: string): Promise<TransactionStatus> {
    try {
      const txReceipt = await this.provider.getTransactionReceipt(transactionHash);
      
      if (txReceipt.status === 'ACCEPTED_ON_L2') {
        return TransactionStatus.ACCEPTED_ON_L2;
      } else if (txReceipt.status === 'ACCEPTED_ON_L1') {
        return TransactionStatus.ACCEPTED;
      } else if (txReceipt.status === 'PENDING') {
        return TransactionStatus.PENDING;
      } else if (txReceipt.status === 'REJECTED') {
        return TransactionStatus.REJECTED;
      } else {
        return TransactionStatus.FAILED;
      }
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return TransactionStatus.FAILED;
    }
  }
}
