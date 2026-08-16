import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { v2 as cloudinary } from 'cloudinary';

const UPLOAD_TIMEOUT_MS = 120000;
const MAX_UPLOAD_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  private configured = false;

  constructor() {
    this.configure();
  }

  private configure(): void {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Safe: booleans only. The actual secret is NEVER printed.
    this.logger.log(
      `CLOUDINARY CONFIG: cloud name loaded: ${Boolean(cloudName)}`,
    );
    this.logger.log(`CLOUDINARY CONFIG: API key loaded: ${Boolean(apiKey)}`);
    this.logger.log(
      `CLOUDINARY CONFIG: API secret loaded: ${Boolean(apiSecret)}`,
    );

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error('CLOUDINARY CONFIG: configuration is incomplete');
      this.configured = false;
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
      timeout: UPLOAD_TIMEOUT_MS,
    });

    this.configured = true;

    this.logger.log('CLOUDINARY CONFIG: configured successfully');
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!this.configured) {
      throw new ServiceUnavailableException('Cloudinary is not configured');
    }

    if (!file) {
      throw new ServiceUnavailableException('No image file received');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new ServiceUnavailableException('Image file is empty');
    }

    this.logger.log(
      `CLOUDINARY: upload started (${file.originalname}, ${file.size} bytes, ${file.mimetype})`,
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
      try {
        const secureUrl = await this.uploadOnce(file);
        this.logger.log('CLOUDINARY: upload success');
        this.logger.log(`CLOUDINARY: secure_url=${secureUrl}`);
        return secureUrl;
      } catch (error) {
        lastError = error as Error;
        const isTransient = this.isTransientError(lastError);

        if (attempt === MAX_UPLOAD_ATTEMPTS || !isTransient) {
          break;
        }

        this.logger.warn(
          `CLOUDINARY: upload attempt ${attempt} of ${MAX_UPLOAD_ATTEMPTS} failed (${lastError.message}). Retrying in ${RETRY_BASE_DELAY_MS * attempt}ms...`,
        );
        await this.delay(RETRY_BASE_DELAY_MS * attempt);
      }
    }

    const message = lastError?.message ?? 'Cloudinary upload failed';
    this.logger.error(
      `CLOUDINARY: upload failed after ${MAX_UPLOAD_ATTEMPTS} attempts: ${message}`,
    );
    throw new ServiceUnavailableException(
      'Image upload failed. Please try again.',
    );
  }

  private uploadOnce(file: Express.Multer.File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let settled = false;

      const finish = (fn: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        fn();
      };

      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ims-users',
          resource_type: 'image',
          timeout: UPLOAD_TIMEOUT_MS,
        },
        (error, result) => {
          if (error) {
            const err = error as {
              message?: string;
              http_code?: number | string;
              code?: number | string;
            };
            finish(() => {
              reject(
                new Error(
                  `${err.message ?? 'Cloudinary upload failed'} (http_code=${err.http_code ?? 'n/a'})`,
                ),
              );
            });
            return;
          }

          if (!result || !result.secure_url) {
            finish(() => {
              reject(new Error('Cloudinary upload returned no secure_url'));
            });
            return;
          }

          finish(() => resolve(result.secure_url));
        },
      );

      stream.on('error', (streamError) => {
        finish(() => {
          reject(
            new Error(streamError.message ?? 'Cloudinary upload stream error'),
          );
        });
      });

      stream.end(file.buffer);
    });
  }

  private isTransientError(error: Error): boolean {
    return /timeout|timed\s?out|499|econnreset|etimedout|socket|aborted|eai_again|enetdown/i.test(
      error?.message ?? '',
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
