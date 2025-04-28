
export class TransactionPreviewDto {
     amount: string;
     tokenType: 'ERC20' | 'ERC721' | 'ERC1155';
     tokenId?: string;
     tokenAddress?: string;
     recipient: string;
     estimatedFee: string;
   }
   