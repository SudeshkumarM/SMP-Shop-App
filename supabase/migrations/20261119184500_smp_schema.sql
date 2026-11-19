create type public.smp_role as enum ('customer', 'staff', 'admin', 'owner');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_mongo_id text unique,
  email text,
  username text,
  phone text,
  full_name text not null default '',
  is_active boolean not null default true,
  is_phone_verified boolean not null default false,
  is_email_verified boolean not null default false,
  last_login_at timestamptz,
  shop_id uuid,
  branch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_lower_uidx on public.profiles (lower(email)) where email is not null;
create unique index profiles_username_lower_uidx on public.profiles (lower(username)) where username is not null;
create unique index profiles_phone_uidx on public.profiles (phone) where phone is not null;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.smp_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.shops (
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

create table public.branches (
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

alter table public.profiles
  add constraint profiles_shop_id_fkey foreign key (shop_id) references public.shops(id) on delete set null,
  add constraint profiles_branch_id_fkey foreign key (branch_id) references public.branches(id) on delete set null;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  profile_id uuid unique references public.profiles(id) on delete set null,
  shop_id uuid references public.shops(id) on delete set null,
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

create table public.customer_addresses (
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

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  staff_code text not null unique,
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
  shift text not null default 'General',
  total_bills_generated integer not null default 0,
  total_sales_value numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  admin_code text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.owner_profiles (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  owner_code text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  is_master_owner boolean not null default true,
  pan_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.branches
  add constraint branches_manager_staff_id_fkey foreign key (manager_staff_id) references public.staff(id) on delete set null;

create table public.categories (
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

create unique index categories_category_code_uidx on public.categories (category_code) where category_code is not null;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  name text not null,
  sku text not null,
  barcode text not null,
  barcode_format text not null default 'CODE128' check (barcode_format in ('CODE128', 'EAN13', 'UPCA')),
  qr_code_data text not null default '',
  qr_code_type text not null default 'PRODUCT' check (qr_code_type in ('PRODUCT', 'PAYMENT', 'INVOICE', 'CUSTOM')),
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
  rating numeric(3,2) not null default 4.5 check (rating >= 0 and rating <= 5),
  num_reviews integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, sku)
);

create index products_shop_barcode_idx on public.products (shop_id, barcode);
create index products_category_idx on public.products (category_id);
create index products_name_search_idx on public.products using gin (to_tsvector('simple', name || ' ' || description || ' ' || brand));

create table public.product_variants (
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

create table public.product_images (
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

create table public.inventory (
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

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  inventory_id uuid not null references public.inventory(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  transaction_type text not null check (transaction_type in ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE')),
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

create table public.carts (
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

create index carts_user_id_idx on public.carts (user_id);
create index carts_guest_session_id_idx on public.carts (guest_session_id);

create table public.cart_items (
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

create table public.orders (
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
  payment_method text not null,
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  payment_details jsonb not null default '{}'::jsonb,
  order_status text not null default 'PLACED' check (order_status in ('PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  refund_status text not null default 'NONE' check (refund_status in ('NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED')),
  tracking_number text not null default '',
  invoice_number text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_shop_created_at_idx on public.orders (shop_id, created_at desc);
create index orders_customer_id_idx on public.orders (customer_id);

create table public.order_items (
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

create table public.bills (
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

create index bills_shop_created_at_idx on public.bills (shop_id, created_at desc);
create index bills_staff_id_idx on public.bills (staff_id);
create index bills_customer_id_idx on public.bills (customer_id);

create table public.bill_items (
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

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  payment_id text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'INR',
  payment_method text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  transaction_ref text not null default '',
  gateway_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coupons (
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
  eligibility_criteria text not null default 'ALL_CONSENTED',
  min_lifetime_spend numeric(14,2) not null default 0,
  min_orders_count integer not null default 0,
  usage_count integer not null default 0,
  shop_id uuid references public.shops(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coupon_notifications (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  recipient_phone text not null,
  sent_at timestamptz not null default now(),
  unique (coupon_id, recipient_phone)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  expense_code text not null unique,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null,
  payment_method text not null default 'Bank Transfer',
  expense_date timestamptz not null default now(),
  vendor_name text not null default '',
  invoice_number text not null default '',
  notes text not null default '',
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  investment_code text not null unique,
  shop_id uuid not null references public.shops(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null,
  investment_date timestamptz not null default now(),
  source_of_funds text not null default 'Owner Equity',
  notes text not null default '',
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_settings (
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

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'all' check (role in ('customer', 'staff', 'admin', 'owner', 'all')),
  shop_id uuid references public.shops(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'SYSTEM',
  is_read boolean not null default false,
  link text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
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

create table public.suppliers (
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

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  title text not null,
  qr_type text not null default 'PRODUCT',
  target_id text not null default '',
  target_name text not null default '',
  qr_data text not null,
  description text not null default '',
  shop_id uuid not null references public.shops(id) on delete restrict,
  status text not null default 'ACTIVE',
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scanner_settings (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  shop_id uuid not null unique references public.shops(id) on delete cascade,
  scanner_type text not null default 'USB_BARCODE',
  barcode_format text not null default 'CODE128',
  qr_config jsonb not null default '{}'::jsonb,
  scanner_activated boolean not null default true,
  selected_camera_id text not null default '',
  camera_permission_status text not null default 'prompt',
  default_scanner text not null default 'USB_BARCODE',
  last_tested_at timestamptz,
  test_scan_result text not null default '',
  test_scan_type text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  shop_id uuid references public.shops(id) on delete set null,
  recipient_phone text not null,
  recipient_name text not null default 'Customer',
  customer_id uuid references public.customers(id) on delete set null,
  message_type text not null,
  channel text not null default 'WHATSAPP',
  template_name text not null default 'general_notice',
  content text not null,
  status text not null default 'SENT',
  provider_response jsonb,
  error_message text,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index branches_shop_idx on public.branches (shop_id);
create index customers_shop_idx on public.customers (shop_id);
create index customers_profile_idx on public.customers (profile_id);
create index staff_shop_branch_idx on public.staff (shop_id, branch_id);
create index admins_shop_branch_idx on public.admins (shop_id, branch_id);
create index products_shop_idx on public.products (shop_id);
create index inventory_shop_idx on public.inventory (shop_id, branch_id);
create index inventory_transactions_shop_date_idx on public.inventory_transactions (shop_id, occurred_at desc);
create index bill_items_bill_idx on public.bill_items (bill_id);
create index order_items_order_idx on public.order_items (order_id);
create index payments_order_idx on public.payments (order_id);
create index expenses_shop_date_idx on public.expenses (shop_id, expense_date desc);
create index investments_shop_date_idx on public.investments (shop_id, investment_date desc);
create index notifications_user_read_idx on public.notifications (user_id, is_read);
create index whatsapp_logs_sent_at_idx on public.whatsapp_logs (sent_at desc);

create function public.set_updated_at()
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
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_roles', 'shops', 'branches', 'customers', 'customer_addresses',
    'staff', 'admins', 'owner_profiles', 'categories', 'products', 'product_variants',
    'product_images', 'inventory', 'inventory_transactions', 'carts', 'cart_items',
    'orders', 'order_items', 'bills', 'bill_items', 'payments', 'coupons', 'expenses',
    'investments', 'business_settings', 'notifications', 'audit_logs', 'suppliers',
    'qr_codes', 'scanner_settings', 'whatsapp_logs'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role public.smp_role;
begin
  begin
    assigned_role := coalesce(new.raw_app_meta_data ->> 'role', 'customer')::public.smp_role;
  exception when invalid_text_representation then
    assigned_role := 'customer';
  end;

  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, assigned_role);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
