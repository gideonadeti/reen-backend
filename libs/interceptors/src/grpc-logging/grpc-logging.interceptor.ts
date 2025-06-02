import { catchError, tap } from 'rxjs';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';

@Injectable()
export class GrpcLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GrpcLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler) {
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    this.logger.log(`${className}.${handlerName} received a gRPC call`);

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `${className}.${handlerName} responded in ${Date.now() - start}ms`,
        );
      }),
      catchError((error) => {
        this.logger.error(
          `${className}.${handlerName} failed in ${Date.now() - start}ms`,
        );

        throw error;
      }),
    );
  }
}
