/**
 * Migration Script for Supabase-to-MongoDB Customer Accounts
 * 
 * CONTEXT:
 * The previous implementation used Supabase Auth for customer authentication.
 * MongoDB User records were created with random passwords, while real passwords
 * were stored in Supabase. Since Supabase password hashes cannot be directly
 * transferred to MongoDB bcrypt, affected users must reset their passwords.
 * 
 * USAGE:
 * 1. Run in dry-run mode first: node backend/scripts/migrateSupabaseUsers.js --dry-run
 * 2. Review the output to see which users need password reset
 * 3. Execute the migration: node backend/scripts/migrateSupabaseUsers.js --migrate
 * 
 * WHAT THIS SCRIPT DOES:
 * - Identifies MongoDB User records with random/placeholder passwords
 * - Marks them as requiring password reset
 * - Sets a flag to force password reset on next login
 * - Does NOT delete any existing accounts or data
 * - Does NOT modify passwords (users must reset themselves)
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Customer = require('../models/Customer');

const isDryRun = process.argv.includes('--dry-run');
const isMigrate = process.argv.includes('--migrate');

if (!isDryRun && !isMigrate) {
  console.error('[Migration] Please specify --dry-run or --migrate');
  process.exit(1);
}

// Pattern to detect random passwords (from old Supabase implementation)
// These were 64-character hex strings from crypto.randomBytes(32)
const isRandomPassword = (password) => {
  return /^[a-f0-9]{64}$/.test(password);
};

const migrateSupabaseUsers = async () => {
  console.log('======================================================');
  console.log('  Supabase-to-MongoDB Customer Account Migration');
  console.log('======================================================');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (read-only)' : 'MIGRATE (will modify data)'}`);
  console.log('======================================================\n');

  try {
    // Connect to MongoDB
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI environment variable is required');
    }

    console.log('[Migration] Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('[Migration] Connected successfully\n');

    // Find all customer users
    console.log('[Migration] Scanning for customer accounts with random passwords...');
    const customersWithRandomPasswords = await User.find({
      role: 'customer',
      password: { $exists: true }
    }).select('_id email username phone password isActive');

    const affectedUsers = [];
    for (const user of customersWithRandomPasswords) {
      // Check if password is a random hex string (old Supabase implementation)
      if (user.password && isRandomPassword(user.password)) {
        affectedUsers.push({
          _id: user._id,
          email: user.email,
          username: user.username,
          phone: user.phone,
          isActive: user.isActive
        });
      }
    }

    console.log(`[Migration] Found ${affectedUsers.length} customer accounts requiring password reset\n`);

    if (affectedUsers.length === 0) {
      console.log('[Migration] No accounts require migration. All customer passwords appear valid.');
      console.log('[Migration] Migration complete.\n');
      await mongoose.disconnect();
      return;
    }

    // Display affected users
    console.log('[Migration] Affected Accounts:');
    console.log('------------------------------------------------------');
    affectedUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}, Username: ${user.username}, Phone: ${user.phone}`);
    });
    console.log('------------------------------------------------------\n');

    if (isDryRun) {
      console.log('[Migration] Dry-run complete. No data was modified.');
      console.log('[Migration] To execute migration, run with --migrate flag.\n');
      await mongoose.disconnect();
      return;
    }

    // Confirm migration
    console.log('[Migration] ⚠️  WARNING: This will mark accounts for password reset.');
    console.log('[Migration] Affected users will need to reset their password before logging in.');
    console.log('[Migration] Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Execute migration - mark users for password reset
    console.log('\n[Migration] Marking accounts for password reset...');
    let updatedCount = 0;

    for (const user of affectedUsers) {
      try {
        // Generate a password reset token
        const resetToken = crypto.randomBytes(24).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Update user with reset token and flag
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              resetPasswordToken: hashedToken,
              resetPasswordExpire: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
              requiresPasswordReset: true
            }
          }
        );
        
        updatedCount++;
        console.log(`[Migration] Marked ${user.email} for password reset`);
      } catch (err) {
        console.error(`[Migration] Failed to mark ${user.email}: ${err.message}`);
      }
    }

    console.log(`\n[Migration] Migration complete: ${updatedCount}/${affectedUsers.length} accounts marked`);
    console.log('[Migration] These users must use the password recovery flow to set a new password.');
    console.log('[Migration] Password reset tokens are valid for 7 days.\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error(`[Migration Error] ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

migrateSupabaseUsers();
