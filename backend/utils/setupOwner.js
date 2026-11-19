const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Owner = require('../models/Owner');

/**
 * SMP Master Owner Setup Routine
 * Enforces strictly ONE Master Owner account in the platform.
 * Reads credentials from environment variables or CLI arguments.
 */
const setupOwner = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smp_db';

  try {
    await mongoose.connect(mongoUri);
    console.log('\n======================================================');
    console.log('  👑  SMP Secure Initial Owner Setup');
    console.log('======================================================');

    // Parse CLI or environment variables
    const args = process.argv.slice(2);
    const getArg = (key) => {
      const idx = args.indexOf(`--${key}`);
      if (idx !== -1 && args[idx + 1]) return args[idx + 1];
      return null;
    };

    const isUpdate = args.includes('--update');
    const name = getArg('name') || process.env.OWNER_INITIAL_NAME;
    const username = getArg('username') || process.env.OWNER_INITIAL_USERNAME;
    const email = getArg('email') || process.env.OWNER_INITIAL_EMAIL;
    const password = getArg('password') || process.env.OWNER_INITIAL_PASSWORD;
    const phone = getArg('phone') || process.env.OWNER_INITIAL_PHONE || '9876543210';

    const existingOwnerCount = await User.countDocuments({ role: 'owner' });

    if (existingOwnerCount > 0 && !isUpdate) {
      const current = await User.findOne({ role: 'owner' });
      console.log(`\n[SMP Security Policy] An Owner account is already configured:`);
      console.log(`  ▸ Name:     ${current.name}`);
      console.log(`  ▸ Username: ${current.username || 'Not set'}`);
      console.log(`  ▸ Email:    ${current.email}`);
      console.log(`\nTo update this existing Owner account with new credentials, run:`);
      console.log(`  node backend/utils/setupOwner.js --update --name "..." --username "..." --email "..." --password "..."\n`);
      process.exit(0);
    }

    if (!name || !username || !email || !password) {
      console.error('\n[Error] Missing required Owner credentials.');
      console.error('Usage:');
      console.error('  node backend/utils/setupOwner.js --name "Owner Name" --username "ownerusername" --email "owner@smp.com" --password "SecurePass123" [--phone "9840012345"]');
      console.error('Or define in backend/.env:');
      console.error('  OWNER_INITIAL_NAME, OWNER_INITIAL_USERNAME, OWNER_INITIAL_EMAIL, OWNER_INITIAL_PASSWORD\n');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('[Error] Password must be at least 6 characters long.');
      process.exit(1);
    }

    if (isUpdate && existingOwnerCount > 0) {
      const existingUser = await User.findOne({ role: 'owner' });
      existingUser.name = name.trim();
      existingUser.username = username.trim().toLowerCase();
      existingUser.email = email.trim().toLowerCase();
      existingUser.phone = phone.trim();
      existingUser.password = password; // Pre-save hook will hash it with bcrypt
      await existingUser.save();

      await Owner.findOneAndUpdate(
        { userId: existingUser._id },
        {
          fullName: existingUser.name,
          username: existingUser.username,
          email: existingUser.email,
          phone: existingUser.phone,
          isMasterOwner: true
        },
        { upsert: true }
      );

      console.log(`\n✔ Master Owner account credentials updated successfully!`);
      console.log(`  ▸ Name:     ${existingUser.name}`);
      console.log(`  ▸ Username: ${existingUser.username}`);
      console.log(`  ▸ Email:    ${existingUser.email}`);
      console.log(`  ▸ Security: Password encrypted with bcrypt.`);
      console.log('======================================================\n');
      process.exit(0);
    }

    // Create single initial Owner
    const user = await User.create({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password, // Pre-save hook will hash it with bcrypt
      phone: phone.trim(),
      role: 'owner',
      isActive: true,
      isEmailVerified: true
    });

    const owner = await Owner.create({
      userId: user._id,
      ownerId: 'OWN-001',
      username: user.username,
      fullName: user.name,
      email: user.email,
      phone: user.phone,
      isMasterOwner: true
    });

    console.log(`\n✔ Master Owner account created successfully!`);
    console.log(`  ▸ Name:     ${user.name}`);
    console.log(`  ▸ Username: ${user.username}`);
    console.log(`  ▸ Email:    ${user.email}`);
    console.log(`  ▸ ID:       ${owner.ownerId}`);
    console.log(`  ▸ Security: Password encrypted with bcrypt.`);
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[Setup Error]:', err.message);
    process.exit(1);
  }
};

setupOwner();
