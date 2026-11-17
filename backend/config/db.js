const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let mongodProcess = null;

const ensureDbDir = () => {
  const dbDir = path.join(__dirname, '..', 'data', 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return dbDir;
};

const trySpawnMongod = async () => {
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
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smp_db';
  const poolOptions = {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 100, // High-concurrency connection pool
    minPoolSize: 10,
    socketTimeoutMS: 45000
  };

  try {
    const conn = await mongoose.connect(uri, poolOptions);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.warn(`[Database] Initial connection to ${uri} failed: ${error.message}`);
    // Attempt auto-spawn if running on Windows and local mongod is available
    if (process.platform === 'win32') {
      await trySpawnMongod();
      try {
        const conn = await mongoose.connect(uri, poolOptions);
        console.log(`[Database] MongoDB Connected after auto-spawn: ${conn.connection.host}/${conn.connection.name}`);
        return;
      } catch (retryErr) {
        console.error(`[Database] Retry failed: ${retryErr.message}`);
      }
    }
    console.error(`[Database] Error: Could not connect to MongoDB.`);
    console.error(`Please ensure MongoDB is running at ${uri}`);
    process.exit(1);
  }
};

process.on('exit', () => {
  if (mongodProcess) {
    try { mongodProcess.kill(); } catch (e) {}
  }
});

module.exports = connectDB;
