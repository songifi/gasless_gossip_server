import { SetMetadata } from '@nestjs/common';
import { AuditActionType } from '../entities/audit-log.entity';

export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditActionOptions {
  action: AuditActionType;
  entityType?: string;
  entityIdFactory?: (request: any) => string;
}

export const Audited = (options: AuditActionOptions) => SetMetadata(AUDIT_ACTION_KEY, options);