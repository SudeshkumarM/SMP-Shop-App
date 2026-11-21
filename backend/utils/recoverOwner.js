/**
 * SMP Shop App - Master Owner Recovery & Admin Provisioning Utility
 * Recovers, updates, or sets up the Master Owner and Admin accounts.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('../config/db');

// Models
const User = require('../models/User');
const Owner = require('../models/Owner');
const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const Branch = require('../models/Branch');

async function recoverOwnerAndAdmin(options = {}) {
  const ownerConfig = {
    name: options.ownerName || process.env.OWNER_INITIAL_NAME || 'SMP Owner',
    username: (options.ownerUsername || process.env.OWNER_INITIAL_USERNAME || 'smp').trim().toLowerCase(),
    email: (options.ownerEmail || process.env.OWNER_INITIAL_EMAIL || 'dreamsparks1207@gmail.com').trim().toLowerCase(),
    phone: (options.ownerPhone || process.env.OWNER_INITIAL_PHONE || '8110805533').trim(),
    password: options.ownerPassword || process.env.OWNER_INITIAL_PASSWORD || 'SMPOfficial@2026'
  };

  const adminConfig = {
    name: options.adminName || 'SMP Store Admin',
    username: (options.adminUsername || 'smpadmin').trim().toLowerCase(),
    email: (options.adminEmail || 'admin@smpshop.com').trim().toLowerCase(),
    phone: (options.adminPhone || '9876543211').trim(),
    password: options.adminPassword || 'Admin@SMP2026!',
    adminId: 'ADM-101'
  };

  console.log('======================================================');
  console.log('  👑  SMP Owner Recovery & Admin Provisioning System  ');
  console.log('======================================================\n');

  await connectDB();

  // 1. Ensure Default Shop & Branch Exist
  let shop = await Shop.findOne();
  if (!shop) {
    shop = await Shop.create({
      shopCode: 'SMP-01',
      name: 'SMP Elite Fashions',
      category: 'Dress & Apparel',
      description: 'Premium Retail & Lifestyle Store',
      contactEmail: 'contact@smpshop.com',
      contactPhone: '8110805533',
      address: {
        street: '100 Cross Cut Road',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641012',
        country: 'India'
      },
      gstNumber: '33AAAAA0000A1Z5',
      isActive: true
    });
    console.log(`✔ Created Primary Shop: ${shop.name} (${shop._id})`);
  }

  let branch = await Branch.findOne({ shopId: shop._id });
  if (!branch) {
    branch = await Branch.create({
      shopId: shop._id,
      branchCode: 'BR-01',
      name: 'Main Flagship Branch',
      phone: '8110805533',
      email: 'flagship@smpshop.com',
      address: {
        street: '100 Cross Cut Road, Gandhipuram',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641012'
      },
      isMainBranch: true,
      isActive: true
    });
    console.log(`✔ Created Primary Branch: ${branch.name} (${branch.branchCode})`);
  }

  // 2. Recover / Update Existing Owner Account
  console.log('\n[Owner Recovery] Locating existing Owner account...');
  let existingOwnerDoc = await Owner.findOne().sort({ createdAt: 1 });
  let existingOwnerUser = null;

  if (existingOwnerDoc) {
    existingOwnerUser = await User.findById(existingOwnerDoc.userId);
  }

  if (!existingOwnerUser) {
    existingOwnerUser = await User.findOne({ role: 'owner' }).sort({ createdAt: 1 });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(ownerConfig.password, salt);

  let ownerUser;
  if (existingOwnerUser) {
    console.log(`✔ Found existing Owner account ID: ${existingOwnerUser._id}`);
    existingOwnerUser.name = ownerConfig.name;
    existingOwnerUser.username = ownerConfig.username;
    existingOwnerUser.email = ownerConfig.email;
    existingOwnerUser.phone = ownerConfig.phone;
    existingOwnerUser.password = ownerConfig.password; // Mongoose pre-save hashes this
    existingOwnerUser.isActive = true;
    existingOwnerUser.isEmailVerified = true;
    existingOwnerUser.isPhoneVerified = true;
    existingOwnerUser.shopId = shop._id;
    existingOwnerUser.branchId = branch._id;
    ownerUser = await existingOwnerUser.save();
    console.log(`✔ Updated existing Owner credentials to username: ${ownerConfig.username}, email: ${ownerConfig.email}`);
  } else {
    console.log('ℹ No existing Owner found. Initializing Master Owner account...');
    ownerUser = await User.create({
      name: ownerConfig.name,
      username: ownerConfig.username,
      email: ownerConfig.email,
      phone: ownerConfig.phone,
      password: ownerConfig.password,
      role: 'owner',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      shopId: shop._id,
      branchId: branch._id
    });
    console.log(`✔ Created new Master Owner account: ${ownerUser._id}`);
  }

  const ownerId = existingOwnerDoc?.ownerId || 'OWN-001';
  const ownerDoc = await Owner.findOneAndUpdate(
    { $or: [{ userId: ownerUser._id }, { ownerId }] },
    {
      userId: ownerUser._id,
      ownerId,
      username: ownerConfig.username,
      fullName: ownerConfig.name,
      email: ownerConfig.email,
      phone: ownerConfig.phone,
      isMasterOwner: true
    },
    { upsert: true, new: true }
  );

  console.log(`✔ Synchronized Owner Profile document (${ownerDoc.ownerId})`);

  // 3. Provision / Update Admin Account
  console.log('\n[Admin Setup] Configuring Store Administrator account...');
  let adminUser = await User.findOne({
    $or: [
      { email: adminConfig.email },
      { username: adminConfig.username },
      { role: 'admin' }
    ]
  });

  if (adminUser) {
    adminUser.name = adminConfig.name;
    adminUser.username = adminConfig.username;
    adminUser.email = adminConfig.email;
    adminUser.phone = adminConfig.phone;
    adminUser.password = adminConfig.password;
    adminUser.role = 'admin';
    adminUser.isActive = true;
    adminUser.isEmailVerified = true;
    adminUser.shopId = shop._id;
    adminUser.branchId = branch._id;
    await adminUser.save();
    console.log(`✔ Updated Store Admin account: ${adminUser.email}`);
  } else {
    adminUser = await User.create({
      name: adminConfig.name,
      username: adminConfig.username,
      email: adminConfig.email,
      phone: adminConfig.phone,
      password: adminConfig.password,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      shopId: shop._id,
      branchId: branch._id
    });
    console.log(`✔ Created Store Admin account: ${adminUser.email}`);
  }

  const adminDoc = await Admin.findOneAndUpdate(
    { $or: [{ userId: adminUser._id }, { adminId: adminConfig.adminId }] },
    {
      userId: adminUser._id,
      adminId: adminConfig.adminId,
      username: adminConfig.username,
      fullName: adminConfig.name,
      email: adminConfig.email,
      phone: adminConfig.phone,
      shopId: shop._id,
      branchId: branch._id,
      permissions: {
        manageCustomers: true,
        manageStaff: true,
        manageProducts: true,
        manageInventory: true,
        manageOrders: true,
        manageBills: true,
        viewReports: true
      },
      isActive: true
    },
    { upsert: true, new: true }
  );

  console.log(`✔ Synchronized Admin document (${adminDoc.adminId})`);

  console.log('\n======================================================');
  console.log('  🎉 CREDENTIALS RECOVERED & VERIFIED SUCCESSFULLY');
  console.log('======================================================');
  console.log('👑 OWNER CREDENTIALS:');
  console.log(`  ▸ Name:     ${ownerConfig.name}`);
  console.log(`  ▸ Username: ${ownerConfig.username}`);
  console.log(`  ▸ Email:    ${ownerConfig.email}`);
  console.log(`  ▸ Mobile:   ${ownerConfig.phone}`);
  console.log(`  ▸ Password: ${ownerConfig.password}`);
  console.log(`  ▸ Owner ID: ${ownerDoc.ownerId}`);
  console.log('------------------------------------------------------');
  console.log('🛡️ ADMIN CREDENTIALS:');
  console.log(`  ▸ Name:     ${adminConfig.name}`);
  console.log(`  ▸ Username: ${adminConfig.username}`);
  console.log(`  ▸ Email:    ${adminConfig.email}`);
  console.log(`  ▸ Mobile:   ${adminConfig.phone}`);
  console.log(`  ▸ Password: ${adminConfig.password}`);
  console.log(`  ▸ Admin ID: ${adminDoc.adminId}`);
  console.log('======================================================\n');

  return { ownerUser, ownerDoc, adminUser, adminDoc };
}

if (require.main === module) {
  recoverOwnerAndAdmin()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Recovery Error]:', err);
      process.exit(1);
    });
}

module.exports = recoverOwnerAndAdmin;
