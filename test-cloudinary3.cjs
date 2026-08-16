const dotenv = require('dotenv');
dotenv.config();
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function uploadWith(options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'ims-users-test3', ...options },
      (error, result) => (error ? reject(error) : resolve(result.secure_url)),
    );
    stream.end(Buffer.from(pngB64, 'base64'));
  });
}

async function run(label, makeOptions) {
  let ok = 0, fail = 0;
  for (let i = 1; i <= 6; i++) {
    const started = Date.now();
    try {
      await uploadWith(makeOptions(i));
      ok++;
      console.log(`${label} #${i}: OK in ${Date.now() - started}ms`);
    } catch (e) {
      fail++;
      console.log(`${label} #${i}: FAIL in ${Date.now() - started}ms ${JSON.stringify(e).slice(0, 120)}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`${label}: ok=${ok} fail=${fail}`);
}

(async () => {
  await run('no-timeout-opt ', () => ({}));
  await run('timeout-120000 ', () => ({ timeout: 120000 }));
  await run('retry-on-499  ', (i) => ({ retry: i > 3 ? 2 : 0, timeout: 60000 }));
})();
