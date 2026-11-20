const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://auth-test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_auth_test';

const { supabase } = require('../config/supabase');
const {
  SupabaseCustomerAuthError,
  assertNoCustomerDuplicate,
  authenticateCustomer,
  createCustomerIdentity
} = require('../services/supabaseCustomerAuth');

class SupabaseQuery {
  constructor(table, responses) {
    this.table = table;
    this.responses = responses;
    this.filters = {};
    this.action = 'select';
    this.selected = false;
  }

  select() {
    this.selected = true;
    return this;
  }

  update(value) {
    this.action = 'update';
    this.value = value;
    return this;
  }

  insert(value) {
    this.action = 'insert';
    this.value = value;
    return this;
  }

  eq(column, value) {
    this.filters[column] = value;
    return this;
  }

  result() {
    if (this.table === 'profiles' && this.action === 'update' && this.selected) {
      return { data: { id: this.filters.id }, error: null };
    }
    if (this.table === 'customers' && this.action === 'insert') {
      return { data: { id: 'customer-row-id' }, error: null };
    }
    return {
      data: this.responses[this.table]?.(this.filters) || null,
      error: null
    };
  }

  maybeSingle() {
    return Promise.resolve(this.result());
  }

  single() {
    return Promise.resolve(this.result());
  }

  then(resolve, reject) {
    return Promise.resolve(this.result()).then(resolve, reject);
  }
}

const withSupabaseMocks = async (responses, callback, authOverrides = {}) => {
  const originalFrom = supabase.from;
  const originalCreateUser = supabase.auth.admin.createUser;
  const originalDeleteUser = supabase.auth.admin.deleteUser;
  const originalResend = supabase.auth.resend;
  supabase.from = (table) => new SupabaseQuery(table, responses);
  supabase.auth.admin.createUser = authOverrides.createUser || (async () => ({
    data: { user: { id: 'auth-user-id', email: 'new@example.com' } },
    error: null
  }));
  supabase.auth.admin.deleteUser = authOverrides.deleteUser || (async () => ({ error: null }));
  supabase.auth.resend = authOverrides.resend || (async () => ({ error: null }));

  try {
    await callback();
  } finally {
    supabase.from = originalFrom;
    supabase.auth.admin.createUser = originalCreateUser;
    supabase.auth.admin.deleteUser = originalDeleteUser;
    supabase.auth.resend = originalResend;
  }
};

test('duplicate customer email, username, and mobile records are rejected', async () => {
  const candidate = {
    email: 'new@example.com',
    username: 'new_customer',
    phone: '9876543210'
  };
  for (const [column, value] of [
    ['email', candidate.email],
    ['username', candidate.username],
    ['phone', '+91' + candidate.phone]
  ]) {
    await withSupabaseMocks({
      profiles: (filters) => filters[column] === value ? { id: 'existing-id' } : null
    }, async () => {
      await assert.rejects(
        assertNoCustomerDuplicate(candidate),
        (error) => error instanceof SupabaseCustomerAuthError && error.statusCode === 409
      );
    });
  }
});

test('customer creation links Supabase auth, profile, role, Mongo ID, and confirmation email', async () => {
  let createdAttributes;
  let confirmationRequest;
  await withSupabaseMocks({
    user_roles: (filters) => filters.role === 'customer' ? { role: 'customer' } : null
  }, () => createCustomerIdentity({
      profile: {
        email: 'new@example.com',
        fullName: 'New Customer',
        username: 'new_customer',
        phone: '9876543210'
      },
      password: 'StrongPass9',
      mongoUserId: 'mongo-user-id',
      customerId: 'CUST-TEST',
      addresses: []
    }), {
    createUser: async (attributes) => {
      createdAttributes = attributes;
      return { data: { user: { id: 'auth-user-id' } }, error: null };
    },
    resend: async (request) => {
      confirmationRequest = request;
      return { error: null };
    }
  });

  assert.equal(createdAttributes.email, 'new@example.com');
  assert.equal(createdAttributes.password, 'StrongPass9');
  assert.equal(createdAttributes.email_confirm, false);
  assert.deepEqual(createdAttributes.app_metadata, { role: 'customer' });
  assert.deepEqual(confirmationRequest, { type: 'signup', email: 'new@example.com' });
});

test('customer login resolves a mobile number and authenticates with its Supabase email', async () => {
  const profile = {
    id: 'auth-user-id',
    email: 'customer@example.com',
    username: 'customer_one',
    legacy_mongo_id: 'mongo-user-id',
    is_active: true
  };
  const user = { _id: 'mongo-user-id', role: 'customer', isActive: true };
  let signInCredentials;

  await withSupabaseMocks({
    profiles: (filters) => filters.phone === '+919876543210' ? profile : null,
    user_roles: (filters) => filters.user_id === profile.id && filters.role === 'customer'
      ? { role: 'customer' }
      : null
  }, async () => {
    const result = await authenticateCustomer(
      '+91 9876543210',
      'StrongPass9',
      { findById: async (id) => id === user._id ? user : null },
      () => ({
        auth: {
          signInWithPassword: async (credentials) => {
            signInCredentials = credentials;
            return {
              data: { user: { id: profile.id, email_confirmed_at: '2026-11-20T00:00:00Z' } },
              error: null
            };
          }
        }
      })
    );

    assert.equal(result, user);
    assert.deepEqual(signInCredentials, { email: profile.email, password: 'StrongPass9' });
    assert.equal(user.isEmailVerified, true);
  });
});

test('incorrect passwords are rejected by Supabase and inactive accounts stay blocked', async () => {
  const profile = {
    id: 'auth-user-id',
    email: 'customer@example.com',
    legacy_mongo_id: 'mongo-user-id',
    is_active: true
  };
  const baseResponses = {
    profiles: () => profile,
    user_roles: () => ({ role: 'customer' })
  };

  await withSupabaseMocks(baseResponses, async () => {
    await assert.rejects(
      authenticateCustomer(
        'customer@example.com',
        'wrong-password',
        { findById: async () => null },
        () => ({
          auth: {
            signInWithPassword: async () => ({
              data: { user: null },
              error: { code: 'invalid_credentials' }
            })
          }
        })
      ),
      (error) => error instanceof SupabaseCustomerAuthError && error.statusCode === 401
    );
  });

  await withSupabaseMocks({
    profiles: () => ({ ...profile, is_active: false })
  }, async () => {
    await assert.rejects(
      authenticateCustomer(
        'customer@example.com',
        'StrongPass9',
        { findById: async () => null },
        () => {
          throw new Error('Inactive account must not reach Supabase password auth.');
        }
      ),
      (error) => error instanceof SupabaseCustomerAuthError && error.statusCode === 403
    );
  });
});

test('unconfirmed email remains blocked until the Supabase confirmation link is used', async () => {
  const profile = {
    id: 'auth-user-id',
    email: 'customer@example.com',
    legacy_mongo_id: 'mongo-user-id',
    is_active: true
  };

  await withSupabaseMocks({
    profiles: () => profile,
    user_roles: () => ({ role: 'customer' })
  }, async () => {
    await assert.rejects(
      authenticateCustomer(
        'customer@example.com',
        'StrongPass9',
        { findById: async () => null },
        () => ({
          auth: {
            signInWithPassword: async () => ({
              data: { user: null },
              error: { code: 'email_not_confirmed' }
            })
          }
        })
      ),
      (error) => error instanceof SupabaseCustomerAuthError &&
        error.statusCode === 403 &&
        error.message.includes('Email confirmation')
    );
  });
});
