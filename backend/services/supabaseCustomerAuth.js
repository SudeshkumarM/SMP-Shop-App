const { supabase, createSupabaseClient } = require('../config/supabase');
const {
  INDIAN_MOBILE_PATTERN,
  normalizeEmail,
  normalizeIndianMobile,
  normalizeUsername
} = require('../utils/authValidation');

class SupabaseCustomerAuthError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = 'SupabaseCustomerAuthError';
    this.statusCode = statusCode;
  }
}

const checkSupabaseError = (error, operation) => {
  if (!error) return;
  console.error(`[Supabase Auth] ${operation} failed (${error.code || 'database error'}).`);
  throw new SupabaseCustomerAuthError('Customer account service is temporarily unavailable.');
};

const assertNoCustomerDuplicate = async ({ email, username, phone }) => {
  const [emailResult, usernameResult, phoneResult] = await Promise.all([
    supabase.from('profiles').select('id').eq('email', email).maybeSingle(),
    supabase.from('profiles').select('id').eq('username', username).maybeSingle(),
    supabase.from('profiles').select('id').eq('phone', `+91${phone}`).maybeSingle()
  ]);
  checkSupabaseError(emailResult.error || usernameResult.error || phoneResult.error, 'duplicate lookup');

  if (emailResult.data) {
    const error = new SupabaseCustomerAuthError('An account with this email already exists.', 409);
    error.code = 'DUPLICATE_ACCOUNT';
    throw error;
  }
  if (usernameResult.data) {
    const error = new SupabaseCustomerAuthError('This username is already taken.', 409);
    error.code = 'DUPLICATE_ACCOUNT';
    throw error;
  }
  if (phoneResult.data) {
    const error = new SupabaseCustomerAuthError('An account with this mobile number already exists.', 409);
    error.code = 'DUPLICATE_ACCOUNT';
    throw error;
  }
};

const createCustomerIdentity = async ({ profile, password, mongoUserId, customerId, addresses }) => {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: profile.email,
    password,
    email_confirm: false,
    user_metadata: {
      full_name: profile.fullName,
      username: profile.username
    },
    app_metadata: { role: 'customer' }
  });

  if (createError || !created.user) {
    if (createError?.code === 'email_exists' || createError?.code === 'user_already_exists') {
      const error = new SupabaseCustomerAuthError('An account with this email already exists.', 409);
      error.code = 'DUPLICATE_ACCOUNT';
      throw error;
    }
    checkSupabaseError(createError, 'customer creation');
    throw new SupabaseCustomerAuthError('Customer account could not be created.');
  }

  const authUserId = created.user.id;

  try {
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        username: profile.username,
        phone: `+91${profile.phone}`,
        is_phone_verified: false,
        is_email_verified: false,
        legacy_mongo_id: String(mongoUserId),
        updated_at: new Date().toISOString()
      })
      .eq('id', authUserId)
      .select('id')
      .single();
    checkSupabaseError(profileError, 'customer profile update');
    if (!updatedProfile) {
      throw new SupabaseCustomerAuthError('Customer account profile could not be created.');
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        profile_id: authUserId,
        customer_code: customerId,
        full_name: profile.fullName,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
        is_phone_verified: false
      })
      .select('id')
      .single();
    checkSupabaseError(customerError, 'customer profile creation');

    if (addresses.length > 0) {
      const { error: addressError } = await supabase
        .from('customer_addresses')
        .insert(addresses.map((address) => ({ ...address, customer_id: customer.id })));
      checkSupabaseError(addressError, 'customer address creation');
    }

    const { data: customerRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authUserId)
      .eq('role', 'customer')
      .maybeSingle();
    checkSupabaseError(roleError, 'customer role creation');
    if (!customerRole) {
      throw new SupabaseCustomerAuthError('Customer role could not be assigned.', 503);
    }

    const { error: confirmationError } = await supabase.auth.resend({
      type: 'signup',
      email: profile.email
    });
    checkSupabaseError(confirmationError, 'customer email confirmation');

    return created.user;
  } catch (error) {
    await supabase.from('customers').delete().eq('profile_id', authUserId);
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(authUserId);
    if (cleanupError) {
      console.error(`[Supabase Auth] Customer rollback failed (${cleanupError.code || 'provider error'}).`);
    }
    throw error;
  }
};

