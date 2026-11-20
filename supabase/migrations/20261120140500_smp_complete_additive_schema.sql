-- ============================================================================
-- SMP SHOP APP - MASTER COMPLETE ADDITIVE SUPABASE DATABASE MIGRATION
-- Migration: 20261120140500_smp_complete_additive_schema.sql
-- Timestamp: 2026-11-20 14:05:00 UTC
--
-- DESIGNED FOR PRODUCTION:
-- 1. 100% additive and idempotent; safe to execute against active databases.
-- 2. Preserves the 4 existing Supabase tables (profiles, user_roles, customers, customer_addresses).
-- 3. Never drops tables, never truncates data, never alters existing row values.
-- 4. Uses CREATE TABLE IF NOT EXISTS and ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- 5. Full enterprise multi-tenant scoping (Shop -> Branch -> Staff / Customer / POS).
-- 6. Comprehensive Row-Level Security (RLS) on all 35 application tables.
-- 7. Secure Supabase Auth compatibility (no public admin/owner signup, no registration OTP).
-- ============================================================================

-- ============================================================================
-- SECTION 1: CUSTOM TYPES AND ENUMS
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'smp_role'
  ) then
    create type public.smp_role as enum ('customer', 'staff', 'admin', 'owner');
  end if;
end;
$$;

-- ============================================================================
-- SECTION 2: BASE PRESERVED TABLES (EXISTING 4 TABLES + ADDITIVE EXTENSIONS)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_mongo_id text unique,
  email text,
  username text,
  phone text,
  full_name text not null default '',
  is_active boolean not null default true,
  is_phone_verified boolean not null default false,
  is_email_verified boolean not null default false,
  pending_email text,
  pending_email_verification_hash text,
  pending_email_verification_expires_at timestamptz,
  reset_password_token_hash text,
  reset_password_expires_at timestamptz,
  last_login_at timestamptz,
  shop_id uuid,
  branch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.smp_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  profile_id uuid unique references public.profiles(id) on delete set null,
  shop_id uuid,
  customer_code text not null unique,
  full_name text not null,
  username text,
  email text not null,
  phone text not null,
  is_phone_verified boolean not null default false,
  is_blocked boolean not null default false,
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  total_purchases integer not null default 0 check (total_purchases >= 0),
  total_spend numeric(14,2) not null default 0 check (total_spend >= 0),
  consent_promotional_whatsapp boolean not null default false,
  last_purchase_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null default 'Home',
  street text not null,
  city text not null,
  state text not null,
  pincode text not null,
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure any existing profiles, user_roles, customers, and customer_addresses
-- receive all supplementary application columns without altering existing data.
alter table public.profiles
  add column if not exists legacy_mongo_id text,
  add column if not exists email text,
  add column if not exists username text,
  add column if not exists phone text,
  add column if not exists full_name text not null default '',
  add column if not exists is_active boolean not null default true,
  add column if not exists is_phone_verified boolean not null default false,
  add column if not exists is_email_verified boolean not null default false,
  add column if not exists pending_email text,
  add column if not exists pending_email_verification_hash text,
  add column if not exists pending_email_verification_expires_at timestamptz,
  add column if not exists reset_password_token_hash text,
  add column if not exists reset_password_expires_at timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists shop_id uuid,
  add column if not exists branch_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_roles
  add column if not exists user_id uuid,
  add column if not exists role public.smp_role,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.customers
  add column if not exists legacy_mongo_id text,
  add column if not exists profile_id uuid,
  add column if not exists shop_id uuid,
  add column if not exists customer_code text,
  add column if not exists full_name text,
  add column if not exists username text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists is_phone_verified boolean not null default false,
  add column if not exists is_blocked boolean not null default false,
  add column if not exists loyalty_points integer not null default 0,
  add column if not exists total_purchases integer not null default 0,
  add column if not exists total_spend numeric(14,2) not null default 0,
  add column if not exists consent_promotional_whatsapp boolean not null default false,
  add column if not exists last_purchase_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.customer_addresses
  add column if not exists legacy_mongo_id text,
  add column if not exists customer_id uuid,
  add column if not exists title text not null default 'Home',
  add column if not exists street text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pincode text,
  add column if not exists country text not null default 'India',
  add column if not exists is_default boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Base table unique & lookup indexes
create unique index if not exists profiles_legacy_mongo_id_key
  on public.profiles (legacy_mongo_id) where legacy_mongo_id is not null;
create unique index if not exists profiles_email_lower_uidx
  on public.profiles (lower(email)) where email is not null;
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username)) where username is not null;
create unique index if not exists user_roles_user_id_role_key
  on public.user_roles (user_id, role);
create unique index if not exists customers_legacy_mongo_id_key
  on public.customers (legacy_mongo_id) where legacy_mongo_id is not null;
create unique index if not exists customers_profile_id_key
  on public.customers (profile_id) where profile_id is not null;
create unique index if not exists customers_customer_code_key
  on public.customers (customer_code) where customer_code is not null;
create index if not exists customers_username_idx
  on public.customers (username) where username is not null;
create index if not exists customers_email_idx on public.customers (email);
create index if not exists customers_phone_idx on public.customers (phone);
create unique index if not exists customer_addresses_legacy_mongo_id_key
  on public.customer_addresses (legacy_mongo_id) where legacy_mongo_id is not null;
create index if not exists customer_addresses_customer_idx
  on public.customer_addresses (customer_id);
create index if not exists customers_shop_idx
  on public.customers (shop_id);

-- ============================================================================
-- SECTION 3: CORE ENTERPRISE AND MULTI-BRANCH TABLES
-- ============================================================================
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  shop_code text not null unique,
  name text not null,
  category text not null,
  description text not null default '',
  logo text not null default '',
  gst_number text not null default '',
  contact_email text not null,
  contact_phone text not null,
  address jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_code text not null,
  name text not null,
  address jsonb not null default '{}'::jsonb,
  phone text not null,
  email text not null default '',
  is_main_branch boolean not null default false,
  manager_staff_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, branch_code)
);

