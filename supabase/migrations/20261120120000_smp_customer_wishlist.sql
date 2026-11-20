create table if not exists public.customer_wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index if not exists customer_wishlist_items_customer_idx
  on public.customer_wishlist_items (customer_id);

alter table public.customer_wishlist_items enable row level security;

revoke all on public.customer_wishlist_items from anon, authenticated;
grant select, insert, delete on public.customer_wishlist_items to authenticated;

drop policy if exists customer_wishlist_items_read_owner
  on public.customer_wishlist_items;
create policy customer_wishlist_items_read_owner
  on public.customer_wishlist_items
  for select to authenticated
  using (public.owns_customer(customer_id));

drop policy if exists customer_wishlist_items_insert_owner
  on public.customer_wishlist_items;
create policy customer_wishlist_items_insert_owner
  on public.customer_wishlist_items
  for insert to authenticated
  with check (
    public.owns_customer(customer_id)
    and exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.is_active
    )
  );

drop policy if exists customer_wishlist_items_delete_owner
  on public.customer_wishlist_items;
create policy customer_wishlist_items_delete_owner
  on public.customer_wishlist_items
  for delete to authenticated
  using (public.owns_customer(customer_id));