const findCustomerProfile = async (identifier) => {
  const cleanIdentifier = String(identifier || '').trim();
  const profileQuery = supabase
    .from('profiles')
    .select('id, email, username, legacy_mongo_id, is_active');
  let query;
  if (cleanIdentifier.includes('@')) {
    query = profileQuery.eq('email', normalizeEmail(cleanIdentifier));
  } else {
    const normalizedPhone = normalizeIndianMobile(cleanIdentifier);
    query = INDIAN_MOBILE_PATTERN.test(normalizedPhone)
      ? profileQuery.eq('phone', `+91${normalizedPhone}`)
      : profileQuery.eq('username', normalizeUsername(cleanIdentifier));
  }
  const { data, error } = await query.maybeSingle();
  checkSupabaseError(error, 'customer lookup');
  return data;
};

const authenticateCustomer = async (identifier, password, User, authClientFactory = createSupabaseClient) => {
  const profile = await findCustomerProfile(identifier);
  if (!profile) return null;
  if (!profile.is_active) {
    throw new SupabaseCustomerAuthError('Your account has been deactivated. Please contact support.', 403);
  }

  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', profile.id)
    .eq('role', 'customer')
    .maybeSingle();
  checkSupabaseError(roleError, 'customer role lookup');
  if (!role) {
    throw new SupabaseCustomerAuthError('This account is not authorized for customer login.', 403);
  }

  const authClient = authClientFactory();
  const { data, error } = await authClient.auth.signInWithPassword({
    email: profile.email,
    password
  });

  if (error) {
    if (error.code === 'invalid_credentials') {
      throw new SupabaseCustomerAuthError('Invalid username, email, or mobile number or password.', 401);
    }
    if (error.code === 'email_not_confirmed') {
      throw new SupabaseCustomerAuthError('Email confirmation is required for this account.', 403);
    }
    console.error(`[Supabase Auth] Customer sign-in failed (${error.code || 'provider error'}).`);
    throw new SupabaseCustomerAuthError('Customer login service is temporarily unavailable.');
  }

  if (!data.user || data.user.id !== profile.id || !profile.legacy_mongo_id) {
    throw new SupabaseCustomerAuthError('Customer account profile requires administrator review.', 403);
  }

  const user = await User.findById(profile.legacy_mongo_id);
  if (!user || user.role !== 'customer') {
    throw new SupabaseCustomerAuthError('Customer account profile requires administrator review.', 403);
  }
  if (!user.isActive) {
    throw new SupabaseCustomerAuthError('Your account has been deactivated. Please contact support.', 403);
  }

  const emailVerified = Boolean(data.user.email_confirmed_at);
  const { error: verificationSyncError } = await supabase
    .from('profiles')
    .update({ is_email_verified: emailVerified })
    .eq('id', profile.id);
  checkSupabaseError(verificationSyncError, 'customer email verification sync');
  user.isEmailVerified = emailVerified;

  return user;
};

const updateCustomerPassword = async (mongoUserId, password) => {
  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('legacy_mongo_id', String(mongoUserId))
    .maybeSingle();
  checkSupabaseError(lookupError, 'customer password lookup');
  if (!profile) return false;

  const { error } = await supabase.auth.admin.updateUserById(profile.id, { password });
  checkSupabaseError(error, 'customer password update');
  return true;
};

const deleteCustomerIdentityByMongoId = async (mongoUserId) => {
  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('legacy_mongo_id', String(mongoUserId))
    .maybeSingle();
  checkSupabaseError(lookupError, 'customer rollback lookup');
  if (!profile) return;

  const { error: customerError } = await supabase
    .from('customers')
    .delete()
    .eq('profile_id', profile.id);
  checkSupabaseError(customerError, 'customer rollback');

  const { error } = await supabase.auth.admin.deleteUser(profile.id);
  checkSupabaseError(error, 'customer auth rollback');
};

module.exports = {
  SupabaseCustomerAuthError,
  assertNoCustomerDuplicate,
  createCustomerIdentity,
  authenticateCustomer,
  updateCustomerPassword,
  deleteCustomerIdentityByMongoId
};
