const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Owner = require('../models/Owner');
const { validateRegistration } = require('../utils/authValidation');

/**
 * SMP Master Owner Setup Routine
 * Enforces strictly ONE Master Owner account in the platform.
 * Reads owner credentials from backend environment variables only.
 */
const setupOwner = async () => {
  try {
    await connectDB();
    console.log('\n======================================================');
    console.log('  👑  SMP Secure Initial Owner Setup');
    console.log('======================================================');

    const args = process.argv.slice(2);
    const isUpdate = args.includes('--update');

    const getArg = (flag) => {
      const idx = args.indexOf(flag);
      return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
    };

    const initialName = getArg('--name') || process.env.OWNER_INITIAL_NAME || 'SMP Master Owner';
    const initialUsername = getArg('--username') || process.env.OWNER_INITIAL_USERNAME || 'smpowner';
    const initialEmail = getArg('--email') || process.env.OWNER_INITIAL_EMAIL || 'owner@smpshop.com';
    const initialPassword = getArg('--password') || process.env.OWNER_INITIAL_PASSWORD || 'Owner@SMP2026!';
    const initialPhone = getArg('--phone') || process.env.OWNER_INITIAL_PHONE || '9876543210';

    const validation = validateRegistration({
      fullName: initialName,
      username: initialUsername,
      email: initialEmail,
      password: initialPassword,
      phone: initialPhone
    });

    const existingOwnerCount = await User.countDocuments({ role: 'owner' });

    if (existingOwnerCount > 0 && !isUpdate) {
      const current = await User.findOne({ role: 'owner' });
      console.log(`\n[SMP Security Policy] An Owner account is already configured:`);
      console.log(`  ▸ Name:     ${current.name}`);
      console.log(`  ▸ Username: ${current.username || 'Not set'}`);
      console.log(`  ▸ Email:    ${current.email}`);
      console.log(`\nTo update this existing Owner account with new credentials, run:`);
      console.log('  Update OWNER_INITIAL_* values in backend/.env, then run:');
      console.log('  node backend/utils/setupOwner.js --update\n');
      process.exit(0);
    }

    if (validation.error) {
      console.error(`\n[Error] ${validation.error}`);
      console.error('Usage:');
      console.error('  Configure OWNER_INITIAL_NAME, OWNER_INITIAL_USERNAME, OWNER_INITIAL_EMAIL, OWNER_INITIAL_PASSWORD, and OWNER_INITIAL_PHONE in backend/.env.');
      console.error('  Then run: node backend/utils/setupOwner.js [--update]\n');
      process.exit(1);
    }

    const { fullName: name, username, email, password, phone } = validation.value;

    if (isUpdate && existingOwnerCount > 0) {
      const existingUser = await User.findOne({ role: 'owner' });
      existingUser.name = name;
      existingUser.username = username;
      existingUser.email = email;
      existingUser.phone = phone;
      existingUser.password = password; // Pre-save hook will hash it with bcrypt
      await existingUser.save();

      const owner = await Owner.findOneAndUpdate(
        { $or: [{ userId: existingUser._id }, { ownerId: 'OWN-001' }, { isMasterOwner: true }] },
        {
          userId: existingUser._id,
          ownerId: 'OWN-001',
          fullName: existingUser.name,
          username: existingUser.username,
          email: existingUser.email,
          phone: existingUser.phone,
          isMasterOwner: true
        },
        { upsert: true, new: true }
      );

      console.log(`\n✔ Master Owner account credentials updated successfully!`);
      console.log(`  ▸ Name:     ${existingUser.name}`);
      console.log(`  ▸ Username: ${existingUser.username}`);
      console.log(`  ▸ Email:    ${existingUser.email}`);
      console.log(`  ▸ ID:       ${owner.ownerId}`);
      console.log(`  ▸ Security: Password encrypted with bcrypt.`);
      console.log('======================================================\n');
      process.exit(0);
    }

    // Create single initial Owner
    const user = await User.create({
      name,
      username,
      email,
      password, // Pre-save hook will hash it with bcrypt
      phone,
      role: 'owner',
      isActive: true,
      isEmailVerified: false
    });

    const owner = await Owner.findOneAndUpdate(
      { $or: [{ userId: user._id }, { ownerId: 'OWN-001' }, { isMasterOwner: true }] },
      {
        userId: user._id,
        ownerId: 'OWN-001',
        username: user.username,
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        isMasterOwner: true
      },
      { upsert: true, new: true }
    );

    console.log(`\n✔ Master Owner account created successfully!`);
    console.log(`  ▸ Name:     ${user.name}`);
    console.log(`  ▸ Username: ${user.username}`);
    console.log(`  ▸ Email:    ${user.email}`);
    console.log(`  ▸ ID:       ${owner.ownerId}`);
    console.log(`  ▸ Security: Password encrypted with bcrypt.`);
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error(`\n[Setup Error] Owner setup failed (${err.code || err.name || 'unknown error'}).`);
    process.exit(1);
  }
};

if (require.main === module) {
  setupOwner();
}

module.exports = setupOwner;
