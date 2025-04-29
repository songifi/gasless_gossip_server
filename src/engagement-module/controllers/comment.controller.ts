// controllers/comment.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    Query,
  } from "@nestjs/common";
  import { CommentService } from "../services/comment.service";
  import {
    CreateCommentDto,
    UpdateCommentDto,
    CommentResponseDto,
    CommentPaginationDto,
  } from "../dto/comment.dto";
  import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
  } from "@nestjs/swagger";
  
  @ApiTags("comments")
  @Controller("comments")
  export class CommentController {
    constructor(private readonly commentService: CommentService) {}
  
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Create a new comment" })
    @ApiResponse({
      status: 201,
      description: "Comment created successfully",
      type: CommentResponseDto,
    })
    async create(
      @Request() req,
      @Body() createCommentDto: CreateCommentDto
    ): Promise<CommentResponseDto> {
      return this.commentService.create(req.user.id, createCommentDto);
    }
  
    @Get("content")
    @ApiOperation({ summary: "Get comments for content with pagination" })
    @ApiResponse({ status: 200, description: "Returns paginated comments" })
    async findAll(
      @Query() paginationDto: CommentPaginationDto
    ): Promise<{
      comments: CommentResponseDto[];
      total: number;
      page: number;
      limit: number;
    }> {
      return this.commentService.findAll(paginationDto);
    }
  
    @Get("thread/:rootId")
    @ApiOperation({ summary: "Get threaded comments for a root comment" })
    @ApiResponse({
      status: 200,
      description: "Returns threaded comments",
      type: CommentResponseDto,
    })
    async getThreadedComments(
      @Param("rootId") rootId: string,
      @Query("page") page?: number,
      @Query("limit") limit?: number
    ): Promise<CommentResponseDto> {
      return this.commentService.getThreadedComments(rootId, page, limit);
    }
  
    @Get(":id")
    @ApiOperation({ summary: "Get a specific comment" })
    @ApiResponse({
      status: 200,
      description: "Returns the comment",
      type: CommentResponseDto,
    })
    async findOne(@Param("id") id: string): Promise<CommentResponseDto> {
      return this.commentService.findOne(id);
    }
  
    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update a comment" })
    @ApiResponse({
      status: 200,
      description: "Comment updated successfully",
      type: CommentResponseDto,
    })
    async update(
      @Param("id") id: string,
      @Request() req,
      @Body() updateCommentDto: UpdateCommentDto
    ): Promise<CommentResponseDto> {
      return this.commentService.update(id, req.user.id, updateCommentDto);
    }
  
    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Remove a comment" })
    @ApiResponse({ status: 200, description: "Comment removed successfully" })
    async remove(@Param("id") id: string, @Request() req): Promise<void> {
      return this.commentService.remove(id, req.user.id);
    }
  }
  