import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'Image size must be less than 5MB'
        : `File upload error: ${exception.message}`;

    const body = new BadRequestException(message).getResponse();

    response.status(400).json(body);
  }
}
