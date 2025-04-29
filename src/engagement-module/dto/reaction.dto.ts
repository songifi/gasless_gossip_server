// DTOS
// dto/reaction.dto.ts
import {
    IsNotEmpty,
    IsString,
    IsUUID,
    IsOptional,
    ValidateNested,
    IsObject,
  } from "class-validator";
  import { Type } from "class-transformer";
  
  export class CreateReactionDto {
    @IsNotEmpty()
    @IsUUID()
    contentId: string;
  
    @IsNotEmpty()
    @IsString()
    contentType: string;
  
    @IsNotEmpty()
    @IsString()
    type: string;
  
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
  }
  
  export class UpdateReactionDto {
    @IsOptional()
    @IsString()
    type?: string;
  
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
  }
  
  export class ReactionResponseDto {
    id: string;
    contentId: string;
    contentType: string;
    creatorId: string;
    type: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
  }
  