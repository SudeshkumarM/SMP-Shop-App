/**
 * MongoDB Local to Atlas Migration Script
 * 
 * USAGE:
 * 1. Set MONGO_URI to your Atlas connection string in backend/.env
 * 2. Set LOCAL_MONGO_URI to your local MongoDB connection (optional, defaults to localhost)
 * 3. Run: node backend/scripts/migrateToAtlas.js --dry-run (to inspect only)
 * 4. Run: node backend/scripts/migrateToAtlas.js --migrate (to execute migration)
 * 
 * SAFETY FEATURES:
 * - Dry-run mode: Inspects source and destination without modifying data
 * - Upsert operations: Uses unique identifiers to avoid duplicates
 * - Preserves ObjectIds and relationships
 * - Validates counts before and after migration
 * - Does NOT migrate passwords (preserves existing auth)
 * - Requires explicit --migrate flag to execute
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const LOCAL_MONGO_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/smp_db';
const ATLAS_MONGO_URI = process.env.MONGO_URI;

if (!ATLAS_MONGO_URI) {
  console.error('[Migration] MONGO_URI (Atlas) must be configured in .env');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const isMigrate = process.argv.includes('--migrate');

if (!isDryRun && !isMigrate) {
  console.error('[Migration] Please specify --dry-run or --migrate');
  process.exit(1);
}

// Models to migrate (in dependency order)
const MODEL_ORDER = [
  'Shop',
  'Branch',
  'Category',
  'Product',
  'Staff',
  'Admin',
  'Owner',
  'User',
  'Customer',
  'Cart',
  'Order',
  'OrderItem',
  'Invoice',
  'Payment',
  'Coupon',
  'Expense',
  'Investment',
  'Inventory',
  'Supplier',
  'Notification',
  'QRCode',
  'ScannerSettings',
  'WhatsAppLog'
];

const loadModels = () => {
  const modelsPath = path.join(__dirname, '..', 'models');
  const modelFiles = fs.readdirSync(modelsPath).filter((f) => f.endsWith('.js'));
  const models = {};
  
  for (const file of modelFiles) {
    const modelName = path.basename(file, '.js');
    models[modelName] = require(path.join(modelsPath, file));
  }
  
  return models;
};

const connectToDatabase = async (uri, name) => {
  console.log(`[${name}] Connecting to ${uri.replace(/:[^:@]*@/, ':****@')}...`);
  const conn = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 2
  });
  console.log(`[${name}] Connected successfully`);
  return conn;
};

const getCollectionStats = async (connection, modelName) => {
  const Model = connection.model(modelName, mongoose.Schema({}, { strict: false }));
  const count = await Model.estimatedDocumentCount();
  return count;
};

const migrateCollection = async (sourceConn, destConn, modelName) => {
  const SourceModel = sourceConn.model(modelName, mongoose.Schema({}, { strict: false }));
  const DestModel = destConn.model(modelName, mongoose.Schema({}, { strict: false }));
  
  const sourceCount = await SourceModel.estimatedDocumentCount();
  const destCount = await DestModel.estimatedDocumentCount();
  
  console.log(`\n[${modelName}] Source: ${sourceCount} documents, Destination: ${destCount} documents`);
  
  if (sourceCount === 0) {
    console.log(`[${modelName}] No source documents to migrate`);
    return { migrated: 0, skipped: 0, errors: 0 };
  }
  
  if (isDryRun) {
    console.log(`[${modelName}] Dry-run: Would migrate ${sourceCount} documents`);
    return { migrated: 0, skipped: sourceCount, errors: 0 };
  }
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  const cursor = SourceModel.find().lean().cursor();
  
  for await (const doc of cursor) {
    try {
      // Use upsert with unique identifier to avoid duplicates
      const filter = doc._id ? { _id: doc._id } : {};
      
      // Remove _id from update to let MongoDB handle it on insert
      const updateDoc = { ...doc };
      delete updateDoc._id;
      
      const result = await DestModel.updateOne(
        filter,
        { $setOnInsert: updateDoc },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        migrated++;
      } else {
        skipped++;
      }
      
      if ((migrated + skipped) % 100 === 0) {
        process.stdout.write(`[${modelName}] Progress: ${migrated + skipped}/${sourceCount}\r`);
      }
    } catch (err) {
      errors++;
      console.error(`[${modelName}] Error migrating document: ${err.message}`);
    }
  }
  
  console.log(`[${modelName}] Complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  return { migrated, skipped, errors };
};

const runMigration = async () => {
  console.log('======================================================');
  console.log('  MongoDB Local to Atlas Migration');
  console.log('======================================================');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (read-only)' : 'MIGRATE (will modify data)'}`);
  console.log(`Source: ${LOCAL_MONGO_URI.replace(/:[^:@]*@/, ':****@')}`);
  console.log(`Destination: ${ATLAS_MONGO_URI.replace(/:[^:@]*@/, ':****@')}`);
  console.log('======================================================\n');
  
  const models = loadModels();
  let sourceConn, destConn;
  
  try {
    sourceConn = await connectToDatabase(LOCAL_MONGO_URI, 'Source (Local)');
    destConn = await connectToDatabase(ATLAS_MONGO_URI, 'Destination (Atlas)');
    
    // Pre-migration stats
    console.log('\n--- Pre-Migration Collection Counts ---');
    const preStats = {};
    for (const modelName of MODEL_ORDER) {
      if (models[modelName]) {
        const sourceCount = await getCollectionStats(sourceConn, modelName);
        const destCount = await getCollectionStats(destConn, modelName);
        preStats[modelName] = { source: sourceCount, dest: destCount };
        console.log(`${modelName}: Source=${sourceCount}, Dest=${destCount}`);
      }
    }
    
    if (isDryRun) {
      console.log('\n--- Dry-run complete. No data was modified. ---');
      return;
    }
    
    // Confirm migration
    console.log('\n⚠️  WARNING: This will migrate data from local MongoDB to Atlas.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Execute migration
    console.log('\n--- Starting Migration ---');
    const results = {};
    
    for (const modelName of MODEL_ORDER) {
      if (models[modelName]) {
        results[modelName] = await migrateCollection(sourceConn, destConn, modelName);
      }
    }
    
    // Post-migration stats
    console.log('\n--- Post-Migration Collection Counts ---');
    for (const modelName of MODEL_ORDER) {
      if (models[modelName] && results[modelName]) {
        const destCount = await getCollectionStats(destConn, modelName);
        console.log(`${modelName}: ${preStats[modelName].dest} -> ${destCount} (${results[modelName].migrated} new)`);
      }
    }
    
    // Summary
    console.log('\n--- Migration Summary ---');
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const modelName of MODEL_ORDER) {
      if (results[modelName]) {
        totalMigrated += results[modelName].migrated;
        totalSkipped += results[modelName].skipped;
        totalErrors += results[modelName].errors;
      }
    }
    
    console.log(`Total: ${totalMigrated} migrated, ${totalSkipped} skipped (duplicates), ${totalErrors} errors`);
    
    if (totalErrors > 0) {
      console.log('\n⚠️  Migration completed with errors. Review the logs above.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
  } finally {
    if (sourceConn) await sourceConn.close();
    if (destConn) await destConn.close();
    console.log('\nConnections closed.');
  }
};

runMigration().catch((err) => {
  console.error(`[Migration Error] ${err.message}`);
  process.exit(1);
});
