import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilterRule } from '../entities/filter-rule.entity';
import { CreateFilterRuleDto } from '../dto/filter-rule.dto';
import { ReportService } from './report.service';
import { FilterAction } from '../interfaces/filter-action.enum';
import { ModerationPriority } from '../interfaces/moderation-priority.enum';

interface ContentToFilter {
  id: string;
  type: string;
  content: string;
  userId: string;
}

interface FilterResult {
  isFiltered: boolean;
  action: FilterAction;
  rules: FilterRule[];
  score: number;
  priority: ModerationPriority;
}

@Injectable()
export class FilterService {
  constructor(
    @InjectRepository(FilterRule)
    private filterRuleRepository: Repository<FilterRule>,
    private reportService: ReportService,
  ) {}

  async createRule(createRuleDto: CreateFilterRuleDto): Promise<FilterRule> {
    const rule = this.filterRuleRepository.create(createRuleDto);
    return this.filterRuleRepository.save(rule);
  }

  async updateRule(id: string, updateRuleDto: Partial<CreateFilterRuleDto>): Promise<FilterRule> {
    await this.filterRuleRepository.update(id, updateRuleDto);
    return this.filterRuleRepository.findOneBy({ id });
  }

  async deleteRule(id: string): Promise<void> {
    await this.filterRuleRepository.delete(id);
  }

  async getAllRules(isActive?: boolean): Promise<FilterRule[]> {
    const query: Partial<FilterRule> = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    
    return this.filterRuleRepository.find({
      where: query,
      order: {
        score: 'DESC',
      },
    });
  }

  async filterContent(content: ContentToFilter): Promise<FilterResult> {
    const activeRules = await this.filterRuleRepository.find({
      where: { isActive: true },
    });

    const matchedRules: FilterRule[] = [];
    let totalScore = 0;
    let highestPriority = ModerationPriority.LOW;
    let strongestAction = FilterAction.FLAG;

    // Priority values for comparison
    const priorityValues = {
      [ModerationPriority.LOW]: 0,
      [ModerationPriority.MEDIUM]: 1,
      [ModerationPriority.HIGH]: 2,
      [ModerationPriority.URGENT]: 3,
    };

    // Action strength values for comparison
    const actionValues = {
      [FilterAction.FLAG]: 0,
      [FilterAction.BLOCK]: 1,
      [FilterAction.AUTO_REMOVE]: 2,
    };

    for (const rule of activeRules) {
      let isMatch = false;
      
      if (rule.isRegex) {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          isMatch = regex.test(content.content);
        } catch (error) {
          console.error(`Invalid regex pattern in rule ${rule.id}: ${rule.pattern}`);
        }
      } else {
        // Simple keyword matching (case insensitive)
        isMatch = content.content.toLowerCase().includes(rule.pattern.toLowerCase());
      }

      if (isMatch) {
        matchedRules.push(rule);
        totalScore += rule.score;

        // Update highest priority if this rule has higher priority
        if (priorityValues[rule.priority] > priorityValues[highestPriority]) {
          highestPriority = rule.priority;
        }

        // Update strongest action if this rule has stronger action
        if (actionValues[rule.action] > actionValues[strongestAction]) {
          strongestAction = rule.action;
        }
      }
    }

    const isFiltered = matchedRules.length > 0;

    // If content is filtered, create an automated report
    if (isFiltered) {
      const categories = Array.from(new Set(matchedRules.map(rule => rule.category).filter(Boolean)));
      
      await this.reportService.create(
        {
          contentType: content.type,
          contentId: content.id,
          reportedId: content.userId,
          category: categories.join(', ') || 'automated-filter',
          description: `Automated detection by rules: ${matchedRules.map(r => r.name).join(', ')}`,
          priority: highestPriority,
        },
        'system' // Using 'system' as reporterId for automated reports
      );
    }

    return {
      isFiltered,
      action: strongestAction,
      rules: matchedRules,
      score: totalScore,
      priority: highestPriority,
    };
  }
}