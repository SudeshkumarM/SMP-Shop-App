require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Shop = require('../models/Shop');
const Branch = require('../models/Branch');
const Owner = require('../models/Owner');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Customer = require('../models/Customer');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Supplier = require('../models/Supplier');
const Investment = require('../models/Investment');
const Expense = require('../models/Expense');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Coupon = require('../models/Coupon');
const WhatsAppLog = require('../models/WhatsAppLog');
const ScannerSettings = require('../models/ScannerSettings');
const QRCode = require('../models/QRCode');

const seedCleanDatabase = async () => {
  try {
    await connectDB();
    console.log('[Clean Seed] Connected to database. Performing one-time cleanup of all demo data...');

    try {
      await mongoose.connection.db.dropDatabase();
      console.log('[Clean Seed] Database cleanly wiped of all demo customers, staff, admins, products, categories & bills.');
    } catch (e) {
      console.log('[Clean Seed] Drop database note:', e.message);
    }

    console.log('[Clean Seed] Creating Essential Master Owner Account...');

    // 1. Create Essential Master Owner Account (Required for initial access)
    const ownerUser = await User.create({
      name: 'Kumar',
      username: 'kumar',
      email: 'owner@smp.com',
      phone: '9840012345',
      password: 'Password123',
      role: 'owner',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true
    });

    await Owner.create({
      userId: ownerUser._id,
      ownerId: 'OWN-001',
      username: 'kumar',
      fullName: 'Kumar',
      email: ownerUser.email,
      phone: ownerUser.phone,
      isMasterOwner: true,
      panNumber: 'ABCDE1234F'
    });

    console.log('[Clean Seed] Creating Initial Shop & Flagship Branch...');

    // 2. Create Flagship Retail Shop Container
    const dressShop = await Shop.create({
      shopCode: 'SMP',
      name: 'SMP Elite Fashions',
      category: 'Dress & Apparel',
      description: 'SMP official retail storefront and enterprise management system.',
      logo: '',
      gstNumber: '33AAAAA0000A1Z5',
      contactEmail: 'contact@smp.com',
      contactPhone: '+91 98400 12345',
      businessPhoneNumber: '+91 98400 12345',
      adminNotificationNumber: '+91 98400 23456',
      ownerNotificationNumber: '+91 98400 12345',
      notifyOnNewBill: true,
      notifyOnOrderConfirmation: true,
      notifyOnPaymentConfirmation: true,
      notifyOnFailedMessage: true,
      notifyOnSystemAlerts: true,
      apiConnectionStatus: 'DISCONNECTED',
      address: {
        street: '100 Feet Road, Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600040',
        country: 'India'
      },
      ownerId: ownerUser._id,
      settings: {
        currency: 'INR',
        currencySymbol: '₹',
        defaultGstPercent: 5,
        lowStockThreshold: 10,
        enablePosBarcodeScan: true,
        invoicePrefix: 'SMP',
        deliverySettings: {
          enabled: true,
          deliveryCharge: 50,
          freeDeliveryThreshold: 1000,
          chargeType: 'FLAT',
          description: 'Standard Express Shipping (2-3 business days)'
        },
        gstSettings: {
          enabled: true,
          defaultGstPercent: 5,
          gstNumber: '33AAAAA0000A1Z5',
          compositionScheme: false
        },
        whatsappSettings: {
          enabled: false,
          apiUrl: 'https://graph.facebook.com/v18.0',
          apiKey: '',
          phoneNumberId: '',
          notifyOnOffer: false,
          notifyOnCoupon: false,
          notifyOnInvoice: false
        }
      }
    });

    // 3. Create Main Branch Container
    const mainBranch = await Branch.create({
      branchCode: 'SMP-B01',
      shopId: dressShop._id,
      name: 'SMP Flagship Store - Anna Nagar',
      address: {
        street: '100 Feet Road, Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600040'
      },
      phone: '+91 98400 12345',
      email: 'branch1@smp.com',
      isMainBranch: true,
      isActive: true
    });

    ownerUser.shopId = dressShop._id;
    ownerUser.branchId = mainBranch._id;
    await ownerUser.save();

    // 4. Create Default Hardware Scanner Settings
    await ScannerSettings.create({
      shopId: dressShop._id,
      scannerType: 'USB_BARCODE',
      barcodeFormat: 'CODE128',
      qrConfig: { prefix: 'smp:', payloadType: 'PRODUCT_OR_INVOICE', errorCorrection: 'M' },
      scannerActivated: true,
      defaultScanner: 'USB_BARCODE'
    });

    console.log('\n================================================================');
    console.log('  🎉 INITIAL CLEAN DATABASE INITIALIZATION COMPLETE!');
    console.log('================================================================');
    console.log('  ▸ Initial Products:    0 Products (Completely clean catalog)');
    console.log('  ▸ Initial Categories:  0 Categories (Admin/Owner must create)');
    console.log('  ▸ Initial Customers:   0 Customers');
    console.log('  ▸ Initial Staff:       0 Staff');
    console.log('  ▸ Initial Admins:      0 Admins (Owner can create in Owner Portal)');
    console.log('  ▸ Initial Invoices:    0 Invoices / Bills (Dashboards start at ₹0)');
    console.log('  ▸ Initial Orders:      0 Orders');
    console.log('  ▸ Initial Investments: 0 Investments');
    console.log('  ▸ Initial Expenses:    0 Expenses');
    console.log('  ▸ Essential Owner:     owner@smp.com / kumar / Password123');
    console.log('================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Clean Seed Error]:', error);
    process.exit(1);
  }
};

seedCleanDatabase();