-- ============================================================================
-- SECTION 4: ROLE-SPECIFIC PROFILES
-- ============================================================================
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  staff_code text not null unique,
  username text,
  full_name text not null,
  email text not null,
  phone text not null,
  department text not null default 'Billing & POS',
  designation text not null default 'Cashier / Billing Executive',
  job_role text not null default 'Cashier / Billing Executive',
  can_edit_bills boolean not null default false,
  salary numeric(14,2) not null default 0 check (salary >= 0),
  join_date date not null default current_date,
  is_active boolean not null default true,
  shift text not null default 'General'
    check (shift in ('Morning', 'Evening', 'General', 'Night')),
  total_bills_generated integer not null default 0,
  total_sales_value numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  admin_code text not null unique,
  username text,
  full_name text not null,
  email text not null,
  phone text not null,
  permissions jsonb not null default
    '{"manageCustomers":true,"manageStaff":true,"manageProducts":true,"manageInventory":true,"manageOrders":true,"manageBills":true,"viewReports":true}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owner_profiles (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  owner_code text not null unique,
  username text,
  full_name text not null,
  email text not null,
  phone text not null,
  is_master_owner boolean not null default true,
  pan_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforce exactly one active master owner profile at the database level
create unique index if not exists owner_profiles_single_master_uidx
  on public.owner_profiles (is_master_owner) where is_master_owner;

