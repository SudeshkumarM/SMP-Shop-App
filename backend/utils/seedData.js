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
const { generateInvoiceBarcode } = require('../utils/generateBarcode');

const seedAll = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to database. Dropping previous collections for a clean setup...');

    try {
      await mongoose.connection.db.dropDatabase();
      console.log('[Seed] Database cleanly reset.');
    } catch (e) {
      console.log('[Seed] Drop database warning:', e.message);
    }

    console.log('[Seed] 1. Creating Master Owner Kumar...');

    // 1. Create Owner User & Profile
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

    console.log('[Seed] 2. Creating SMP Shop & Branch...');

    // 2. Create Flagship Dress Shop
    const dressShop = await Shop.create({
      shopCode: 'SMP',
      name: 'SMP Elite Fashions',
      category: 'Dress & Apparel',
      description: 'SMP Retail & E-Commerce platform initially tailored for quality shirts & apparel.',
      logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
      gstNumber: '33AAAAA0000A1Z5',
      contactEmail: 'contact@smp.com',
      contactPhone: '+91 98400 12345',
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
        invoicePrefix: 'SMP'
      }
    });

    // 3. Create Main Branch
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

    console.log('[Seed] 3. Creating Admin & Individual Staff Accounts...');

    // 4. Create Admin Account
    const adminUser = await User.create({
      name: 'Priya Sharma',
      username: 'admin01',
      email: 'admin@smp.com',
      phone: '9840023456',
      password: 'Password123',
      role: 'admin',
      shopId: dressShop._id,
      branchId: mainBranch._id,
      isActive: true
    });

    await Admin.create({
      userId: adminUser._id,
      adminId: 'ADM-101',
      username: 'admin01',
      shopId: dressShop._id,
      branchId: mainBranch._id,
      fullName: 'Priya Sharma',
      email: adminUser.email,
      phone: adminUser.phone
    });

    // 5. Create Staff 1 (kumar01 - Cashier)
    const staff1User = await User.create({
      name: 'Kumar',
      username: 'kumar01',
      email: 'staff@smp.com',
      phone: '9840034567',
      password: 'Password123',
      role: 'staff',
      shopId: dressShop._id,
      branchId: mainBranch._id,
      isActive: true
    });

    const staff1 = await Staff.create({
      userId: staff1User._id,
      staffId: 'STF-1001',
      username: 'kumar01',
      shopId: dressShop._id,
      branchId: mainBranch._id,
      fullName: 'Kumar',
      email: staff1User.email,
      phone: staff1User.phone,
      department: 'Billing & POS',
      designation: 'Senior Cashier & Billing Executive',
      jobRole: 'Senior Cashier',
      canEditBills: true,
      salary: 28000,
      totalBillsGenerated: 15,
      totalSalesValue: 35000
    });

    // 6. Create Staff 2 (staff02)
    const staff2User = await User.create({
      name: 'Anita Roy',
      username: 'staff02',
      email: 'staff02@smp.com',
      phone: '9840045678',
      password: 'Password123',
      role: 'staff',
      shopId: dressShop._id,
      branchId: mainBranch._id,
      isActive: true
    });

    await Staff.create({
      userId: staff2User._id,
      staffId: 'STF-1002',
      username: 'staff02',
      shopId: dressShop._id,
      branchId: mainBranch._id,
      fullName: 'Anita Roy',
      email: staff2User.email,
      phone: staff2User.phone,
      department: 'Billing & POS',
      designation: 'Billing Executive',
      jobRole: 'Billing Executive',
      canEditBills: false,
      salary: 22000,
      totalBillsGenerated: 5,
      totalSalesValue: 12000
    });

    console.log('[Seed] 4. Creating Customer Account...');

    // 7. Create Customer Account (Kumar)
    const customerUser = await User.create({
      name: 'Kumar',
      username: 'kumar_customer',
      email: 'customer@smp.com',
      phone: '9876543210',
      password: 'Password123',
      role: 'customer',
      shopId: dressShop._id,
      isPhoneVerified: true,
      isEmailVerified: true
    });

    const customer = await Customer.create({
      userId: customerUser._id,
      customerId: 'CUST-1001',
      username: 'kumar_customer',
      fullName: 'Kumar',
      email: customerUser.email,
      phone: customerUser.phone,
      isPhoneVerified: true,
      loyaltyPoints: 120,
      totalPurchases: 2,
      totalSpend: 2100,
      addresses: [{
        title: 'Home',
        street: '15 Gandhi Road, T. Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600017',
        country: 'India',
        isDefault: true
      }]
    });

    console.log('[Seed] 5. Creating Single Category & ONLY ONE Product (Shirt @ ₹500)...');

    // 8. ONLY ONE Category per requirements: "Do not create multiple product categories"
    const singleCategory = await Category.create({
      name: 'Apparel & Clothing',
      slug: 'apparel-clothing',
      description: 'Quality retail garments and everyday essential shirts.',
      image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
      shopId: dressShop._id,
      displayOrder: 1,
      isActive: true
    });

    // 9. ONLY ONE Product per requirements: "Initially create ONLY ONE PRODUCT. Product Name: Shirt, Selling Price: ₹500"
    const singleShirt = await Product.create({
      name: 'Shirt',
      sku: 'SMP-SHIRT-001',
      barcode: '890123450001',
      brand: 'SMP Fashions',
      category: singleCategory._id,
      shopId: dressShop._id,
      branchId: mainBranch._id,
      description: 'Premium Cotton Shirt tailored from breathable, lightweight fabric with regular collar and button-down front. Perfect for formal and casual occasions.',
      costPrice: 250,
      originalPrice: 600,
      sellingPrice: 500, // Exactly ₹500 per requirements
      discountPercent: 17, // ~₹100 discount off ₹600 MRP
      gstPercent: 5,
      finalPrice: 525, // ₹500 + 5% GST = ₹525
      availableQuantity: 150,
      lowStockThreshold: 10,
      images: [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80'
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colours: ['Classic White', 'Sky Blue', 'Navy Blue', 'Charcoal Grey'],
      rating: 4.8,
      numReviews: 24,
      isActive: true,
      isFeatured: true,
      isTrending: true,
      tags: ['shirt', 'cotton', 'formal', 'casual', 'men']
    });

    // 10. Create Supplier & Inventory Record for Shirt
    const supplier = await Supplier.create({
      companyName: 'Chennimalai Weaving Mills',
      contactPerson: 'M. Senthil',
      email: 'senthil@chennimalaimills.com',
      phone: '9842112233',
      address: {
        street: 'Weavers Industrial Estate',
        city: 'Erode',
        state: 'Tamil Nadu',
        pincode: '638051'
      },
      gstNumber: '33AAACM1122D1Z8',
      shopId: dressShop._id
    });

    await Inventory.create({
      productId: singleShirt._id,
      shopId: dressShop._id,
      branchId: mainBranch._id,
      currentStock: 150,
      reservedStock: 0,
      reorderPoint: 10,
      stockLogs: [{
        type: 'PURCHASE',
        quantity: 150,
        previousStock: 0,
        newStock: 150,
        costPricePerUnit: 250,
        supplier: supplier._id,
        notes: 'Initial Stock Inward - Cotton Shirts',
        performedBy: adminUser._id
      }]
    });

    console.log('[Seed] 6. Creating Initial Capital Investments & Expenses...');

    // 11. Initial Capital Investments
    await Investment.create([
      {
        investmentId: 'INV-CAP-001',
        shopId: dressShop._id,
        branchId: mainBranch._id,
        title: 'Initial Store Deposit & Interior Setup',
        category: 'Initial Capital',
        amount: 800000,
        date: new Date('2026-01-10'),
        sourceOfFunds: 'Owner Equity'
      },
      {
        investmentId: 'INV-CAP-002',
        shopId: dressShop._id,
        branchId: mainBranch._id,
        title: 'Initial Garment Stock Inward Fund',
        category: 'Inventory Capital',
        amount: 300000,
        date: new Date('2026-02-01'),
        sourceOfFunds: 'Owner Equity'
      }
    ]);

    // 12. Operating Expenses
    await Expense.create([
      {
        expenseId: 'EXP-2026-001',
        shopId: dressShop._id,
        branchId: mainBranch._id,
        category: 'Store Rent',
        title: 'Anna Nagar Commercial Store Rent',
        amount: 45000,
        date: new Date(),
        paymentMethod: 'Bank Transfer'
      },
      {
        expenseId: 'EXP-2026-002',
        shopId: dressShop._id,
        branchId: mainBranch._id,
        category: 'Electricity & Utilities',
        title: 'Monthly Electricity & Broadband',
        amount: 8500,
        date: new Date(),
        paymentMethod: 'UPI'
      }
    ]);

    console.log('[Seed] 7. Creating Initial Order & Invoice for Shirt...');

    // 13. Create sample initial POS sale
    const invNumber = 'SMP-INV-20261117-0001';
    const sampleOrder = await Order.create({
      orderNumber: 'POS-20261117-01',
      orderType: 'POS',
      shopId: dressShop._id,
      branchId: mainBranch._id,
      staffId: staff1._id,
      customerId: customer._id,
      customerDetails: {
        name: customer.fullName,
        phone: customer.phone,
        email: customer.email
      },
      items: [{
        productId: singleShirt._id,
        productName: singleShirt.name,
        sku: singleShirt.sku,
        barcode: singleShirt.barcode,
        size: 'L',
        colour: 'Classic White',
        quantity: 2,
        costPrice: 250,
        unitPrice: 500,
        discountAmount: 0,
        gstPercent: 5,
        gstAmount: 50,
        totalAmount: 1050
      }],
      subtotal: 1000,
      totalDiscount: 0,
      totalGst: 50,
      grandTotal: 1050,
      totalCost: 500,
      paymentMethod: 'POS_CASH',
      paymentStatus: 'PAID',
      orderStatus: 'DELIVERED',
      invoiceNumber: invNumber
    });

    await Invoice.create({
      invoiceNumber: invNumber,
      orderId: sampleOrder._id,
      shopId: dressShop._id,
      branchId: mainBranch._id,
      staffId: staff1._id,
      customerId: customer._id,
      shopInfo: {
        name: dressShop.name,
        address: `${dressShop.address.street}, ${dressShop.address.city}`,
        phone: dressShop.contactPhone,
        email: dressShop.contactEmail,
        gstNumber: dressShop.gstNumber
      },
      customerInfo: {
        name: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        address: '15 Gandhi Road, T. Nagar, Chennai'
      },
      items: [{
        productId: singleShirt._id,
        productName: singleShirt.name,
        sku: singleShirt.sku,
        barcode: singleShirt.barcode,
        size: 'L',
        colour: 'Classic White',
        quantity: 2,
        unitPrice: 500,
        discountAmount: 0,
        gstPercent: 5,
        gstAmount: 50,
        totalAmount: 1050
      }],
      subtotal: 1000,
      totalDiscount: 0,
      cgstAmount: 25,
      sgstAmount: 25,
      igstAmount: 0,
      grandTotal: 1050,
      paymentMethod: 'POS_CASH',
      paymentStatus: 'PAID',
      barcode: generateInvoiceBarcode(invNumber),
      printedCount: 1
    });

    console.log('\n=============================================================');
    console.log('  🎉 DATABASE SEEDING COMPLETED WITH ACCURATE DATA!');
    console.log('=============================================================');
    console.log('  ▸ Initial Product:  ONLY ONE Product -> "Shirt" @ ₹500');
    console.log('  ▸ Initial Category: "Apparel & Clothing"');
    console.log('  ▸ Owner:            owner@smp.com / kumar / Password123');
    console.log('  ▸ Admin:            admin@smp.com / admin01 / Password123');
    console.log('  ▸ Staff 1:          staff@smp.com / kumar01 / Password123 (Can Edit Bills)');
    console.log('  ▸ Staff 2:          staff02@smp.com / staff02 / Password123');
    console.log('  ▸ Customer:         customer@smp.com / kumar_customer / Password123');
    console.log('=============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedAll();
