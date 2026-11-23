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

const runNodeModuleScript = (script, environment) => spawnSync(
  process.execPath,
  ['--input-type=module', '-e', script],
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
            path: '/api/upload/product-image',
            method: 'POST'
          }, resolve);
          request.on('error', reject);
          request.end();
        });
        const chunks = [];
        for await (const chunk of response) chunks.push(chunk);
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        assert.equal(response.statusCode, 503);
        assert.match(payload.message, /CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET/);
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

test('Vercel image uploads accept JPG, PNG, and WEBP and stream buffers to Cloudinary', () => {
  const environment = {
    ...process.env,
    VERCEL: '1',
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret'
  };
  const result = runNodeScript(`
    const assert = require('node:assert/strict');
    const express = require('express');
    const http = require('node:http');
    const { Writable } = require('node:stream');
    const cloudinary = require('cloudinary').v2;
    let uploadOptions;
    const uploadedBuffers = [];
    cloudinary.uploader.upload_stream = (options, callback) => {
      uploadOptions = options;
      let uploadedBuffer = Buffer.alloc(0);
      return new Writable({
        write(chunk, encoding, done) {
          uploadedBuffer = Buffer.concat([uploadedBuffer, chunk]);
          done();
        },
        final(done) {
          uploadedBuffers.push(uploadedBuffer);
          done();
          callback(null, {
            secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/smp-test.png',
            public_id: 'smp-products/smp-test'
          });
        }
      });
    };
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
        const formats = [
          { extension: 'jpg', mimeType: 'image/jpeg', bytes: 'jpeg-image-bytes' },
          { extension: 'png', mimeType: 'image/png', bytes: 'png-image-bytes' },
          { extension: 'webp', mimeType: 'image/webp', bytes: 'webp-image-bytes' }
        ];
        for (const [index, format] of formats.entries()) {
          const boundary = 'smp-cloudinary-test-' + index;
          const body = Buffer.from(
            '--' + boundary + '\\r\\n' +
            'Content-Disposition: form-data; name="image"; filename="test.' + format.extension + '"\\r\\n' +
            'Content-Type: ' + format.mimeType + '\\r\\n\\r\\n' +
            format.bytes + '\\r\\n' +
            '--' + boundary + '--\\r\\n'
          );
          const response = await new Promise((resolve, reject) => {
            const request = http.request({
              hostname: '127.0.0.1',
              port: server.address().port,
              path: '/api/upload/product-image',
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
          assert.equal(payload.imageUrl, 'https://res.cloudinary.com/test-cloud/image/upload/smp-test.png');
        }
        assert.deepEqual(uploadedBuffers.map((buffer) => buffer.toString()), formats.map((format) => format.bytes));
        assert.equal(uploadOptions.folder, 'smp-products');
        assert.equal(uploadOptions.resource_type, 'image');
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

test('the frontend Axios client sends FormData as multipart to the upload route', () => {
  const environment = {
    ...process.env,
    VERCEL: '1',
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret'
  };
  const result = runNodeModuleScript(`
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import path from 'node:path';
    import { pathToFileURL } from 'node:url';
    import { Writable } from 'node:stream';

    globalThis.localStorage = { getItem: () => null };
    globalThis.sessionStorage = { getItem: () => null };
    const require = createRequire(path.join(process.cwd(), 'package.json'));
    const cloudinary = require('cloudinary').v2;
    let uploadedBuffer = Buffer.alloc(0);
    cloudinary.uploader.upload_stream = (options, callback) => new Writable({
      write(chunk, encoding, done) {
        uploadedBuffer = Buffer.concat([uploadedBuffer, chunk]);
        done();
      },
      final(done) {
        done();
        callback(null, {
          secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/from-frontend.png',
          public_id: 'smp-products/from-frontend'
        });
      }
    });

    const authPath = require.resolve('./middleware/authMiddleware');
    require.cache[authPath] = {
      id: authPath,
      filename: authPath,
      loaded: true,
      exports: { protect: (req, res, next) => next(), authorize: () => (req, res, next) => next() }
    };
    const app = require('express')();
    app.use('/api/upload', require('./routes/uploadRoutes'));
    const server = app.listen(0, '127.0.0.1');

    try {
      await new Promise((resolve) => server.once('listening', resolve));
      const { default: api } = await import(
        pathToFileURL(path.resolve('../frontend/src/services/api.js')).href
      );
      const formData = new FormData();
      const imageBytes = 'frontend-file-object';
      formData.append('image', new Blob([imageBytes], { type: 'image/png' }), 'selected.png');
      const response = await api.post('/upload/product-image', formData, {
        baseURL: 'http://127.0.0.1:' + server.address().port + '/api'
      });

      assert.equal(response.status, 200);
      assert.equal(response.data.imageUrl, 'https://res.cloudinary.com/test-cloud/image/upload/from-frontend.png');
      assert.equal(uploadedBuffer.toString(), imageBytes);
    } finally {
      server.close();
    }
  `, environment);

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('missing and unsupported product image uploads return clear errors', () => {
  const environment = { ...process.env };
  delete environment.VERCEL;
  delete environment.CLOUDINARY_CLOUD_NAME;
  delete environment.CLOUDINARY_API_KEY;
  delete environment.CLOUDINARY_API_SECRET;
  const result = runNodeScript(`
    const assert = require('node:assert/strict');
    const express = require('express');
    const http = require('node:http');
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
      const send = async (fieldName, filename, mimeType) => {
        const boundary = 'smp-invalid-upload-' + (fieldName || 'missing');
        const filePart = filename
          ? 'Content-Disposition: form-data; name="' + fieldName + '"; filename="' + filename + '"\\r\\n' +
            'Content-Type: ' + mimeType + '\\r\\n\\r\\nnot-an-image\\r\\n'
          : '';
        const body = Buffer.from('--' + boundary + '\\r\\n' + filePart + '--' + boundary + '--\\r\\n');
        const response = await new Promise((resolve, reject) => {
          const request = http.request({
            hostname: '127.0.0.1',
            port: server.address().port,
            path: '/api/upload/product-image',
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
        return { status: response.statusCode, payload: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
      };

      try {
        const missing = await send(null, null, null);
        assert.equal(missing.status, 400);
        assert.match(missing.payload.message, /No image file was received.*image/);

        const unsupported = await send('image', 'animated.gif', 'image/gif');
        assert.equal(unsupported.status, 400);
        assert.match(unsupported.payload.message, /Only JPEG, JPG, PNG, and WEBP/);

        const wrongField = await send('images', 'product.png', 'image/png');
        assert.equal(wrongField.status, 400);
        assert.match(wrongField.payload.message, /Unexpected file field "images".*named "image"/);
      } catch (error) {
        console.error(error);
        process.exitCode = 1;
      } finally {
        server.close();
      }
    });
  `, environment);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Product image request/);
  assert.match(result.stdout, /reqFileExists: false/);
});

test('rejects upload payloads beyond the Vercel-safe file size with a clear response', () => {
  const environment = { ...process.env };
  delete environment.VERCEL;
  delete environment.CLOUDINARY_CLOUD_NAME;
  delete environment.CLOUDINARY_API_KEY;
  delete environment.CLOUDINARY_API_SECRET;
  const result = runNodeScript(`
    const assert = require('node:assert/strict');
    const express = require('express');
    const http = require('node:http');
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
      const boundary = 'smp-size-test';
      const body = Buffer.concat([
        Buffer.from(
          '--' + boundary + '\\r\\n' +
          'Content-Disposition: form-data; name="image"; filename="large.png"\\r\\n' +
          'Content-Type: image/png\\r\\n\\r\\n'
        ),
        Buffer.alloc(4 * 1024 * 1024 + 1),
        Buffer.from('\\r\\n--' + boundary + '--\\r\\n')
      ]);
      try {
        const response = await new Promise((resolve, reject) => {
          const request = http.request({
            hostname: '127.0.0.1',
            port: server.address().port,
            path: '/api/upload/product-image',
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
        assert.equal(response.statusCode, 413);
        assert.match(payload.message, /4 MB or smaller/);
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
            path: '/api/upload/product-image',
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