-- ============================================================================
-- SECTION 5: CATALOG, PRODUCTS, AND INVENTORY
-- ============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  category_code text,
  name text not null,
  slug text not null,
  shop_id uuid not null references public.shops(id) on delete restrict,
  description text not null default '',
  image text not null default '',
  parent_category_id uuid references public.categories(id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  name text not null,
  sku text not null,
  barcode text not null,
  barcode_format text not null default 'CODE128'
    check (barcode_format in ('CODE128', 'EAN13', 'UPCA')),
  qr_code_data text not null default '',
  qr_code_type text not null default 'PRODUCT'
    check (qr_code_type in ('PRODUCT', 'PAYMENT', 'INVOICE', 'CUSTOM')),
  brand text not null default 'SMP Fashion',
  category_id uuid not null references public.categories(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  description text not null,
  cost_price numeric(14,2) not null default 0,
  original_price numeric(14,2) not null,
  selling_price numeric(14,2) not null,
  discount_percent numeric(6,3) not null default 0,
  gst_percent numeric(6,3) not null default 5,
  final_price numeric(14,2) not null,
  available_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  sizes text[] not null default '{}',
  colours text[] not null default '{}',
  rating numeric(3,2) not null default 4.5 check (rating between 0 and 5),
  num_reviews integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, sku)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null default '',
  colour text not null default '',
  colour_hex text not null default '#000000',
  stock integer not null default 0,
  sku text,
  barcode text,
  price numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  product_id uuid not null references public.products(id) on delete cascade,
  bucket_id text not null default 'product-images',
  storage_path text,
  legacy_url text,
  alt_text text not null default '',
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or legacy_url is not null)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  product_id uuid not null references public.products(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  current_stock integer not null default 0,
  reorder_level integer not null default 10,
  cost_price numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  last_restocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, product_id)
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  inventory_id uuid not null references public.inventory(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  transaction_type text not null
    check (transaction_type in ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE')),
  quantity integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  unit_cost numeric(14,2) not null default 0,
  reference_id text not null default '',
  notes text not null default '',
  performed_by uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  shop_id uuid not null references public.shops(id) on delete restrict,
  company_name text not null,
  contact_person text not null,
  email text,
  phone text not null,
  gst_number text,
  address jsonb not null default '{}'::jsonb,
  payment_terms text not null default 'Net 30',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- SECTION 6: CUSTOMER COMMERCE, CART, ORDER AND BILLING FLOW
-- ============================================================================
create table if not exists public.customer_wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  user_id uuid references public.profiles(id) on delete cascade,
  guest_session_id text,
  shop_id uuid not null references public.shops(id) on delete restrict,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  gst_amount numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_session_id is not null)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  size text not null default '',
  colour text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null,
  gst_percent numeric(6,3) not null default 5,
  final_price numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  order_number text not null unique,
  order_type text not null default 'ONLINE' check (order_type in ('ONLINE', 'POS')),
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  customer_details jsonb not null default '{}'::jsonb,
  subtotal numeric(14,2) not null,
  total_discount numeric(14,2) not null default 0,
  total_gst numeric(14,2) not null default 0,
  shipping_fee numeric(14,2) not null default 0,
  delivery_charge numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null,
  total_cost numeric(14,2) not null default 0,
  payment_method text not null
    check (payment_method in ('COD', 'ONLINE', 'POS_CASH', 'POS_CARD', 'POS_UPI', 'POS_UPI_QR')),
  payment_status text not null default 'PENDING'
    check (payment_status in ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  payment_details jsonb not null default '{}'::jsonb,
  order_status text not null default 'PLACED'
    check (order_status in ('PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  refund_status text not null default 'NONE'
    check (refund_status in ('NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED')),
  tracking_number text not null default '',
  invoice_number text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text not null default '',
  barcode text not null default '',
  image text not null default '',
  size text not null default '',
  colour text not null default '',
  quantity integer not null check (quantity > 0),
  cost_price numeric(14,2) not null default 0,
  unit_price numeric(14,2) not null,
  discount_percent numeric(6,3) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  gst_percent numeric(6,3) not null default 5,
  gst_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  invoice_number text not null unique,
  order_id uuid references public.orders(id) on delete set null,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  shop_snapshot jsonb not null default '{}'::jsonb,
  customer_snapshot jsonb not null default '{}'::jsonb,
  subtotal numeric(14,2) not null,
  total_discount numeric(14,2) not null default 0,
  delivery_charge numeric(14,2) not null default 0,
  cgst_amount numeric(14,2) not null default 0,
  sgst_amount numeric(14,2) not null default 0,
  igst_amount numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null,
  payment_method text not null,
  payment_status text not null default 'PAID',
  payment_details jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'PENDING',
  barcode text,
  printed_count integer not null default 0,
  is_deleted boolean not null default false,
  deleted_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  delete_reason text not null default '',
  edit_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_items (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  bill_id uuid not null references public.bills(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text not null default '',
  barcode text not null default '',
  size text not null default '',
  colour text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null,
  discount_amount numeric(14,2) not null default 0,
  gst_percent numeric(6,3) not null default 5,
  gst_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  payment_id text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'INR',
  payment_method text not null
    check (payment_method in ('COD', 'ONLINE', 'POS_CASH', 'POS_CARD', 'POS_UPI')),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  transaction_ref text not null default '',
  gateway_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- SECTION 7: MARKETING, SETTINGS, HARDWARE AND FINANCIAL LEDGERS
-- ============================================================================
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  code text not null unique,
  title text not null,
  description text not null default '',
  discount_percent numeric(6,3) not null check (discount_percent between 1 and 100),
  min_purchase_amount numeric(14,2) not null default 0,
  start_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_active boolean not null default true,
  send_whatsapp boolean not null default false,
  validity_days integer not null default 10,
  eligibility_criteria text not null default 'ALL_CONSENTED'
    check (eligibility_criteria in ('ALL_CONSENTED', 'MIN_PURCHASE', 'RETURNING_CUSTOMERS', 'NEW_CUSTOMERS')),
  min_lifetime_spend numeric(14,2) not null default 0,
  min_orders_count integer not null default 0,
  usage_count integer not null default 0,
  shop_id uuid references public.shops(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_notifications (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  recipient_phone text not null,
  sent_at timestamptz not null default now(),
  unique (coupon_id, recipient_phone)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  expense_code text not null unique,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null check (category in (
    'Store Rent', 'Employee Salaries', 'Electricity & Utilities',
    'Marketing & Advertising', 'Store Maintenance & Repairs',
    'Packaging & Shopping Bags', 'Courier & Logistics',
    'Software & IT Subscriptions', 'Miscellaneous Expenses'
  )),
  payment_method text not null default 'Bank Transfer'
    check (payment_method in ('Bank Transfer', 'Cash', 'UPI', 'Cheque', 'Corporate Card')),
  expense_date timestamptz not null default now(),
  vendor_name text not null default '',
  invoice_number text not null default '',
  notes text not null default '',
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  investment_code text not null unique,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null check (category in (
    'Initial Capital', 'Store Renovation & Interior',
    'Machinery & Equipment', 'IT & POS Hardware',
    'Inventory Capital', 'Marketing & Launch Fund',
    'Additional Working Capital'
  )),
  investment_date timestamptz not null default now(),
  source_of_funds text not null default 'Owner Equity',
  notes text not null default '',
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  shop_id uuid not null references public.shops(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, setting_key)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  shop_id uuid references public.shops(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text not null default '',
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'all'
    check (role in ('customer', 'staff', 'admin', 'owner', 'all')),
  shop_id uuid references public.shops(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'SYSTEM'
    check (type in ('ORDER', 'STOCK_ALERT', 'BILLING', 'PAYMENT', 'PROMO', 'SYSTEM')),
  is_read boolean not null default false,
  link text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  title text not null,
  qr_type text not null default 'PRODUCT'
    check (qr_type in ('PRODUCT', 'PAYMENT', 'INVOICE', 'CUSTOM')),
  target_id text not null default '',
  target_name text not null default '',
  qr_data text not null,
  description text not null default '',
  shop_id uuid not null references public.shops(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scanner_settings (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  shop_id uuid not null unique references public.shops(id) on delete cascade,
  scanner_type text not null default 'USB_BARCODE'
    check (scanner_type in ('USB_BARCODE', 'CAMERA_BARCODE', 'CAMERA_QR')),
  barcode_format text not null default 'CODE128'
    check (barcode_format in ('CODE128', 'EAN13', 'UPCA')),
  qr_config jsonb not null default '{}'::jsonb,
  scanner_activated boolean not null default true,
  selected_camera_id text not null default '',
  camera_permission_status text not null default 'prompt'
    check (camera_permission_status in ('granted', 'prompt', 'denied')),
  default_scanner text not null default 'USB_BARCODE'
    check (default_scanner in ('USB_BARCODE', 'CAMERA_BARCODE', 'CAMERA_QR')),
  last_tested_at timestamptz,
  test_scan_result text not null default '',
  test_scan_type text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  recipient_phone text not null,
  recipient_name text not null default 'Customer',
  customer_id uuid references public.customers(id) on delete set null,
  message_type text not null
    check (message_type in ('OFFER', 'COUPON', 'INVOICE', 'TRANSACTIONAL')),
  channel text not null default 'WHATSAPP' check (channel in ('WHATSAPP', 'SMS')),
  template_name text not null default 'general_notice',
  content text not null,
  status text not null default 'SENT'
    check (status in ('SENT', 'SIMULATED', 'FAILED', 'OPTED_OUT', 'SKIPPED', 'WHATSAPP_SENT', 'SMS_SENT')),
  provider_response jsonb,
  error_message text,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- SECTION 8: AUTHENTICATION AND SECURITY STORAGE
-- ============================================================================
create table if not exists public.auth_otp_verifications (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  purpose text not null check (purpose in ('REGISTRATION', 'FORGOT_PASSWORD')),
  channel text not null check (channel in ('sms', 'email')),
  otp_hash text not null,
  password_hash text,
  registration_payload jsonb,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'consumed', 'expired')),
  registration_status text not null default 'not_applicable'
    check (registration_status in ('pending', 'completed', 'not_applicable')),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  resend_count smallint not null default 0 check (resend_count between 0 and 4),
  last_sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identifier, purpose)
);

create table if not exists public.registration_captcha_challenges (
  id uuid primary key,
  answer_hash text not null check (answer_hash ~ '^[0-9a-f]{64}$'),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- SECTION 9: DEFERRED FOREIGN KEYS AND CROSS-DEPENDENCY CONSTRAINTS
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_shop_id_fkey'
    and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_shop_id_fkey
      foreign key (shop_id) references public.shops(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_branch_id_fkey'
    and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_branch_id_fkey
      foreign key (branch_id) references public.branches(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'branches_manager_staff_id_fkey'
    and conrelid = 'public.branches'::regclass) then
    alter table public.branches add constraint branches_manager_staff_id_fkey
      foreign key (manager_staff_id) references public.staff(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'customers_shop_id_shops_fkey'
    and conrelid = 'public.customers'::regclass) then
    alter table public.customers add constraint customers_shop_id_shops_fkey
      foreign key (shop_id) references public.shops(id) on delete set null not valid;
  end if;
end;
$$;

-- ============================================================================
-- SECTION 10: PERFORMANCE AND SEARCH INDEXES
-- ============================================================================
create index if not exists branches_shop_idx on public.branches (shop_id);
create index if not exists branches_manager_staff_idx on public.branches (manager_staff_id);
create index if not exists staff_shop_branch_idx on public.staff (shop_id, branch_id);
create index if not exists staff_username_idx on public.staff (username) where username is not null;
create index if not exists admins_shop_branch_idx on public.admins (shop_id, branch_id);
create index if not exists admins_username_idx on public.admins (username) where username is not null;
create index if not exists owner_profiles_username_idx
  on public.owner_profiles (username) where username is not null;
create index if not exists categories_category_code_uidx
  on public.categories (category_code) where category_code is not null;
create index if not exists products_shop_idx on public.products (shop_id);
create index if not exists products_shop_barcode_idx on public.products (shop_id, barcode);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_name_search_idx
  on public.products using gin (to_tsvector('simple', name || ' ' || description || ' ' || brand));
create index if not exists product_variants_product_idx on public.product_variants (product_id);
create index if not exists product_images_product_order_idx on public.product_images (product_id, display_order);
create index if not exists inventory_shop_branch_idx on public.inventory (shop_id, branch_id);
create index if not exists inventory_transactions_shop_date_idx
  on public.inventory_transactions (shop_id, occurred_at desc);
create index if not exists carts_user_id_idx on public.carts (user_id);
create index if not exists carts_guest_session_id_idx on public.carts (guest_session_id);
create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists orders_shop_created_at_idx on public.orders (shop_id, created_at desc);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists bills_shop_created_at_idx on public.bills (shop_id, created_at desc);
create index if not exists bills_staff_id_idx on public.bills (staff_id);
create index if not exists bills_customer_id_idx on public.bills (customer_id);
create index if not exists bill_items_bill_idx on public.bill_items (bill_id);
create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists coupon_notifications_coupon_idx on public.coupon_notifications (coupon_id);
create index if not exists expenses_shop_date_idx on public.expenses (shop_id, expense_date desc);
create index if not exists investments_shop_date_idx on public.investments (shop_id, investment_date desc);
create index if not exists business_settings_shop_idx on public.business_settings (shop_id);
create index if not exists audit_logs_shop_idx on public.audit_logs (shop_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists notifications_user_read_idx on public.notifications (user_id, is_read);
create index if not exists notifications_role_idx on public.notifications (role);
create index if not exists suppliers_shop_idx on public.suppliers (shop_id);
create index if not exists qr_codes_shop_idx on public.qr_codes (shop_id);
create index if not exists whatsapp_logs_recipient_idx on public.whatsapp_logs (recipient_phone);
create index if not exists whatsapp_logs_sent_at_idx on public.whatsapp_logs (sent_at desc);
create index if not exists customer_wishlist_items_customer_idx
  on public.customer_wishlist_items (customer_id);
create index if not exists auth_otp_expiry_idx
  on public.auth_otp_verifications (expires_at);
create index if not exists registration_captcha_expiry_idx
  on public.registration_captcha_challenges (expires_at);

-- ============================================================================
-- SECTION 11: SYSTEM TRIGGERS AND TIMESTAMP AUTOMATION
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles', 'user_roles', 'customers', 'customer_addresses', 'shops', 'branches',
    'staff', 'admins', 'owner_profiles', 'categories', 'products', 'product_variants',
    'product_images', 'inventory', 'inventory_transactions', 'carts', 'cart_items',
    'orders', 'order_items', 'bills', 'bill_items', 'payments', 'coupons',
    'coupon_notifications', 'expenses', 'investments', 'business_settings', 'audit_logs',
    'notifications', 'suppliers', 'qr_codes', 'scanner_settings', 'whatsapp_logs',
    'auth_otp_verifications'
  ] loop
    if not exists (
      select 1 from pg_trigger
      where tgrelid = format('public.%I', target_table)::regclass
        and tgname = 'set_updated_at'
        and not tgisinternal
    ) then
      execute format(
        'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        target_table
      );
    end if;
  end loop;
end;
$$;

-- Secure Auth Trigger: default new users strictly to customer role.
-- Elevated roles (staff, admin, owner) are granted only via backend provisioning.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_user_created'
      and not tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_auth_user();
  end if;
end;
$$;

-- ============================================================================
-- SECTION 12: RLS SECURITY PREDICATE HELPER FUNCTIONS
-- ============================================================================
create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and p.is_active
      and ur.role::text = required_role
  );
$$;

create or replace function public.can_access_shop(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_shop_id is not null
    and (
      public.has_role('owner')
      or exists (
        select 1
        from public.profiles p
        join public.user_roles ur on ur.user_id = p.id
        where p.id = (select auth.uid())
          and p.is_active
          and p.shop_id = target_shop_id
          and ur.role::text in ('admin', 'staff')
      )
    );
$$;

create or replace function public.can_manage_shop(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_shop_id is not null
    and (
      public.has_role('owner')
      or exists (
        select 1
        from public.profiles p
        join public.user_roles ur on ur.user_id = p.id
        where p.id = (select auth.uid())
          and p.is_active
          and p.shop_id = target_shop_id
          and ur.role::text = 'admin'
      )
    );
$$;

create or replace function public.can_access_branch(target_shop_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_shop_id is not null
    and (
      public.has_role('owner')
      or exists (
        select 1
        from public.profiles p
        join public.user_roles ur on ur.user_id = p.id
        where p.id = (select auth.uid())
          and p.is_active
          and p.shop_id = target_shop_id
          and ur.role::text = 'admin'
      )
      or exists (
        select 1
        from public.profiles p
        join public.user_roles ur on ur.user_id = p.id
        where p.id = (select auth.uid())
          and p.is_active
          and p.shop_id = target_shop_id
          and p.branch_id is not distinct from target_branch_id
          and ur.role::text = 'staff'
      )
    );
$$;

create or replace function public.owns_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_customer_id is not null
    and exists (
      select 1 from public.customers c
      where c.id = target_customer_id
        and c.profile_id = (select auth.uid())
    );
$$;

revoke all on function public.has_role(text) from public;
revoke all on function public.can_access_shop(uuid) from public;
revoke all on function public.can_manage_shop(uuid) from public;
revoke all on function public.can_access_branch(uuid, uuid) from public;
revoke all on function public.owns_customer(uuid) from public;
grant execute on function public.has_role(text) to authenticated, anon;
grant execute on function public.can_access_shop(uuid) to authenticated, anon;
grant execute on function public.can_manage_shop(uuid) to authenticated, anon;
grant execute on function public.can_access_branch(uuid, uuid) to authenticated;
grant execute on function public.owns_customer(uuid) to authenticated;

-- ============================================================================
-- SECTION 13: ROW-LEVEL SECURITY ENABLEMENT AND ROLE GRANTS
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.shops enable row level security;
alter table public.branches enable row level security;
alter table public.staff enable row level security;
alter table public.admins enable row level security;
alter table public.owner_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_notifications enable row level security;
alter table public.expenses enable row level security;
alter table public.investments enable row level security;
alter table public.business_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.suppliers enable row level security;
alter table public.qr_codes enable row level security;
alter table public.scanner_settings enable row level security;
alter table public.whatsapp_logs enable row level security;
alter table public.customer_wishlist_items enable row level security;
alter table public.auth_otp_verifications enable row level security;
alter table public.registration_captcha_challenges enable row level security;

-- Revoke broad default privileges
revoke all on public.profiles, public.user_roles, public.customers,
  public.customer_addresses, public.shops, public.branches, public.staff,
  public.admins, public.owner_profiles, public.categories, public.products,
  public.product_variants, public.product_images, public.inventory,
  public.inventory_transactions, public.carts, public.cart_items, public.orders,
  public.order_items, public.bills, public.bill_items, public.payments,
  public.coupons, public.coupon_notifications, public.expenses, public.investments,
  public.business_settings, public.audit_logs, public.notifications, public.suppliers,
  public.qr_codes, public.scanner_settings, public.whatsapp_logs,
  public.customer_wishlist_items, public.auth_otp_verifications,
  public.registration_captcha_challenges from public, anon, authenticated;

-- Public catalog access: column-limited (cost_price and private shop settings are excluded)
grant select on public.categories to anon, authenticated;
grant select (
  id, name, sku, barcode, barcode_format, qr_code_data, qr_code_type, brand,
  category_id, shop_id, branch_id, description, original_price, selling_price,
  discount_percent, gst_percent, final_price, available_quantity,
  low_stock_threshold, sizes, colours, rating, num_reviews, is_active,
  is_featured, is_trending, tags, created_at, updated_at
) on public.products to anon, authenticated;
grant select (
  id, product_id, size, colour, colour_hex, stock, sku, barcode, price,
  created_at, updated_at
) on public.product_variants to anon;
grant select (
  id, product_id, storage_path, legacy_url, alt_text, display_order, is_primary
) on public.product_images to anon;
grant select on public.product_variants, public.product_images to authenticated;

-- Authenticated client access grants
grant select on public.profiles, public.user_roles, public.customers,
  public.customer_addresses, public.branches, public.staff,
  public.admins, public.owner_profiles, public.inventory,
  public.inventory_transactions, public.carts, public.cart_items, public.orders,
  public.order_items, public.bills, public.bill_items, public.payments,
  public.coupons, public.coupon_notifications, public.expenses, public.investments,
  public.business_settings, public.audit_logs, public.notifications, public.suppliers,
  public.qr_codes, public.scanner_settings, public.whatsapp_logs,
  public.customer_wishlist_items to authenticated;

grant select (
  id, legacy_mongo_id, shop_code, name, category, description, logo, gst_number,
  contact_email, contact_phone, address, is_active, owner_profile_id, created_at, updated_at
) on public.shops to authenticated;

grant update (full_name, username, phone) on public.profiles to authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, update, delete on public.customer_wishlist_items to authenticated;
grant select, insert, update, delete on public.carts, public.cart_items to authenticated;

-- Service role full administrative grants
grant all on public.profiles, public.user_roles, public.customers,
  public.customer_addresses, public.shops, public.branches, public.staff,
  public.admins, public.owner_profiles, public.categories, public.products,
  public.product_variants, public.product_images, public.inventory,
  public.inventory_transactions, public.carts, public.cart_items, public.orders,
  public.order_items, public.bills, public.bill_items, public.payments,
  public.coupons, public.coupon_notifications, public.expenses, public.investments,
  public.business_settings, public.audit_logs, public.notifications, public.suppliers,
  public.qr_codes, public.scanner_settings, public.whatsapp_logs,
  public.customer_wishlist_items, public.auth_otp_verifications,
  public.registration_captcha_challenges to service_role;

-- ============================================================================
-- SECTION 14: ROW-LEVEL SECURITY POLICIES FOR ALL TABLES
-- ============================================================================

-- PROFILES POLICIES
drop policy if exists profiles_scope_guard on public.profiles;
create policy profiles_scope_guard on public.profiles
  as restrictive for select to authenticated
  using (
    id = (select auth.uid())
    or public.has_role('owner')
    or (
      public.can_access_shop(shop_id)
      and exists (
        select 1 from public.user_roles target_role
        where target_role.user_id = profiles.id
          and target_role.role::text in ('admin', 'staff')
      )
    )
  );
drop policy if exists profiles_self_update_guard on public.profiles;
create policy profiles_self_update_guard on public.profiles
  as restrictive for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.has_role('owner')
    or (
      public.can_access_shop(shop_id)
      and exists (
        select 1 from public.user_roles target_role
        where target_role.user_id = profiles.id
          and target_role.role::text in ('admin', 'staff')
      )
    )
  );
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- USER_ROLES POLICIES
drop policy if exists user_roles_scope_guard on public.user_roles;
create policy user_roles_scope_guard on public.user_roles
  as restrictive for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('owner'));
drop policy if exists user_roles_self_or_owner_read on public.user_roles;
create policy user_roles_self_or_owner_read on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('owner'));

-- CUSTOMERS POLICIES
drop policy if exists customers_scope_guard on public.customers;
create policy customers_scope_guard on public.customers
  as restrictive for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.has_role('owner')
    or public.can_access_shop(shop_id)
  );
drop policy if exists customers_self_or_shop_read on public.customers;
create policy customers_self_or_shop_read on public.customers
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.has_role('owner')
    or public.can_access_shop(shop_id)
  );

-- CUSTOMER_ADDRESSES POLICIES
drop policy if exists customer_addresses_scope_guard on public.customer_addresses;
create policy customer_addresses_scope_guard on public.customer_addresses
  as restrictive for all to authenticated
  using (
    public.owns_customer(customer_id)
    or exists (
      select 1 from public.customers c
      where c.id = customer_id
        and (public.has_role('owner') or public.can_access_shop(c.shop_id))
    )
  )
  with check (public.owns_customer(customer_id) or public.has_role('owner'));
drop policy if exists customer_addresses_read_owner_or_shop on public.customer_addresses;
create policy customer_addresses_read_owner_or_shop on public.customer_addresses
  for select to authenticated
  using (
    public.owns_customer(customer_id)
    or exists (
      select 1 from public.customers c
      where c.id = customer_id
        and (public.has_role('owner') or public.can_access_shop(c.shop_id))
    )
  );
drop policy if exists customer_addresses_write_owner on public.customer_addresses;
create policy customer_addresses_write_owner on public.customer_addresses
  for all to authenticated
  using (public.owns_customer(customer_id))
  with check (public.owns_customer(customer_id));

-- SHOPS POLICIES
drop policy if exists shops_read_assigned on public.shops;
create policy shops_read_assigned on public.shops for select to authenticated
  using (public.has_role('owner') or public.can_access_shop(id));
drop policy if exists shops_read_scope_guard on public.shops;
create policy shops_read_scope_guard on public.shops as restrictive for select to authenticated
  using (public.has_role('owner') or public.can_access_shop(id));

-- BRANCHES POLICIES
drop policy if exists branches_read_assigned on public.branches;
create policy branches_read_assigned on public.branches for select to authenticated
  using (public.can_access_branch(shop_id, id));
drop policy if exists branches_read_scope_guard on public.branches;
create policy branches_read_scope_guard on public.branches as restrictive for select to authenticated
  using (public.can_access_branch(shop_id, id));

-- STAFF, ADMINS, OWNER POLICIES
drop policy if exists staff_read_assigned on public.staff;
create policy staff_read_assigned on public.staff for select to authenticated
  using (profile_id = (select auth.uid()) or public.can_manage_shop(shop_id));
drop policy if exists admins_read_owner_or_self on public.admins;
create policy admins_read_owner_or_self on public.admins for select to authenticated
  using (profile_id = (select auth.uid()) or public.has_role('owner'));
drop policy if exists owner_profiles_read_owner on public.owner_profiles;
create policy owner_profiles_read_owner on public.owner_profiles for select to authenticated
  using (profile_id = (select auth.uid()) or public.has_role('owner'));

-- CATALOG & PRODUCTS POLICIES
drop policy if exists categories_public_active on public.categories;
create policy categories_public_active on public.categories for select to anon, authenticated
  using (
    (is_active and status = 'ACTIVE')
    or public.has_role('owner')
    or public.can_access_shop(shop_id)
  );
drop policy if exists products_public_active on public.products;
create policy products_public_active on public.products for select to anon, authenticated
  using (
    is_active
    or public.has_role('owner')
    or public.can_access_shop(shop_id)
  );
drop policy if exists variants_active_product_read on public.product_variants;
create policy variants_active_product_read on public.product_variants for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and (p.is_active or public.has_role('owner') or public.can_access_shop(p.shop_id))
    )
  );
drop policy if exists images_active_product_read on public.product_images;
create policy images_active_product_read on public.product_images for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and (p.is_active or public.has_role('owner') or public.can_access_shop(p.shop_id))
    )
  );

-- INVENTORY POLICIES
drop policy if exists inventory_shop_read on public.inventory;
create policy inventory_shop_read on public.inventory for select to authenticated
  using (public.can_access_branch(shop_id, branch_id));
drop policy if exists inventory_transactions_shop_read on public.inventory_transactions;
create policy inventory_transactions_shop_read on public.inventory_transactions for select to authenticated
  using (public.can_access_branch(shop_id, branch_id));

-- CARTS & CART_ITEMS POLICIES
drop policy if exists carts_owner_read on public.carts;
create policy carts_owner_read on public.carts for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists carts_owner_write on public.carts;
create policy carts_owner_write on public.carts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and not public.has_role('staff')
    and not public.has_role('admin')
    and not public.has_role('owner')
  );
drop policy if exists cart_items_owner_scope on public.cart_items;
create policy cart_items_owner_scope on public.cart_items for all to authenticated
  using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
  );

-- ORDERS & ORDER_ITEMS POLICIES
drop policy if exists orders_read_customer_or_shop on public.orders;
create policy orders_read_customer_or_shop on public.orders for select to authenticated
  using (public.owns_customer(customer_id) or public.can_access_branch(shop_id, branch_id));
drop policy if exists order_items_read_parent_order on public.order_items;
create policy order_items_read_parent_order on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (public.owns_customer(o.customer_id) or public.can_access_branch(o.shop_id, o.branch_id))
    )
  );

