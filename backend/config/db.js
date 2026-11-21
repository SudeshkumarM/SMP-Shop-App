
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let mongodProcess = null;

const connectionCache =
  global.__smpMongoConnection || {
    connection: null,
    promise: null
  };

global.__smpMongoConnection = connectionCache;

// --------------------------------------------------
// LOCAL MONGODB DIRECTORY
// --------------------------------------------------

const ensureDbDir = () => {
  if (process.env.VERCEL) {
    throw new Error(
      'Local MongoDB startup is disabled on Vercel.'
    );
  }

  const dbDir = path.join(__dirname, '..', 'data', 'db');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return dbDir;
};

// --------------------------------------------------
// LOCAL MONGODB AUTO START
// --------------------------------------------------

const trySpawnMongod = async () => {
  if (process.env.VERCEL || mongodProcess) {
    return;
  }

  const defaultPath =
    'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';

  if (!fs.existsSync(defaultPath)) {
    console.warn('[Database] Local mongod.exe not found.');
    return;
  }

  const dbDir = ensureDbDir();

  try {
    mongodProcess = spawn(
      defaultPath,
      ['--dbpath', dbDir, '--port', '27017'],
      {
        detached: false,
        stdio: 'ignore'
      }
    );

    mongodProcess.on('error', (error) => {
      console.error(
        '[Database] Local MongoDB startup failed:',
        error.message
      );
      mongodProcess = null;
    });

    await new Promise((resolve) => setTimeout(resolve, 2500));

  } catch (error) {
    mongodProcess = null;

    console.error(
      '[Database] Could not start local MongoDB:',
      error.message
    );
  }
};

// --------------------------------------------------
// PRODUCTION URI VALIDATION
// --------------------------------------------------

const validateProductionUri = (uri) => {
  let parsed;

  try {
    parsed = new URL(uri);
  } catch {
    throw new Error(
      'MONGO_URI is not a valid MongoDB connection URI.'
    );
  }

  if (
    !['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)
  ) {
    throw new Error(
      'MONGO_URI must use mongodb:// or mongodb+srv://.'
    );
  }

  let databaseName;

  try {
    databaseName = decodeURIComponent(
      parsed.pathname.replace(/^\/+/, '')
    );
  } catch {
    throw new Error(
      'MONGO_URI contains an invalid database name.'
    );
  }

  if (databaseName !== 'test') {
    throw new Error(
      "Production MONGO_URI must explicitly target the 'test' database."
    );
  }
};

// --------------------------------------------------
// WAIT FOR DISCONNECTING CONNECTION
// --------------------------------------------------

const waitForDisconnect = async () => {
  const startedAt = Date.now();
  const timeout = 10000;

  while (
    mongoose.connection.readyState === 3 &&
    Date.now() - startedAt < timeout
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (mongoose.connection.readyState === 3) {
    throw new Error(
      'MongoDB is still disconnecting. Please retry the request.'
    );
  }
};

// --------------------------------------------------
// MONGODB CONNECTION
// --------------------------------------------------

const connectDB = async () => {
  const isVercel = Boolean(process.env.VERCEL);
  const uri = process.env.MONGO_URI;

  if (!uri && isVercel) {
    throw new Error(
      'MONGO_URI is required in Vercel Production environment variables.'
    );
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

  // State 1: Already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Reuse an existing connection attempt
  if (connectionCache.promise) {
    return connectionCache.promise;
  }

  // Create one shared connection operation
  const connectPromise = (async () => {

    // State 2: Another operation is connecting
    if (mongoose.connection.readyState === 2) {
      await mongoose.connection.asPromise();

      if (mongoose.connection.readyState === 1) {
        return mongoose;
      }
    }

    // State 3: Wait until disconnect completes
    if (mongoose.connection.readyState === 3) {
      await waitForDisconnect();
    }

    // Check again before creating a connection
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }

    // State 0: Disconnected - establish connection
    await mongoose.connect(finalUri, poolOptions);

    connectionCache.connection = mongoose.connection;

    if (!connectionCache.hasLogged) {
      connectionCache.hasLogged = true;

      console.log(
        `[Database] MongoDB connected: ${mongoose.connection.name}`
      );
    }

    return mongoose;
  })();

  // Cache immediately so concurrent requests share it
  connectionCache.promise = connectPromise;

  try {
    return await connectPromise;

  } catch (error) {
    connectionCache.connection = null;
    throw error;

  } finally {
    // Clear only the promise created by this operation
    if (connectionCache.promise === connectPromise) {
      connectionCache.promise = null;
    }
  }
};

// --------------------------------------------------
// EXPORTED DATABASE FUNCTION
// --------------------------------------------------

const exportedConnectDB = async () => {
  try {
    return await connectDB();

  } catch (error) {
    // Local Windows fallback only
    if (
      process.platform === 'win32' &&
      !process.env.VERCEL &&
      !process.env.MONGO_URI
    ) {
      console.warn(
        '[Database] Attempting local MongoDB startup fallback...'
      );

      await trySpawnMongod();

      return connectDB();
    }

    console.error(
      '[Database] MongoDB connection failed:',
      error.message
    );

    throw error;
  }
};

// --------------------------------------------------
// CLEANUP
// --------------------------------------------------

process.on('exit', () => {
  if (mongodProcess) {
    try {
      mongodProcess.kill();
    } catch (error) {
      // Ignore shutdown errors
    }
  }
});

module.exports = exportedConnectDB;
