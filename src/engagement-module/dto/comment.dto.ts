// dto/comment.dto.ts
import {
    IsNotEmpty,
    IsString,
    IsUUID,
    IsOptional,
    IsArray,
  } from "class-validator";
  
  export class CreateCommentDto {
    @IsNotEmpty()
    @IsUUID()
    contentId: string;
  
    @IsNotEmpty()
    @IsString()
    contentType: string;
  
    @IsNotEmpty()
    @IsString()
    content: string;
  
    @IsOptional()
    @IsUUID()
    parentId?: string;
  }
  
  export class UpdateCommentDto {
    @IsNotEmpty()
    @IsString()
    content: string;
  }
  
  export class CommentResponseDto {
    id: string;
    content: string;
    contentId: string;
    contentType: string;
    creatorId: string;
    parentId?: string;
    rootId?: string;
    mentions?: string[];
    replyCount: number;
    createdAt: Date;
    updatedAt: Date;
    creator: {
      id: string;
      username: string;
      avatar?: string;
    };
    replies?: CommentResponseDto[];
  }
  
  export class CommentPaginationDto {
    @IsUUID()
    @IsOptional()
    parentId?: string;
  
    @IsUUID()
    @IsNotEmpty()
    contentId: string;
  
    @IsString()
    @IsNotEmpty()
    contentType: string;
  
    @IsOptional()
    page?: number = 1;
  
    @IsOptional()
    limit?: number = 10;
  
    @IsOptional()
    orderBy?: string = "createdAt";
  
    @IsOptional()
    order?: "ASC" | "DESC" = "DESC";
  }
  