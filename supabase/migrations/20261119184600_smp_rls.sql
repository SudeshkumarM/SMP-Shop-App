create function public.has_any_role(required_roles public.smp_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any(required_roles)
  );
$$;

create function public.can_manage_shop(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_shop_id is not null
    and (
      public.has_any_role(array['owner']::public.smp_role[])
      or (
        public.has_any_role(array['staff', 'admin']::public.smp_role[])
        and exists (
          select 1
          from public.profiles p
          where p.id = (select auth.uid())
            and p.shop_id = target_shop_id
        )
      )
    );
$$;

create function public.owns_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_customer_id is not null
    and exists (
      select 1
      from public.customers c
      where c.id = target_customer_id
        and c.profile_id = (select auth.uid())
    );
$$;

create function public.has_role_name(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role::text = required_role
  );
$$;

revoke all on function public.has_any_role(public.smp_role[]) from public;
revoke all on function public.can_manage_shop(uuid) from public;
revoke all on function public.owns_customer(uuid) from public;
revoke all on function public.has_role_name(text) from public;
grant execute on function public.has_any_role(public.smp_role[]) to anon, authenticated;
grant execute on function public.can_manage_shop(uuid) to anon, authenticated;
grant execute on function public.owns_customer(uuid) to authenticated;
grant execute on function public.has_role_name(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.shops enable row level security;
alter table public.branches enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
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
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.suppliers enable row level security;
alter table public.qr_codes enable row level security;
alter table public.scanner_settings enable row level security;
alter table public.whatsapp_logs enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;

grant select on public.categories to anon;
grant select (
  id, name, sku, barcode, barcode_format, brand, category_id, shop_id, branch_id,
  description, original_price, selling_price, discount_percent, gst_percent,
  final_price, available_quantity, low_stock_threshold, sizes, colours, rating,
  num_reviews, is_active, is_featured, is_trending, tags, created_at, updated_at
) on public.products to anon;
grant select (id, product_id, storage_path, legacy_url, alt_text, display_order, is_primary)
  on public.product_images to anon;
grant select on public.product_variants to anon;

grant update (full_name, username, phone) on public.profiles to authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, update, delete on public.carts, public.cart_items to authenticated;
grant insert on public.user_roles to authenticated;

create policy profiles_read_self_or_managers on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.has_any_role(array['owner']::public.smp_role[])
    or public.can_manage_shop(shop_id)
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy user_roles_read_self_or_owner on public.user_roles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role(array['owner']::public.smp_role[])
  );

create policy user_roles_add_staff_by_admin_or_owner on public.user_roles
  for insert to authenticated
  with check (
    public.has_any_role(array['owner']::public.smp_role[])
    or (
      role = 'staff'
      and public.has_any_role(array['admin']::public.smp_role[])
      and exists (
        select 1
        from public.profiles target
        join public.profiles actor on actor.id = (select auth.uid())
        where target.id = user_id
          and target.shop_id = actor.shop_id
      )
    )
  );

create policy shops_read_assigned on public.shops
  for select to authenticated
  using (public.can_manage_shop(id));

create policy branches_read_assigned on public.branches
  for select to authenticated
  using (public.can_manage_shop(shop_id));

create policy customers_read_self_or_shop_managers on public.customers
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.can_manage_shop(shop_id)
  );

create policy customer_addresses_read_owner_or_manager on public.customer_addresses
  for select to authenticated
  using (
    public.owns_customer(customer_id)
    or exists (
      select 1
      from public.customers c
      where c.id = customer_id
        and public.can_manage_shop(c.shop_id)
    )
  );

create policy customer_addresses_insert_owner on public.customer_addresses
  for insert to authenticated
  with check (public.owns_customer(customer_id));

create policy customer_addresses_update_owner on public.customer_addresses
  for update to authenticated
  using (public.owns_customer(customer_id))
  with check (public.owns_customer(customer_id));

create policy customer_addresses_delete_owner on public.customer_addresses
  for delete to authenticated
  using (public.owns_customer(customer_id));

create policy staff_read_self_or_shop_managers on public.staff
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.can_manage_shop(shop_id)
  );

create policy admins_read_self_or_owner on public.admins
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.has_any_role(array['owner']::public.smp_role[])
  );

create policy owner_profiles_read_owner on public.owner_profiles
  for select to authenticated
  using (public.has_any_role(array['owner']::public.smp_role[]));

create policy categories_read_active_or_managers on public.categories
  for select to anon, authenticated
  using (
    (is_active and status = 'ACTIVE')
    or public.can_manage_shop(shop_id)
  );

