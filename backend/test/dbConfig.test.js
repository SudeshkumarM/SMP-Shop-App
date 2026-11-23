const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const connectionCache = global.__smpMongoConnection;

const withMongoConfig = async (uri, run) => {
  const originalVercel = process.env.VERCEL;
  const originalMongoUri = process.env.MONGO_URI;
  const originalConnect = mongoose.connect;
  const originalCache = {
    connection: connectionCache.connection,
    promise: connectionCache.promise,
    uri: connectionCache.uri,
    hasLogged: connectionCache.hasLogged
  };
  const originalNameDescriptor = Object.getOwnPropertyDescriptor(
    mongoose.connection,
    'name'
  );

  delete process.env.VERCEL;
  process.env.MONGO_URI = uri;
  connectionCache.connection = null;
  connectionCache.promise = null;
  connectionCache.uri = null;

  try {
    await run();
  } finally {
    mongoose.connect = originalConnect;

    if (originalNameDescriptor) {
      Object.defineProperty(
        mongoose.connection,
        'name',
        originalNameDescriptor
      );
    } else {
      delete mongoose.connection.name;
    }

    Object.assign(connectionCache, originalCache);

    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }

    if (originalMongoUri === undefined) {
      delete process.env.MONGO_URI;
    } else {
      process.env.MONGO_URI = originalMongoUri;
    }
  }
};

test('requires a MongoDB URI in local and production environments', async () => {
  await withMongoConfig('', async () => {
    await assert.rejects(
      connectDB(),
      /MONGO_URI is required and must target the Atlas test database/
    );
  });
});

test('rejects non-Atlas hosts and database names other than test', async () => {
  const invalidUris = [
    'mongodb://127.0.0.1:27017/test',
    'mongodb+srv://user:password@cluster.example.mongodb.net/smp_db',
    'mongodb+srv://user:password@cluster.example.mongodb.net/another'
  ];

  for (const uri of invalidUris) {
    await withMongoConfig(uri, async () => {
      await assert.rejects(connectDB());
    });
  }
});

test('shares the cached connection and passes the configured Atlas URI unchanged', async () => {
  const uri =
    'mongodb+srv://user:password@smp-shop-cluster.mongodb.net/test?retryWrites=true&w=majority';

  await withMongoConfig(uri, async () => {
    let receivedUri;
    let connectCount = 0;
    Object.defineProperty(mongoose.connection, 'name', {
      configurable: true,
      value: 'test'
    });
    mongoose.connect = async (connectionUri) => {
      connectCount += 1;
      receivedUri = connectionUri;
      await new Promise((resolve) => setImmediate(resolve));
      return mongoose;
    };

    const [first, second] = await Promise.all([
      connectDB(),
      connectDB()
    ]);

    assert.equal(receivedUri, uri);
    assert.equal(connectCount, 1);
    assert.equal(first, mongoose);
    assert.equal(second, mongoose);
  });
});

test('all application models use the shared default Mongoose connection', () => {
  const modelsPath = path.join(__dirname, '..', 'models');
  const models = fs.readdirSync(modelsPath)
    .filter((fileName) => fileName.endsWith('.js'))
    .map((fileName) => require(path.join(modelsPath, fileName)));

  assert.ok(models.length > 0);
  for (const model of models) {
    assert.equal(model.db, mongoose.connection, `${model.modelName} connection`);
  }
});