-- BILLS & BILL_ITEMS POLICIES
drop policy if exists bills_read_customer_or_shop on public.bills;
create policy bills_read_customer_or_shop on public.bills for select to authenticated
  using (public.owns_customer(customer_id) or public.can_access_branch(shop_id, branch_id));
drop policy if exists bill_items_read_parent_bill on public.bill_items;
create policy bill_items_read_parent_bill on public.bill_items for select to authenticated
  using (
    exists (
      select 1 from public.bills b
      where b.id = bill_id
        and (public.owns_customer(b.customer_id) or public.can_access_branch(b.shop_id, b.branch_id))
    )
  );

-- PAYMENTS POLICIES
drop policy if exists payments_read_customer_or_shop on public.payments;
create policy payments_read_customer_or_shop on public.payments for select to authenticated
  using (public.owns_customer(customer_id) or public.can_access_shop(shop_id));

-- COUPONS & NOTIFICATIONS POLICIES
drop policy if exists coupons_active_read on public.coupons;
create policy coupons_active_read on public.coupons for select to anon, authenticated
  using (
    (is_active and start_at <= now() and expires_at > now())
    or (shop_id is not null and public.can_manage_shop(shop_id))
    or (shop_id is null and public.has_role('owner'))
  );
drop policy if exists coupon_notifications_shop_read on public.coupon_notifications;
create policy coupon_notifications_shop_read on public.coupon_notifications for select to authenticated
  using (
    exists (
      select 1 from public.coupons c
      where c.id = coupon_id
        and (public.has_role('owner') or public.can_manage_shop(c.shop_id))
    )
  );

