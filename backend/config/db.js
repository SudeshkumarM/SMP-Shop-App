const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let mongodProcess = null;
const connectionCache = global.__smpMongoConnection || { connection: null, promise: null };
global.__smpMongoConnection = connectionCache;

const ensureDbDir = () => {
  if (process.env.VERCEL) {
    throw new Error('Local MongoDB startup is disabled in Vercel deployments.');
  }
  const dbDir = path.join(__dirname, '..', 'data', 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return dbDir;
};

const trySpawnMongod = async () => {
  if (process.env.VERCEL) return;
  const defaultPath = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
  if (fs.existsSync(defaultPath)) {
    const dbDir = ensureDbDir();
    console.log(`[Database] Attempting to auto-start local MongoDB server at ${dbDir}...`);
    try {
      mongodProcess = spawn(defaultPath, ['--dbpath', dbDir, '--port', '27017'], {
        detached: false,
        stdio: 'ignore'
      });
      mongodProcess.on('error', (err) => {
        console.error('[Database] Failed to spawn mongod:', err.message);
      });
      // Wait 2 seconds for socket initialization
      await new Promise((resolve) => setTimeout(resolve, 2500));
      console.log('[Database] MongoDB instance spawned successfully.');
    } catch (err) {
      console.error('[Database] Could not spawn local MongoDB:', err.message);
    }
  }
};

const connectDB = async () => {
  const isVercel = Boolean(process.env.VERCEL);
  const uri = process.env.MONGO_URI;

  if (isVercel) {
    // In Vercel serverless, log only once per cold start
    if (!global.__smpHasLoggedConnection) {
      global.__smpHasLoggedConnection = true;
      console.log('[Database] Initializing MongoDB connection (Vercel Serverless)...');
    }
  } else {
    console.log('[Database] Initializing MongoDB connection...');
  }

  if (!uri) {
    if (isVercel) {
      throw new Error('[Database] MONGO_URI environment variable is required in production. Please configure it in Vercel environment variables.');
    }
    console.warn('[Database] MONGO_URI not set. Falling back to localhost MongoDB for development only.');
    console.warn('[Database] For production, set MONGO_URI to your MongoDB Atlas connection string.');
  }

  const finalUri = uri || 'mongodb://127.0.0.1:27017/smp_db';
  
  // Ensure database name is smp_db (override if needed)
  if (finalUri.includes('/test') || finalUri.includes('/admin')) {
    console.warn('[Database] ⚠️  Warning: MONGO_URI is pointing to test or admin database.');
    console.warn('[Database] Please update MONGO_URI to use /smp_db database.');
  }
  const poolOptions = {
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: isVercel ? 15 : 200,
    minPoolSize: isVercel ? 2 : 20,
    socketTimeoutMS: 60000,
    maxIdleTimeMS: 30000
  };

  const connect = async () => {
    if (mongoose.connection.readyState === 1) {
      if (!isVercel) {
        console.log('[Database] MongoDB already connected.');
      }
      return mongoose;
    }

    if (!connectionCache.promise) {
      if (!isVercel) {
        console.log(`[Database] Connecting to MongoDB...`);
      }
      connectionCache.promise = mongoose.connect(finalUri, poolOptions);
    }

    try {
      connectionCache.connection = await connectionCache.promise;
      if (!connectionCache.hasLogged) {
        connectionCache.hasLogged = true;
        console.log(`[Database] ✅ MongoDB Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
      }
      return mongoose;
    } catch (error) {
      connectionCache.promise = null;
      throw error;
    }
  };

  try {
    return await connect();
  } catch (error) {
    console.error(`[Database] ❌ MongoDB connection failed: ${error.message}`);

    if (process.platform === 'win32' && !process.env.VERCEL && !uri) {
      console.warn('[Database] Attempting to spawn local MongoDB as fallback for development...');
      await trySpawnMongod();
      return connect();
    }

    throw error;
  }
};

process.on('exit', () => {
  if (mongodProcess) {
    try { mongodProcess.kill(); } catch (e) {}
  }
});

module.exports = connectDB;
