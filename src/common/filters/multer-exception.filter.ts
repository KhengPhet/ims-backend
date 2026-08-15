import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'Image size must be less than 5MB'
        : `File upload error: ${exception.message}`;

    response.status(400).json(new BadRequestException(message).getResponse());
  }
}