-- EXPENSES & INVESTMENTS POLICIES (STRICTLY OWNER ONLY)
drop policy if exists expenses_owner_read on public.expenses;
create policy expenses_owner_read on public.expenses for select to authenticated
  using (public.has_role('owner'));
drop policy if exists investments_owner_read on public.investments;
create policy investments_owner_read on public.investments for select to authenticated
  using (public.has_role('owner'));

-- BUSINESS SETTINGS & AUDIT LOGS POLICIES
drop policy if exists business_settings_manage_shop on public.business_settings;
create policy business_settings_manage_shop on public.business_settings for all to authenticated
  using (public.can_manage_shop(shop_id))
  with check (public.can_manage_shop(shop_id));
drop policy if exists audit_logs_owner_or_shop on public.audit_logs;
create policy audit_logs_owner_or_shop on public.audit_logs for select to authenticated
  using (public.has_role('owner') or (shop_id is not null and public.can_manage_shop(shop_id)));

-- NOTIFICATIONS POLICIES
drop policy if exists notifications_recipient_read on public.notifications;
create policy notifications_recipient_read on public.notifications for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      user_id is null
      and (
        role = 'all'
        or public.has_role(role)
      )
      and (shop_id is null or public.can_access_shop(shop_id) or public.has_role('owner'))
    )
  );

