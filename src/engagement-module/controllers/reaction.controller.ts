// CONTROLLERS
// controllers/reaction.controller.ts
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
  import { ReactionService } from "../services/reaction.service";
  import {
    CreateReactionDto,
    UpdateReactionDto,
    ReactionResponseDto,
  } from "../dto/reaction.dto";
  import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
  } from "@nestjs/swagger";
  
  @ApiTags("reactions")
  @Controller("reactions")
  export class ReactionController {
    constructor(private readonly reactionService: ReactionService) {}
  
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Create a new reaction" })
    @ApiResponse({
      status: 201,
      description: "Reaction created successfully",
      type: ReactionResponseDto,
    })
    async create(
      @Request() req,
      @Body() createReactionDto: CreateReactionDto
    ): Promise<ReactionResponseDto> {
      return this.reactionService.create(req.user.id, createReactionDto);
    }
  
    @Get("content/:contentType/:contentId")
    @ApiOperation({ summary: "Get all reactions for content" })
    @ApiResponse({
      status: 200,
      description: "Returns all reactions",
      type: [ReactionResponseDto],
    })
    async findAllForContent(
      @Param("contentType") contentType: string,
      @Param("contentId") contentId: string
    ): Promise<ReactionResponseDto[]> {
      return this.reactionService.findAll(contentId, contentType);
    }
  
    @Get("content/:contentType/:contentId/count")
    @ApiOperation({ summary: "Get reaction counts by type" })
    @ApiResponse({
      status: 200,
      description: "Returns reaction counts grouped by type",
    })
    async getReactionCounts(
      @Param("contentType") contentType: string,
      @Param("contentId") contentId: string
    ): Promise<Record<string, number>> {
      return this.reactionService.getReactionsByType(contentId, contentType);
    }
  
    @Get(":id")
    @ApiOperation({ summary: "Get a specific reaction" })
    @ApiResponse({
      status: 200,
      description: "Returns the reaction",
      type: ReactionResponseDto,
    })
    async findOne(@Param("id") id: string): Promise<ReactionResponseDto> {
      return this.reactionService.findOne(id);
    }
  
    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update a reaction" })
    @ApiResponse({
      status: 200,
      description: "Reaction updated successfully",
      type: ReactionResponseDto,
    })
    async update(
      @Param("id") id: string,
      @Request() req,
      @Body() updateReactionDto: UpdateReactionDto
    ): Promise<ReactionResponseDto> {
      return this.reactionService.update(id, req.user.id, updateReactionDto);
    }
  
    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Remove a reaction" })
    @ApiResponse({ status: 200, description: "Reaction removed successfully" })
    async remove(@Param("id") id: string, @Request() req): Promise<void> {
      return this.reactionService.remove(id, req.user.id);
    }
  
    @Get("user/has-reacted")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Check if user has reacted to content" })
    @ApiResponse({ status: 200, description: "Returns whether user has reacted" })
    async hasUserReacted(
      @Request() req,
      @Query("contentId") contentId: string,
      @Query("contentType") contentType: string,
      @Query("type") type?: string
    ): Promise<{ hasReacted: boolean }> {
      const result = await this.reactionService.hasUserReacted(
        req.user.id,
        contentId,
        contentType,
        type
      );
      return { hasReacted: result };
    }
  }
  