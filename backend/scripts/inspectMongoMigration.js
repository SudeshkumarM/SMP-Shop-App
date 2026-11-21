const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const modelTargets = {
  Admin: 'admins',
  Branch: 'branches',
  Cart: 'carts, cart_items',
  Category: 'categories',
  Coupon: 'coupons, coupon_notifications',
  Customer: 'customers, customer_addresses, customer_wishlist_items',
  Expense: 'expenses',
  Investment: 'investments',
  Inventory: 'inventory, inventory_transactions',
  Invoice: 'bills, bill_items (edit history remains on bills)',
  Notification: 'notifications (legacy model; verify usage before migration)',
  Order: 'orders, order_items',
  OrderItem: 'order_items (standalone legacy records need review)',
  OtpVerification: 'OTP verification records for password recovery',
  Owner: 'owner_profiles',
  Payment: 'payments',
  Product: 'products, product_variants, product_images',
  QRCode: 'qr_codes',
  ScannerSettings: 'scanner_settings',
  Shop: 'shops (nested settings remain in shops.settings)',
  Staff: 'staff',
  Supplier: 'suppliers',
  User: 'User authentication records (all roles)',
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
  const models = loadModels();
  const unmappedModels = models.map((model) => model.modelName).filter((name) => !modelTargets[name]);
  if (unmappedModels.length > 0) {
    throw new Error(`Migration targets are missing for: ${unmappedModels.join(', ')}`);
  }

  await connectDB();

  try {
    console.log('Read-only MongoDB migration inventory (counts only):');
    for (const model of models) {
      const count = await model.estimatedDocumentCount();
      console.log(`${model.modelName} (${model.collection.name}): ${count} -> ${modelTargets[model.modelName]}`);
    }
    console.log('No source records were read individually or modified.');
  } finally {
    await mongoose.disconnect();
  }
};

inspect().catch((error) => {
  console.error(`[Migration inventory] ${error.name}: read-only inspection failed; check configuration and MongoDB connectivity.`);
  process.exitCode = 1;
});