-- SUPPLIERS, QR CODES, SCANNER, WHATSAPP POLICIES
drop policy if exists suppliers_shop_read on public.suppliers;
create policy suppliers_shop_read on public.suppliers for select to authenticated
  using (public.can_manage_shop(shop_id));
drop policy if exists qr_codes_shop_read on public.qr_codes;
create policy qr_codes_shop_read on public.qr_codes for select to authenticated
  using (public.can_access_shop(shop_id));
drop policy if exists scanner_settings_shop_read on public.scanner_settings;
create policy scanner_settings_shop_read on public.scanner_settings for select to authenticated
  using (public.can_access_shop(shop_id));
drop policy if exists whatsapp_logs_shop_read on public.whatsapp_logs;
create policy whatsapp_logs_shop_read on public.whatsapp_logs for select to authenticated
  using (
    sent_by = (select auth.uid())
    or (shop_id is not null and public.can_manage_shop(shop_id))
    or public.has_role('owner')
  );

-- CUSTOMER WISHLIST POLICIES
drop policy if exists wishlist_owner_read on public.customer_wishlist_items;
create policy wishlist_owner_read on public.customer_wishlist_items for select to authenticated
  using (public.owns_customer(customer_id));
drop policy if exists wishlist_owner_insert on public.customer_wishlist_items;
create policy wishlist_owner_insert on public.customer_wishlist_items for insert to authenticated
  with check (
    public.owns_customer(customer_id)
    and exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );
