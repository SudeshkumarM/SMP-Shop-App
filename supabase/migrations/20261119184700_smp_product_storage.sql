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

create function public.product_image_shop_id(object_name text)
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
grant execute on function public.product_image_shop_id(text) to authenticated;

create policy "product images are publicly readable"
  on storage.objects
  for select
  to public
  using (bucket_id = 'product-images');

create policy "shop staff can upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and public.can_manage_shop(public.product_image_shop_id(name))
  );

create policy "shop staff can update product images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.can_manage_shop(public.product_image_shop_id(name))
  )
  with check (
    bucket_id = 'product-images'
    and public.can_manage_shop(public.product_image_shop_id(name))
  );

create policy "shop staff can delete product images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.can_manage_shop(public.product_image_shop_id(name))
  );
