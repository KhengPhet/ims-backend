import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {

  private configured = false;

  constructor() {

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME;

    const apiKey =
      process.env.CLOUDINARY_API_KEY;

    const apiSecret =
      process.env.CLOUDINARY_API_SECRET;


    console.log(
      '========== CLOUDINARY CONFIG =========='
    );

    console.log(
      'Cloud name:',
      cloudName || 'MISSING',
    );

    console.log(
      'API key:',
      apiKey ? 'LOADED' : 'MISSING',
    );

    console.log(
      'API secret:',
      apiSecret ? 'LOADED' : 'MISSING',
    );


    if (
      !cloudName ||
      !apiKey ||
      !apiSecret
    ) {

      console.error(
        '❌ Cloudinary configuration is missing',
      );

      return;
    }


    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });


    this.configured = true;


    console.log(
      '✅ Cloudinary configured successfully',
    );
  }


  async uploadImage(
    file: Express.Multer.File,
  ): Promise<string> {

    if (!this.configured) {

      throw new InternalServerErrorException(
        'Cloudinary is not configured',
      );
    }


    if (!file) {

      throw new InternalServerErrorException(
        'No image file received',
      );
    }


    console.log(
      '☁️ Cloudinary uploading:',
      file.originalname,
    );


    return new Promise(
      (resolve, reject) => {

        const upload =
          cloudinary.uploader.upload_stream(
            {
              folder: 'ims-users',
              resource_type: 'image',
            },

            (error, result) => {

              if (error) {

                console.error(
                  '❌ Cloudinary upload error:',
                  JSON.stringify(
                    error,
                    null,
                    2,
                  ),
                );

                reject(error);
                return;
              }


              if (!result) {

                reject(
                  new Error(
                    'Cloudinary result is empty',
                  ),
                );

                return;
              }


              console.log(
                '✅ Cloudinary upload completed',
              );

              console.log(
                'Secure URL:',
                result.secure_url,
              );


              resolve(
                result.secure_url,
              );
            },
          );


        upload.end(file.buffer);
      },
    );
  }
}