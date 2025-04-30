import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../entities/notification-template.entity';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepo: Repository<NotificationTemplate>,
  ) {}

  async getTemplate(type: string, language: string): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findOne({ where: { type, language } });
    if (!template) throw new NotFoundException(`Template not found for type: ${type}, language: ${language}`);
    return template;
  }

  renderTemplate(template: string, data: Record<string, any>): string {
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }
}