// src/chat/utils/command-parser.ts

export interface ParsedTransferCommand {
     amount: string;
     tokenType: 'ERC20' | 'ERC721' | 'ERC1155';
     tokenAddress?: string;
     tokenId?: string;
     recipient: string;
   }
   
   export function parseTransferCommand(message: string): ParsedTransferCommand | null {
     const regexERC20 = /\/send\s+([\d.]+)\s+([A-Za-z0-9]+)\s+to\s+(0x[a-fA-F0-9]{40})/;
     const regexERC721 = /\/send\s+([\d.]+)\s+NFT\s+(\d+)\s+to\s+(0x[a-fA-F0-9]{40})/;
   
     if (regexERC721.test(message)) {
       const [, amount, tokenId, recipient] = message.match(regexERC721)!;
       return {
         amount,
         tokenType: 'ERC721',
         tokenId,
         recipient,
       };
     }
   
     if (regexERC20.test(message)) {
       const [, amount, tokenTypeOrAddress, recipient] = message.match(regexERC20)!;
       return {
         amount,
         tokenType: 'ERC20',
         tokenAddress: tokenTypeOrAddress,
         recipient,
       };
     }
   
     return null;
   }
   