import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

const getExceptionCode = (exception: any): HttpException => {
  switch (exception.status) {
    case 400:
      return new HttpException(`Bad request: ${exception.message}`, 400);
    case 401:
      return new HttpException(
        `Unauthorized request: ${exception.message}`,
        401,
      );
    case 403:
      return new HttpException(`Forbidden: ${exception.message}`, 403);
    case 404:
      return new HttpException(`Resource not found: ${exception.message}`, 404);
    default:
      console.error(exception);
      return exception;
  }
};

@Catch()
export class ExceptionsLoggerFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const type = host.getType();

    if (type === 'http') {
      return super.catch(getExceptionCode(exception), host);
    } else {
      console.error('Unhandled global exception', exception);
      throw exception;
    }
  }
}
