// dto/crypto-tip.dto.ts
import {
    IsNotEmpty,
    IsString,
    IsUUID,
    IsNumber,
    Min,
    IsEnum,
    IsOptional,
  } from "class-validator";
  
  export class CreateCryptoTipDto {
    @IsNotEmpty()
    @IsUUID()
    contentId: string;
  
    @IsNotEmpty()
    @IsString()
    contentType: string;
  
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    amount: number;
  
    @IsNotEmpty()
    @IsString()
    tokenSymbol: string;
  
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
  }
  
  export class CryptoTipResponseDto {
    id: string;
    contentId: string;
    contentType: string;
    creatorId: string;
    amount: number;
    tokenSymbol: string;
    transactionId: string;
    status: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    creator: {
      id: string;
      username: string;
      avatar?: string;
    };
  }
  