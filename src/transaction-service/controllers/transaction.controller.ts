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
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { TransactionService } from '../services/transaction.service';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../users/entities/user.entity';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @Roles('user')
  async createTransaction(
    @Body() transactionData: Partial<Transaction>,
    @GetUser() user: User,
  ): Promise<Transaction> {
    return await this.transactionService.createTransaction({
      ...transactionData,
      user_id: user.id,
    });
  }

  @Get(':id')
  @Roles('user')
  async getTransaction(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<Transaction> {
    const transaction = await this.transactionService.getTransaction(id);
    if (transaction.user_id !== user.id) {
      throw new Error('Unauthorized');
    }
    return transaction;
  }

  @Get()
  @Roles('user')
  async getUserTransactions(
    @GetUser() user: User,
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    return await this.transactionService.searchTransactions({
      userId: user.id,
      status,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      category,
      tags: tags ? tags.split(',') : undefined,
      search,
      page,
      limit,
    });
  }

  @Put(':id')
  @Roles('user')
  async updateTransaction(
    @Param('id') id: string,
    @Body() updateData: Partial<Transaction>,
    @GetUser() user: User,
  ): Promise<Transaction> {
    const transaction = await this.transactionService.getTransaction(id);
    if (transaction.user_id !== user.id) {
      throw new Error('Unauthorized');
    }
    return await this.transactionService.updateTransaction(id, updateData);
  }

  @Delete(':id')
  @Roles('user')
  async deleteTransaction(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    const transaction = await this.transactionService.getTransaction(id);
    if (transaction.user_id !== user.id) {
      throw new Error('Unauthorized');
    }
    await this.transactionService.deleteTransaction(id);
  }

  @Put(':id/status')
  @Roles('user')
  async updateTransactionStatus(
    @Param('id') id: string,
    @Body() data: { status: TransactionStatus; failureReason?: string },
    @GetUser() user: User,
  ): Promise<Transaction> {
    const transaction = await this.transactionService.getTransaction(id);
    if (transaction.user_id !== user.id) {
      throw new Error('Unauthorized');
    }
    return await this.transactionService.updateTransactionStatus(
      id,
      data.status,
      data.failureReason,
    );
  }

  @Get('stats/summary')
  @Roles('user')
  async getTransactionStats(@GetUser() user: User) {
    return await this.transactionService.getTransactionStats(user.id);
  }

  @Get('export/:format')
  @Roles('user')
  async exportTransactions(
    @Param('format') format: 'csv' | 'json',
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser() user: User,
    @Res() res: Response,
  ) {
    const data = await this.transactionService.exportTransactions(
      user.id,
      format,
      {
        status,
        type,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    );

    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transactions.${format}`,
    );

    return res.status(HttpStatus.OK).send(data);
  }
} 