drop policy if exists wishlist_owner_delete on public.customer_wishlist_items;
create policy wishlist_owner_delete on public.customer_wishlist_items for delete to authenticated
  using (public.owns_customer(customer_id));

-- ============================================================================
-- SECTION 15: AUTH OTP RPC FUNCTIONS (RESTRICTED TO SERVICE_ROLE)
-- ============================================================================
create or replace function public.begin_auth_otp(
  p_identifier text,
  p_purpose text,
  p_channel text,
  p_otp_hash text,
  p_password_hash text default null,
  p_registration_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.auth_otp_verifications%rowtype;
  next_id uuid;
  next_resend_count smallint;
begin
  if p_identifier is null
    or btrim(p_identifier) = ''
    or p_purpose is distinct from 'FORGOT_PASSWORD'
    or p_channel is null
    or p_channel not in ('sms', 'email')
    or p_otp_hash is null
    or p_otp_hash !~ '^[0-9a-f]{64}$'
    or p_password_hash is not null
    or p_registration_payload is not null then
    raise exception using errcode = '22023', message = 'Invalid OTP request.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_identifier || ':' || p_purpose, 0)
  );

  select * into current_record
  from public.auth_otp_verifications
  where identifier = p_identifier and purpose = p_purpose
  for update;

  if found and current_record.expires_at > now()
    and current_record.verification_status in ('pending', 'verified') then
    if current_record.last_sent_at > now() - interval '45 seconds' then
      raise exception using errcode = 'P0001',
        message = 'OTP_RESEND_COOLDOWN:' ||
          ceil(extract(epoch from (current_record.last_sent_at + interval '45 seconds' - now())))::text;
    end if;
    if current_record.resend_count >= 4 then
      raise exception using errcode = 'P0001', message = 'OTP_RESEND_LIMIT';
    end if;
    next_resend_count := current_record.resend_count + 1;
  else
    next_resend_count := 0;
  end if;

  insert into public.auth_otp_verifications (
    identifier, purpose, channel, otp_hash, password_hash, registration_payload,
    verification_status, registration_status, attempts, resend_count,
    last_sent_at, expires_at, verified_at, completed_at
  ) values (
    p_identifier, p_purpose, p_channel, p_otp_hash, null, null,
    'pending', 'not_applicable', 0, next_resend_count,
    now(), now() + interval '5 minutes', null, null
  )
  on conflict (identifier, purpose) do update set
    channel = excluded.channel,
    otp_hash = excluded.otp_hash,
    password_hash = null,
    registration_payload = null,
    verification_status = 'pending',
    registration_status = 'not_applicable',
    attempts = 0,
    resend_count = excluded.resend_count,
    last_sent_at = excluded.last_sent_at,
    expires_at = excluded.expires_at,
    verified_at = null,
    completed_at = null,
    updated_at = now()
  returning id into next_id;

  return next_id;
