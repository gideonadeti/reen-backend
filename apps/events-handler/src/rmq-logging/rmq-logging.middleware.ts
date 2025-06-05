import { RmqContext } from '@nestjs/microservices';
import { catchError, tap } from 'rxjs';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';

@Injectable()
export class RmqLoggingInterceptor implements NestInterceptor {
  private logger = new Logger(RmqLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler) {
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;
    const pattern = context.switchToRpc().getContext<RmqContext>().getPattern();

    this.logger.log(`${className}.${handlerName} received ${pattern}`);

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
