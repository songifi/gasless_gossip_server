// src/connection/services/graph-analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection } from '../entities/connection.entity';
import { ConnectionStatus } from '../enums/connection-status.enum';

@Injectable()
export class GraphAnalyticsService {
  constructor(
    @InjectRepository(Connection)
    private readonly connectionRepository: Repository<Connection>,
  ) {}
  
  // Calculate network density (ratio of actual connections to possible connections)
  async calculateNetworkDensity(): Promise<number> {
    const userCount = await this.connectionRepository
      .createQueryBuilder('conn')
      .select('COUNT(DISTINCT CASE WHEN requester_id IS NOT NULL THEN requester_id ELSE addressee_id END)', 'count')
      .getRawOne()
      .then(result => parseInt(result.count, 10));
    
    const connectionCount = await this.connectionRepository.count({
      where: { status: ConnectionStatus.ACCEPTED }
    });
    
    // Maximum possible connections in a network = n(n-1)/2 where n is the number of users
    const maxPossibleConnections = (userCount * (userCount - 1)) / 2;
    
    return connectionCount / maxPossibleConnections;
  }
  
  // Find network influencers (users with most connections)
  async findInfluencers(limit: number = 10): Promise<any[]> {
    const result = await this.connectionRepository
      .createQueryBuilder('conn')
      .select([
        'u.id as "userId"',
        'u.username as "username"',
        'COUNT(*) as "connectionCount"'
      ])
      .innerJoin('users', 'u', '(conn.requester_id = u.id OR conn.addressee_id = u.id)')
      .where('conn.status = :status', { status: ConnectionStatus.ACCEPTED })
      .groupBy('u.id, u.username')
      .orderBy('"connectionCount"', 'DESC')
      .limit(limit)
      .getRawMany();
    
    return result;
  }
  
  // Calculate average connection strength
  async calculateAverageStrength(): Promise<number> {
    const result = await this.connectionRepository
      .createQueryBuilder('conn')
      .select('AVG(conn.strength)', 'average')
      .where('conn.status = :status', { status: ConnectionStatus.ACCEPTED })
      .getRawOne();
    
    return parseFloat(result.average) || 0;
  }
  
  // Analyze network growth over time
  async analyzeNetworkGrowth(startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month'): Promise<any[]> {
    const intervalFormat = {
      day: 'YYYY-MM-DD',
      week: 'YYYY-WW',
      month: 'YYYY-MM'
    };
    
    return this.connectionRepository
      .createQueryBuilder('conn')
      .select([
        `TO_CHAR(conn.created_at, '${intervalFormat[interval]}') as "period"`,
        'COUNT(*) as "newConnections"'
      ])
      .where('conn.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('"period"')
      .orderBy('"period"', 'ASC')
      .getRawMany();
  }
}