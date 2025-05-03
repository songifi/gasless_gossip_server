import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../audit.service';
import { AUDIT_ACTION_KEY, AuditActionOptions } from '../decorators/audit-action.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditActionOptions>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { action, entityType } = auditOptions;
    const entityId = auditOptions.entityIdFactory ? auditOptions.entityIdFactory(request) : request.params.id;
    const userId = request.user?.id;
    const oldValues = request.body?.originalData || null;
    const newValues = request.body || null;

    return next.handle().pipe(
      tap(async (data) => {
        await this.auditService.createLog({
          action,
          entityType,
          entityId: entityId || (data?.id ? String(data.id) : undefined),
          oldValues,
          newValues,
          userId,
          request,
          metadata: {
            endpoint: request.path,
            method: request.method,
            responseStatus: context.switchToHttp().getResponse().statusCode,
          },
        });
      }),
    );
  }
}
