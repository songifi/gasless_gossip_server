// src/connection/repositories/connection.repository.ts
import { Repository, EntityRepository, SelectQueryBuilder } from 'typeorm';
import { Connection } from '../entities/connection.entity';
import { User } from '../../user/entities/user.entity';
import { ConnectionStatus } from '../enums/connection-status.enum';
import { ConnectionType } from '../enums/connection-type.enum';
import { ConnectionQueryDto } from '../dto/connection-query.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ConnectionRepository {
  constructor(
    @InjectRepository(Connection)
    private readonly repository: Repository<Connection>,
  ) {}

  async findById(id: string): Promise<Connection> {
    return this.repository.findOne({
      where: { id },
      relations: ['requester', 'addressee'],
    });
  }

  async findBetweenUsers(userId1: string, userId2: string): Promise<Connection> {
    return this.repository.findOne({
      where: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 }
      ],
      relations: ['requester', 'addressee'],
    });
  }

  async findByUserWithFilters(
    userId: string,
    queryParams: ConnectionQueryDto
  ): Promise<[Connection[], number]> {
    const { type, status, search, sortBy, sortOrder, limit, offset } = queryParams;
    
    const query = this.repository.createQueryBuilder('connection')
      .leftJoinAndSelect('connection.requester', 'requester')
      .leftJoinAndSelect('connection.addressee', 'addressee')
      .where('(connection.requesterId = :userId OR connection.addresseeId = :userId)', { userId })
      
    if (type) {
      query.andWhere('connection.type = :type', { type });
    }
    
    if (status) {
      query.andWhere('connection.status = :status', { status });
    }
    
    if (search) {
      query.andWhere(
        '(requester.username ILIKE :search OR requester.displayName ILIKE :search OR ' +
        'addressee.username ILIKE :search OR addressee.displayName ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    query.orderBy(`connection.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    query.take(parseInt(limit));
    query.skip(parseInt(offset));
    
    return query.getManyAndCount();
  }

  async findRequestsForUser(userId: string): Promise<Connection[]> {
    return this.repository.find({
      where: {
        addresseeId: userId,
        status: ConnectionStatus.PENDING,
        type: ConnectionType.FRIENDSHIP
      },
      relations: ['requester']
    });
  }

  async findFollowers(userId: string): Promise<Connection[]> {
    return this.repository.find({
      where: {
        addresseeId: userId,
        type: ConnectionType.FOLLOW,
        status: ConnectionStatus.ACCEPTED
      },
      relations: ['requester']
    });
  }

  async findFollowing(userId: string): Promise<Connection[]> {
    return this.repository.find({
      where: {
        requesterId: userId,
        type: ConnectionType.FOLLOW,
        status: ConnectionStatus.ACCEPTED
      },
      relations: ['addressee']
    });
  }

  async findFriends(userId: string): Promise<Connection[]> {
    return this.repository.find({
      where: [
        { requesterId: userId, type: ConnectionType.FRIENDSHIP, status: ConnectionStatus.ACCEPTED },
        { addresseeId: userId, type: ConnectionType.FRIENDSHIP, status: ConnectionStatus.ACCEPTED }
      ],
      relations: ['requester', 'addressee']
    });
  }

  async countConnections(userId: string, type?: ConnectionType, status?: ConnectionStatus): Promise<number> {
    const query = this.repository.createQueryBuilder('connection')
      .where('(connection.requesterId = :userId OR connection.addresseeId = :userId)', { userId });
      
    if (type) {
      query.andWhere('connection.type = :type', { type });
    }
    
    if (status) {
      query.andWhere('connection.status = :status', { status });
    }
    
    return query.getCount();
  }

  async updateConnectionStrength(id: string, strength: number): Promise<Connection> {
    await this.repository.update(id, { strength });
    return this.findById(id);
  }

  async updateStatus(id: string, status: ConnectionStatus): Promise<Connection> {
    await this.repository.update(id, { status });
    return this.findById(id);
  }

  async toggleFavorite(id: string, isFavorite: boolean): Promise<Connection> {
    await this.repository.update(id, { isFavorite });
    return this.findById(id);
  }

  async create(data: Partial<Connection>): Promise<Connection> {
    const connection = this.repository.create(data);
    
    // Auto-accept follows
    if (connection.type === ConnectionType.FOLLOW) {
      connection.status = ConnectionStatus.ACCEPTED;
    }
    
    return this.repository.save(connection);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}