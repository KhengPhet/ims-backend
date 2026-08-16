import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { v2 as cloudinary } from 'cloudinary';

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

    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ims-users',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            const err = error as {
              message?: string;
              http_code?: number | string;
              code?: number | string;
            };
            this.logger.error(
              `CLOUDINARY: upload error message="${err.message ?? 'unknown'}" http_code=${err.http_code ?? 'n/a'} code=${err.code ?? 'n/a'}`,
            );
            reject(new Error(err.message ?? 'Cloudinary upload failed'));
            return;
          }

          if (!result || !result.secure_url) {
            this.logger.error('CLOUDINARY: upload returned no secure_url');
            reject(new Error('Cloudinary upload returned no secure_url'));
            return;
          }

          this.logger.log('CLOUDINARY: upload success');
          this.logger.log(`CLOUDINARY: secure_url=${result.secure_url}`);

          resolve(result.secure_url);
        },
      );

      stream.on('error', (streamError) => {
        this.logger.error(
          `CLOUDINARY: upload stream error: ${streamError.message}`,
        );
        reject(streamError);
      });

      stream.end(file.buffer);
    });
  }
}
