
const mongoose = require('mongoose');

const connectionCache =
  global.__smpMongoConnection || {
    connection: null,
    promise: null,
    uri: null
  };

global.__smpMongoConnection = connectionCache;

const validateMongoUri = (uri) => {
  if (!uri) {
    throw new Error(
      'MONGO_URI is required and must target the Atlas test database.'
    );
  }

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

  if (!parsed.hostname.toLowerCase().endsWith('.mongodb.net')) {
    throw new Error(
      'MONGO_URI must point to a MongoDB Atlas cluster.'
    );
  }
  if (!parsed.hostname.toLowerCase().startsWith('smp-shop-cluster.')) {
    throw new Error(
      'MONGO_URI must point to the SMP-Shop-Cluster Atlas cluster.'
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
      "MONGO_URI must explicitly target the 'test' database."
    );
  }
};

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

const assertTestDatabase = () => {
  if (mongoose.connection.name !== 'test') {
    throw new Error(
      "MongoDB connection is not using the required 'test' database."
    );
  }
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  validateMongoUri(uri);

  if (connectionCache.uri && connectionCache.uri !== uri) {
    throw new Error(
      'MONGO_URI changed while the MongoDB connection is cached. Restart the process to use a different Atlas cluster.'
    );
  }

  if (mongoose.connection.readyState === 1) {
    assertTestDatabase();
    connectionCache.connection = mongoose.connection;
    connectionCache.uri = uri;
    return mongoose;
  }

  const poolOptions = {
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: 15,
    minPoolSize: 0,
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 30000
  };

  if (connectionCache.promise) {
    return connectionCache.promise;
  }

  connectionCache.uri = uri;

  const connectPromise = (async () => {
    if (mongoose.connection.readyState === 2) {
      await mongoose.connection.asPromise();
    } else if (mongoose.connection.readyState === 3) {
      await waitForDisconnect();
    }

    if (mongoose.connection.readyState === 1) {
      assertTestDatabase();
      connectionCache.connection = mongoose.connection;
      return mongoose;
    }

    await mongoose.connect(uri, poolOptions);
    assertTestDatabase();

    connectionCache.connection = mongoose.connection;

    if (!connectionCache.hasLogged) {
      connectionCache.hasLogged = true;

      console.log(
        `[Database] MongoDB Atlas connected to database: ${mongoose.connection.name}`
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
    connectionCache.uri = null;
    throw error;

  } finally {
    if (connectionCache.promise === connectPromise) {
      connectionCache.promise = null;
    }
  }
};

const exportedConnectDB = async () => {
  try {
    return await connectDB();

  } catch (error) {
    console.error(
      '[Database] MongoDB connection failed. Check Atlas network access, database-user credentials, and MONGO_URI configuration.',
      error.name || 'Error',
      error.code || 'unknown'
    );

    throw error;
  }
};

module.exports = exportedConnectDB;