create policy products_read_active_or_managers on public.products
  for select to anon, authenticated
  using (is_active or public.can_manage_shop(shop_id));

create policy product_variants_read_active_or_managers on public.product_variants
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and (p.is_active or public.can_manage_shop(p.shop_id))
    )
  );

create policy product_images_read_active_or_managers on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and (p.is_active or public.can_manage_shop(p.shop_id))
    )
  );

create policy inventory_read_shop_managers on public.inventory
  for select to authenticated
  using (public.can_manage_shop(shop_id));

create policy inventory_transactions_read_shop_managers on public.inventory_transactions
  for select to authenticated
  using (public.can_manage_shop(shop_id));

create policy carts_read_owner_or_shop_managers on public.carts
  for select to authenticated
  using (user_id = (select auth.uid()) or public.can_manage_shop(shop_id));

create policy carts_insert_owner on public.carts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.has_any_role(array['staff', 'admin', 'owner']::public.smp_role[])
  );

create policy carts_update_owner on public.carts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy carts_delete_owner on public.carts
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy cart_items_read_cart_owner_or_manager on public.cart_items
  for select to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id
        and (c.user_id = (select auth.uid()) or public.can_manage_shop(c.shop_id))
    )
  );

create policy cart_items_write_cart_owner on public.cart_items
  for all to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = (select auth.uid())
    )
  );

create policy orders_read_owner_or_shop_managers on public.orders
  for select to authenticated
  using (public.owns_customer(customer_id) or public.can_manage_shop(shop_id));

create policy order_items_read_order_owner_or_manager on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (public.owns_customer(o.customer_id) or public.can_manage_shop(o.shop_id))
    )
  );

create policy bills_read_owner_or_shop_managers on public.bills
  for select to authenticated
  using (public.owns_customer(customer_id) or public.can_manage_shop(shop_id));

create policy bill_items_read_bill_owner_or_manager on public.bill_items
  for select to authenticated
  using (
    exists (
      select 1 from public.bills b
      where b.id = bill_id
        and (public.owns_customer(b.customer_id) or public.can_manage_shop(b.shop_id))
    )
  );

create policy payments_read_owner_or_shop_managers on public.payments
  for select to authenticated
  using (public.owns_customer(customer_id) or public.can_manage_shop(shop_id));

create policy coupons_read_active_or_managers on public.coupons
  for select to anon, authenticated
  using (
    (
      is_active
      and start_at <= now()
      and expires_at > now()
    )
    or (shop_id is not null and public.can_manage_shop(shop_id))
    or (shop_id is null and public.has_any_role(array['owner']::public.smp_role[]))
  );

create policy coupon_notifications_read_shop_managers on public.coupon_notifications
  for select to authenticated
  using (
    exists (
      select 1 from public.coupons c
      where c.id = coupon_id
        and (c.shop_id is null and public.has_any_role(array['owner']::public.smp_role[])
             or public.can_manage_shop(c.shop_id))
    )
  );

create policy expenses_read_owner_or_shop_managers on public.expenses
  for select to authenticated
  using (
    public.has_any_role(array['owner']::public.smp_role[])
    or public.can_manage_shop(shop_id)
  );

create policy investments_read_owner on public.investments
  for select to authenticated
  using (public.has_any_role(array['owner']::public.smp_role[]));

create policy business_settings_read_shop_managers on public.business_settings
  for select to authenticated
  using (public.can_manage_shop(shop_id));

create policy notifications_read_recipient on public.notifications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.can_manage_shop(shop_id)
    or role = 'all'
    or (
      role <> 'all'
    and public.has_role_name(role)
    )
  );

create policy audit_logs_read_actor_or_managers on public.audit_logs
  for select to authenticated
  using (
    actor_id = (select auth.uid())
    or public.has_any_role(array['owner']::public.smp_role[])
    or public.can_manage_shop(shop_id)
  );

create policy suppliers_read_shop_managers on public.suppliers
  for select to authenticated
  using (public.can_manage_shop(shop_id));

create policy qr_codes_read_shop_managers on public.qr_codes
  for select to authenticated
  using (public.can_manage_shop(shop_id));

create policy scanner_settings_read_shop_managers on public.scanner_settings
  for select to authenticated
  using (public.can_manage_shop(shop_id));

create policy whatsapp_logs_read_sender_or_managers on public.whatsapp_logs
  for select to authenticated
  using (
    sent_by = (select auth.uid())
    or (shop_id is not null and public.can_manage_shop(shop_id))
    or public.has_any_role(array['owner']::public.smp_role[])
  );
