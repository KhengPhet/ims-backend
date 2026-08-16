import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const PUBLIC_PREFIX = '/uploads';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

    try {
      mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`UPLOADS: directory ready at ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(
        `UPLOADS: failed to create directory ${this.uploadDir}: ${(error as Error).message}`,
      );
    }
  }

  getAbsolutePath(): string {
    return this.uploadDir;
  }

  saveImage(file: Express.Multer.File): string {
    if (!file) {
      throw new ServiceUnavailableException('No image file received');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new ServiceUnavailableException('Image file is empty');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new ServiceUnavailableException(
        'Image file is too large (max 5MB)',
      );
    }

    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${this.extension(file)}`;
    const fullPath = join(this.uploadDir, filename);

    try {
      writeFileSync(fullPath, file.buffer);
    } catch (error) {
      this.logger.error(
        `UPLOADS: failed to write ${fullPath}: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'Image upload failed. Please try again.',
      );
    }

    this.logger.log(
      `UPLOADS: saved ${filename} (${file.size} bytes, ${file.mimetype})`,
    );

    return `${PUBLIC_PREFIX}/${filename}`;
  }

  private extension(file: Express.Multer.File): string {
    const fromName = file.originalname.toLowerCase().split('.').pop();
    if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) {
      return `.${fromName}`;
    }

    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };

    return map[file.mimetype] ?? '.jpg';
  }
}
