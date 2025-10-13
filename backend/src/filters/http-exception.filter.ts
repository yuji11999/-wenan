import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      // HTTP异常
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
      }
    } else if (exception instanceof Error) {
      // 普通错误
      message = exception.message;
      error = exception.name;

      // 特殊处理AI相关错误
      if (message.includes('AI API密钥') || message.includes('API密钥')) {
        status = HttpStatus.BAD_REQUEST;
        error = 'AI Configuration Error';
      } else if (message.includes('数据库') || message.includes('连接失败')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'Database Connection Error';
      } else if (message.includes('JWT') || message.includes('认证')) {
        status = HttpStatus.UNAUTHORIZED;
        error = 'Authentication Error';
      }
    }

    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${message}`,
    );

    if (exception instanceof Error && exception.stack) {
      // 避免输出详细堆栈信息
    }

    // 返回统一的错误响应格式
    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

