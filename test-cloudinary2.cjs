const dotenv = require('dotenv');
dotenv.config();

const { v2: cloudinary } = require('cloudinary');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const dataUri = 'data:image/png;base64,' + pngB64;

async function tryUpload(name, fn) {
  const started = Date.now();
  try {
    const result = await fn();
    console.log(`${name}: SUCCESS in ${Date.now() - started}ms`, result.secure_url);
    return true;
  } catch (e) {
    console.log(`${name}: FAIL in ${Date.now() - started}ms`, JSON.stringify(e).slice(0, 300));
    return false;
  }
}

(async () => {
  // Test 1: uploader.upload with data URI (string path)
  await tryUpload('upload(dataURI)', () =>
    cloudinary.uploader.upload(dataUri, { folder: 'ims-users-test2' }),
  );

  // Test 2: upload_stream with explicit timeout option
  await tryUpload('upload_stream(+timeout)', () =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'ims-users-test2', timeout: 120000 },
        (error, result) => (error ? reject(error) : resolve(result)),
      );
      stream.end(Buffer.from(pngB64, 'base64'));
    }),
  );
})();
