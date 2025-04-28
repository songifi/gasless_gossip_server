import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MessageService } from '../services/message.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageDto } from '../dto/update-message.dto';
import { MessageQueryDto } from '../dto/message-query.dto';
import { ReactionDto } from '../dto/reaction.dto';
import { Message } from '../entities/message.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  @ApiOperation({ summary: 'Get messages from a chat room' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated messages with cursor',
  })
  async getMessages(@Query() query: MessageQueryDto) {
    const [messages, hasMore] = await this.messageService.getMessages(query);
    return {
      messages,
      hasMore,
      nextCursor:
        messages.length > 0
          ? messages[messages.length - 1].createdAt.toISOString()
          : null,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for messages' })
  @ApiResponse({
    status: 200,
    description: 'Returns messages matching search query',
  })
  async searchMessages(
    @Query('q') query: string,
    @Query() options: Partial<MessageQueryDto>,
  ) {
    const [messages, hasMore] = await this.messageService.searchMessages(
      query,
      options,
    );
    return {
      messages,
      hasMore,
      nextCursor:
        messages.length > 0
          ? messages[messages.length - 1].createdAt.toISOString()
          : null,
    };
  }

  @Get('thread/:parentId')
  @ApiOperation({ summary: 'Get thread messages' })
  @ApiResponse({ status: 200, description: 'Returns thread messages' })
  async getThreadMessages(
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @Query() query: Omit<MessageQueryDto, 'chatRoomId'>,
  ) {
    const [messages, hasMore] = await this.messageService.getThreadMessages(
      parentId,
      query,
    );
    return {
      messages,
      hasMore,
      nextCursor:
        messages.length > 0
          ? messages[messages.length - 1].createdAt.toISOString()
          : null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific message' })
  @ApiResponse({ status: 200, description: 'Returns the message' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getMessage(@Param('id', ParseUUIDPipe) id: string): Promise<Message> {
    return this.messageService.getMessage(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req,
  ): Promise<Message> {
    return this.messageService.createMessage(createMessageDto, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async updateMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Req() req,
  ): Promise<Message> {
    return this.messageService.updateMessage(id, updateMessageDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ): Promise<void> {
    await this.messageService.deleteMessage(id, req.user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiResponse({ status: 204, description: 'Message marked as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ): Promise<void> {
    await this.messageService.markAsRead(id, req.user.id);
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  @ApiResponse({ status: 201, description: 'Reaction added successfully' })
  async addReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reactionDto: ReactionDto,
    @Req() req,
  ) {
    return this.messageService.addReaction(
      id,
      req.user.id,
      reactionDto.reaction,
    );
  }

  @Delete(':id/reactions/:reaction')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  @ApiResponse({ status: 204, description: 'Reaction removed successfully' })
  async removeReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reaction') reaction: string,
    @Req() req,
  ): Promise<void> {
    await this.messageService.removeReaction(id, req.user.id, reaction);
  }
}
