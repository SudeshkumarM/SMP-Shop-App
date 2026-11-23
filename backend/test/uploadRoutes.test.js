const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const backendDirectory = path.resolve(__dirname, '..');

const runNodeScript = (script, environment) => spawnSync(
  process.execPath,
  ['-e', script],
  {
    cwd: backendDirectory,
    encoding: 'utf8',
    env: environment
  }
);

test('serverless entrypoint and upload routes load without creating local upload folders', () => {
  const environment = { ...process.env, VERCEL: '1', JWT_SECRET: 'test-secret' };
  delete environment.CLOUDINARY_CLOUD_NAME;
  delete environment.CLOUDINARY_API_KEY;
  delete environment.CLOUDINARY_API_SECRET;
  const result = runNodeScript(`
    const fs = require('node:fs');
    const path = require('node:path');
    const originalExistsSync = fs.existsSync;
    const uploadDirectory = path.resolve('./uploads');
    fs.existsSync = (target) => path.resolve(target) === uploadDirectory
      ? false
      : originalExistsSync(target);
    fs.mkdirSync = () => { throw new Error('module initialization tried to create a directory'); };
    const handler = require('../api/index');
    if (typeof handler !== 'function') throw new Error('serverless handler was not exported');
  `, environment);

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('production upload request returns a configuration error without Cloudinary credentials', () => {
  const environment = { ...process.env, VERCEL: '1' };
  delete environment.CLOUDINARY_CLOUD_NAME;
  delete environment.CLOUDINARY_API_KEY;
  delete environment.CLOUDINARY_API_SECRET;
  const result = runNodeScript(`
    const assert = require('node:assert/strict');
    const express = require('express');
    const http = require('node:http');
    const fs = require('node:fs');
    fs.mkdirSync = () => { throw new Error('production upload tried to create a local directory'); };
    const authPath = require.resolve('./middleware/authMiddleware');
    require.cache[authPath] = {
      id: authPath,
      filename: authPath,
      loaded: true,
      exports: { protect: (req, res, next) => next(), authorize: () => (req, res, next) => next() }
    };
    const app = express();
    app.use('/api/upload', require('./routes/uploadRoutes'));
    const server = app.listen(0, '127.0.0.1', async () => {
      try {
        const response = await new Promise((resolve, reject) => {
          const request = http.request({
            hostname: '127.0.0.1',
            port: server.address().port,
            path: '/api/upload',
            method: 'POST'
          }, resolve);
          request.on('error', reject);
          request.end();
        });
        const chunks = [];
        for await (const chunk of response) chunks.push(chunk);
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        assert.equal(response.statusCode, 503);
        assert.match(payload.message, /Configure Cloudinary environment variables/);
      } catch (error) {
        console.error(error);
        process.exitCode = 1;
      } finally {
        server.close();
      }
    });
  `, environment);

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('local upload route creates its directory on demand and returns the stored URL', () => {
  const environment = { ...process.env };
  delete environment.VERCEL;
  delete environment.CLOUDINARY_CLOUD_NAME;
  delete environment.CLOUDINARY_API_KEY;
  delete environment.CLOUDINARY_API_SECRET;
  const result = runNodeScript(`
    const assert = require('node:assert/strict');
    const express = require('express');
    const http = require('node:http');
    const fs = require('node:fs');
    const path = require('node:path');
    const authPath = require.resolve('./middleware/authMiddleware');
    require.cache[authPath] = {
      id: authPath,
      filename: authPath,
      loaded: true,
      exports: { protect: (req, res, next) => next(), authorize: () => (req, res, next) => next() }
    };
    const uploadDirectory = path.resolve(__dirname, 'uploads');
    const directoryExisted = fs.existsSync(uploadDirectory);
    const app = express();
    app.use('/api/upload', require('./routes/uploadRoutes'));
    const server = app.listen(0, '127.0.0.1', async () => {
      const boundary = 'smp-test-boundary';
      const body = Buffer.from(
        '--' + boundary + '\\r\\n' +
        'Content-Disposition: form-data; name="image"; filename="test.png"\\r\\n' +
        'Content-Type: image/png\\r\\n\\r\\n' +
        'test-image-bytes\\r\\n' +
        '--' + boundary + '--\\r\\n'
      );
      let uploadedFilename;
      try {
        const response = await new Promise((resolve, reject) => {
          const request = http.request({
            hostname: '127.0.0.1',
            port: server.address().port,
            path: '/api/upload',
            method: 'POST',
            headers: {
              'Content-Type': 'multipart/form-data; boundary=' + boundary,
              'Content-Length': body.length
            }
          }, resolve);
          request.on('error', reject);
          request.end(body);
        });
        const chunks = [];
        for await (const chunk of response) chunks.push(chunk);
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        assert.equal(response.statusCode, 200);
        assert.equal(payload.success, true);
        assert.match(payload.url, /^\\/uploads\\/smp_.*\\.png$/);
        uploadedFilename = payload.filename;
        assert.equal(fs.existsSync(path.join(uploadDirectory, uploadedFilename)), true);
      } catch (error) {
        console.error(error);
        process.exitCode = 1;
      } finally {
        if (uploadedFilename) fs.unlinkSync(path.join(uploadDirectory, uploadedFilename));
        if (!directoryExisted && fs.existsSync(uploadDirectory)) fs.rmdirSync(uploadDirectory);
        server.close();
      }
    });
  `, environment);

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
