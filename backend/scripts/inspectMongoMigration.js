const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const modelTargets = {
  Admin: 'admins, profiles, user_roles',
  Branch: 'branches',
  Cart: 'carts, cart_items',
  Category: 'categories',
  Coupon: 'coupons, coupon_notifications',
  Customer: 'customers, customer_addresses, profiles',
  Expense: 'expenses',
  Investment: 'investments',
  Inventory: 'inventory, inventory_transactions',
  Invoice: 'bills, bill_items, audit_logs',
  Notification: 'notifications',
  Order: 'orders, order_items',
  OrderItem: 'order_items (standalone legacy records need review)',
  OtpVerification: 'Supabase Auth OTP; pending OTPs are not transferable',
  Owner: 'owner_profiles, profiles, user_roles',
  Payment: 'payments',
  Product: 'products, product_variants, product_images',
  QRCode: 'qr_codes',
  ScannerSettings: 'scanner_settings',
  Shop: 'shops, business_settings',
  Staff: 'staff, profiles, user_roles',
  Supplier: 'suppliers',
  User: 'Supabase Auth users, profiles, user_roles',
  WhatsAppLog: 'whatsapp_logs'
};

const loadModels = () => {
  const modelsPath = path.join(__dirname, '..', 'models');
  return fs.readdirSync(modelsPath)
    .filter((fileName) => fileName.endsWith('.js'))
    .sort()
    .map((fileName) => require(path.join(modelsPath, fileName)));
};

const inspect = async () => {
  if (!process.argv.includes('--dry-run')) {
    throw new Error('Pass --dry-run to run this read-only source inventory.');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be configured; the script will not fall back to a database.');
  }

  const models = loadModels();
  const unmappedModels = models.map((model) => model.modelName).filter((name) => !modelTargets[name]);
  if (unmappedModels.length > 0) {
    throw new Error(`Migration targets are missing for: ${unmappedModels.join(', ')}`);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    readPreference: 'secondaryPreferred',
    serverSelectionTimeoutMS: 5000,
    autoIndex: false
  });

  try {
    console.log('Read-only MongoDB migration inventory (counts only):');
    for (const model of models) {
      const count = await model.estimatedDocumentCount();
      console.log(`${model.modelName} (${model.collection.name}): ${count} -> ${modelTargets[model.modelName]}`);
    }
    console.log('No source records were read individually or modified. No Supabase connection was made.');
  } finally {
    await mongoose.disconnect();
  }
};

inspect().catch((error) => {
  console.error(`[Migration inventory] ${error.name}: read-only inspection failed; check configuration and MongoDB connectivity.`);
  process.exitCode = 1;
});
