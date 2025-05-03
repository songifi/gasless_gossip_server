import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EntityManager } from 'typeorm';

@Injectable()
export class OriginalDataInterceptor implements NestInterceptor {
  constructor(private readonly entityManager: EntityManager) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { id, entity } = request.params;
    
    if (id && entity && (request.method === 'PATCH' || request.method === 'PUT' || request.method === 'DELETE')) {
      try {
        // Get the entity class dynamically
        const entityClass = this.getEntityClass(entity);
        
        // Fetch the original data
        const originalData = await this.entityManager.findOne(entityClass, id);
        
        if (originalData) {
          request.body.originalData = originalData;
        }
      } catch (error) {
        console.error('Error in OriginalDataInterceptor', error);
        // Continue even if we can't get the original data
      }
    }
    
    return next.handle();
  }
  
  private getEntityClass(entityName: string): any {
    // This is a simplified version. In a real application, you would use a proper
    // entity registry or a more sophisticated approach.
    const entityMap = {
      'messages': 'Message',
      'users': 'User',
      // Add other entities as needed
    };
    
    const className = entityMap[entityName];
    if (!className) {
      throw new Error(Unknown entity: ${entityName});
    }
    
    return className;
  }
}
