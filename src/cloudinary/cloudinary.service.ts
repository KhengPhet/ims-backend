import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

const UPLOAD_TIMEOUT_MS = 90000;

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ims-users',
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          use_filename: true,
          unique_filename: true,
          timeout: UPLOAD_TIMEOUT_MS,
        },
        (error, result) => {
          if (error) {
            reject(
              new Error(
                `Cloudinary upload failed: ${error.message ?? 'unknown error'}`,
              ),
            );
            return;
          }
          if (!result?.secure_url) {
            reject(new Error('Cloudinary upload returned no URL'));
            return;
          }
          resolve(result.secure_url);
        },
      );

      stream.on('error', (err) => {
        reject(
          new Error(`Cloudinary upload stream error: ${err.message ?? 'unknown error'}`),
        );
      });

      stream.end(file.buffer);
    });
  }

  async deleteImage(url: string): Promise<void> {
    const publicId = this.extractPublicId(url);
    if (!publicId) {
      return;
    }
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary delete failed:', error);
    }
  }

  private extractPublicId(url: string): string | null {
    try {
      const segments = url.split('/');
      const uploadIndex = segments.indexOf('upload');
      if (uploadIndex === -1) {
        return null;
      }
      const idParts = segments.slice(uploadIndex + 1);
      if (idParts.length === 0) {
        return null;
      }
      if (/^v\d+$/.test(idParts[0])) {
        idParts.shift();
      }
      const last = idParts[idParts.length - 1];
      idParts[idParts.length - 1] = last.replace(/\.[a-z0-9]+$/i, '');
      return idParts.join('/');
    } catch {
      return null;
    }
  }
}
