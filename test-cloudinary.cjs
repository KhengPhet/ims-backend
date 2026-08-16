const dotenv = require('dotenv');
dotenv.config();

const { v2: cloudinary } = require('cloudinary');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('CLOUD_NAME loaded:', Boolean(cloudName));
console.log('API_KEY loaded:', Boolean(apiKey), apiKey ? `(len ${apiKey.length})` : '');
console.log('API_SECRET loaded:', Boolean(apiSecret), apiSecret ? `(len ${apiSecret.length})` : '');

if (!cloudName || !apiKey || !apiSecret) {
  console.log('FAIL: config incomplete');
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
  timeout: 60000,
});

// 1x1 red PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const started = Date.now();

cloudinary.uploader
  .upload_stream({ folder: 'ims-users-test', resource_type: 'image' }, (error, result) => {
    const elapsed = Date.now() - started;
    if (error) {
      console.log('UPLOAD ERROR after', elapsed + 'ms:', JSON.stringify(error));
      process.exit(1);
    }
    if (!result || !result.secure_url) {
      console.log('UPLOAD ERROR after', elapsed + 'ms: no secure_url');
      process.exit(1);
    }
    console.log('UPLOAD SUCCESS after', elapsed + 'ms');
    console.log('SECURE_URL:', result.secure_url);
    console.log('PUBLIC_ID:', result.public_id);
    process.exit(0);
  })
  .end(png);