end;
$$;

create or replace function public.verify_auth_otp(p_otp_id uuid, p_otp_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.auth_otp_verifications%rowtype;
  next_attempts smallint;
begin
  select * into current_record
  from public.auth_otp_verifications
  where id = p_otp_id
  for update;

  if not found then return 'not_found'; end if;
  if current_record.verification_status = 'consumed' then return 'consumed'; end if;
  if current_record.verification_status = 'expired' or current_record.expires_at <= now() then
    update public.auth_otp_verifications
    set verification_status = 'expired', updated_at = now()
    where id = p_otp_id;
    return 'expired';
  end if;
  if current_record.verification_status not in ('pending', 'verified') then
    return 'not_found';
  end if;
  if current_record.attempts >= 5 then
    update public.auth_otp_verifications
    set verification_status = 'expired', updated_at = now()
    where id = p_otp_id;
    return 'locked';
  end if;
  if current_record.otp_hash <> p_otp_hash then
    next_attempts := current_record.attempts + 1;
    update public.auth_otp_verifications
    set attempts = next_attempts,
        verification_status = case when next_attempts >= 5 then 'expired'
                                   else current_record.verification_status end,
        updated_at = now()
    where id = p_otp_id;
    return case when next_attempts >= 5 then 'locked' else 'invalid' end;
  end if;
  update public.auth_otp_verifications
  set verification_status = 'verified',
      verified_at = coalesce(verified_at, now()),
      updated_at = now()
  where id = p_otp_id;
  return 'verified';
end;
$$;

grant execute on function public.begin_auth_otp(text, text, text, text, text, jsonb)
  to service_role;
grant execute on function public.verify_auth_otp(uuid, text) to service_role;
revoke all on function public.begin_auth_otp(text, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.verify_auth_otp(uuid, text)
  from public, anon, authenticated;

-- ============================================================================
-- SECTION 16: PRODUCT STORAGE CONFIGURATION (CONDITIONAL ON STORAGE SCHEMA)
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'product-images',
      'product-images',
      true,
      5242880,
      array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
    on conflict (id) do update
    set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

create or replace function public.product_image_shop_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when object_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

revoke all on function public.product_image_shop_id(text) from public;
grant execute on function public.product_image_shop_id(text) to authenticated, anon;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'objects') then
    execute 'drop policy if exists "product images are publicly readable" on storage.objects';
    execute 'create policy "product images are publicly readable" on storage.objects for select to public using (bucket_id = ''product-images'')';

    execute 'drop policy if exists "shop staff can upload product images" on storage.objects';
    execute 'create policy "shop staff can upload product images" on storage.objects for insert to authenticated with check (bucket_id = ''product-images'' and public.can_manage_shop(public.product_image_shop_id(name)))';

    execute 'drop policy if exists "shop staff can update product images" on storage.objects';
    execute 'create policy "shop staff can update product images" on storage.objects for update to authenticated using (bucket_id = ''product-images'' and public.can_manage_shop(public.product_image_shop_id(name))) with check (bucket_id = ''product-images'' and public.can_manage_shop(public.product_image_shop_id(name)))';

    execute 'drop policy if exists "shop staff can delete product images" on storage.objects';
    execute 'create policy "shop staff can delete product images" on storage.objects for delete to authenticated using (bucket_id = ''product-images'' and public.can_manage_shop(public.product_image_shop_id(name)))';
  end if;
end;
$$;
