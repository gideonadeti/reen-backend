import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiGatewayLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiGatewayLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, protocol } = req;

    res.on('finish', () => {
      const { statusCode } = res;

      this.logger.log(
        `[${protocol.toUpperCase()}] ${method} ${originalUrl} ${statusCode}`,
      );
    });

    next();
  }
}
