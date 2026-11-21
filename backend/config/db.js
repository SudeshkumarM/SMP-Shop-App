
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let mongodProcess = null;

const connectionCache =
  global.__smpMongoConnection ||
  { connection: null, promise: null };

global.__smpMongoConnection = connectionCache;

const ensureDbDir = () => {
  if (process.env.VERCEL) {
    throw new Error('Local MongoDB startup is disabled on Vercel.');
  }

  const dbDir = path.join(__dirname, '..', 'data', 'db');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return dbDir;
};

const trySpawnMongod = async () => {
  if (process.env.VERCEL || mongodProcess) return;

  const defaultPath =
    'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';

  if (!fs.existsSync(defaultPath)) return;

  const dbDir = ensureDbDir();

  try {
    mongodProcess = spawn(
      defaultPath,
      ['--dbpath', dbDir, '--port', '27017'],
      { detached: false, stdio: 'ignore' }
    );

    mongodProcess.on('error', (error) => {
      console.error('[Database] Local MongoDB startup failed:', error.message);
      mongodProcess = null;
    });

    await new Promise((resolve) => setTimeout(resolve, 2500));
  } catch (error) {
    mongodProcess = null;
    console.error('[Database] Local MongoDB startup failed:', error.message);
  }
};

const validateProductionUri = (uri) => {
  let parsed;

  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGO_URI is not a valid MongoDB connection URI.');
  }

  if (
    !['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)
  ) {
    throw new Error('MONGO_URI must use mongodb:// or mongodb+srv://.');
  }

  let databaseName;

  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  } catch {
    throw new Error('MONGO_URI contains an invalid database name.');
  }

  if (databaseName !== 'smp_db') {
    throw new Error(
      "Production MONGO_URI must explicitly target the 'smp_db' database."
    );
  }
};

const connectDB = async () => {
  const isVercel = Boolean(process.env.VERCEL);
  const uri = process.env.MONGO_URI;

  if (!uri && isVercel) {
    throw new Error('MONGO_URI is required in Vercel environment variables.');
  }

  const finalUri =
    uri || 'mongodb://127.0.0.1:27017/smp_db';

  if (isVercel) {
    validateProductionUri(finalUri);
  }

  const poolOptions = {
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: isVercel ? 15 : 200,
    minPoolSize: isVercel ? 2 : 20,
    socketTimeoutMS: 60000,
    maxIdleTimeMS: 30000
  };

  // Reuse an active connection.
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Share an existing connection attempt between requests.
  if (connectionCache.promise) {
    try {
      await connectionCache.promise;

      if (mongoose.connection.readyState === 1) {
        return mongoose;
      }
    } catch (error) {
      // A failed promise must not block future retries.
      if (connectionCache.promise) {
        connectionCache.promise = null;
      }
      throw error;
    }
  }

  // Wait for a disconnect operation to settle.
  if (mongoose.connection.readyState === 3) {
    const startedAt = Date.now();

    while (
      mongoose.connection.readyState === 3 &&
      Date.now() - startedAt < 10000
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }

    if (mongoose.connection.readyState === 3) {
      throw new Error('MongoDB is still disconnecting. Retry the request.');
    }
  }

  // Create one shared connection promise.
  const connectPromise = mongoose.connect(finalUri, poolOptions);
  connectionCache.promise = connectPromise;

  try {
    await connectPromise;

    connectionCache.connection = mongoose.connection;

    if (!connectionCache.hasLogged) {
      connectionCache.hasLogged = true;
      console.log(
        `[Database] MongoDB connected: ${mongoose.connection.name}`
      );
    }

    return mongoose;
  } catch (error) {
    if (connectionCache.promise === connectPromise) {
      connectionCache.promise = null;
    }

    connectionCache.connection = null;

    throw error;
  }
};

module.exports = async () => {
  try {
    return await connectDB();
  } catch (error) {
    if (
      process.platform === 'win32' &&
      !process.env.VERCEL &&
      !process.env.MONGO_URI
    ) {
      await trySpawnMongod();
      return connectDB();
    }

    console.error('[Database] MongoDB connection failed:', error.message);
    throw error;
  }
};
