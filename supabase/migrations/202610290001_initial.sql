-- Second Device: no sample inventory, reviews, contact details, or promotions.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  role text not null default 'admin' check (role in ('owner','admin')),
  created_at timestamptz not null default now()
);
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_profiles where user_id = (select auth.uid()) and role in ('admin','owner'));
$$;
create or replace function private.is_owner() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_profiles where user_id = (select auth.uid()) and role = 'owner');
$$;
revoke all on function private.is_admin(), private.is_owner() from public;
grant execute on function private.is_admin(), private.is_owner() to anon, authenticated, service_role;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 100),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), logo_path text,
  is_active boolean not null default true, sort_order integer not null default 0
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 100),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), is_active boolean not null default true
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), sku text not null unique check(length(trim(sku)) between 1 and 80),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand_id uuid not null references public.brands(id), category_id uuid not null references public.categories(id),
  name text not null check(length(trim(name)) between 1 and 160), model text not null check(length(trim(model)) between 1 and 100),
  price numeric(14,2) not null check(price >= 0 and price <= 1000000000),
  compare_at_price numeric(14,2) check(compare_at_price is null or compare_at_price >= price),
  storage_gb integer check(storage_gb > 0), ram_gb integer check(ram_gb > 0), color text not null,
  condition_grade text not null check(condition_grade in ('A','B','C')),
  condition_notes text not null check(length(trim(condition_notes)) between 1 and 4000),
  battery_health integer check(battery_health between 0 and 100), accessories text not null default '',
  warranty_notes text not null default '', screen_notes text not null default '', body_notes text not null default '', network_notes text not null default '',
  status text not null default 'draft' check(status in ('draft','available','reserved','sold','archived')),
  stock_quantity integer not null default 1 check(stock_quantity >= 0), is_featured boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint published_stock check(status not in ('available','reserved') or stock_quantity > 0),
  constraint sold_stock check(status <> 'sold' or stock_quantity = 0)
);
create index if not exists products_status_created on public.products(status,created_at desc);
create index if not exists products_brand on public.products(brand_id);
create index if not exists products_category on public.products(category_id);
create index if not exists products_price on public.products(price);
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique, alt_text text not null default '', sort_order integer not null default 0,
  is_primary boolean not null default false
);
create index if not exists product_images_product on public.product_images(product_id);
create unique index if not exists one_primary_image on public.product_images(product_id) where is_primary;
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 250),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text not null default '', banner_path text,
  terms text not null default '', start_at timestamptz not null, end_at timestamptz not null,
  is_active boolean not null default false, constraint valid_period check(end_at > start_at)
);
create table if not exists public.promotion_products (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key(promotion_id,product_id)
);
create index if not exists promotion_products_product on public.promotion_products(product_id);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), display_name text not null check(length(trim(display_name)) between 1 and 100),
  rating integer check(rating between 1 and 5), body text not null check(length(trim(body)) between 1 and 6000),
  source text not null default '', permission_to_publish boolean not null default false,
  is_approved boolean not null default false, created_at timestamptz not null default now(),
  constraint review_permission check(not is_approved or permission_to_publish)
);
create table if not exists public.trade_in_requests (
  id uuid primary key default gen_random_uuid(), reference_code text not null unique,
  name text not null check(length(trim(name)) between 1 and 100), phone text not null check(phone ~ '^628[0-9]{7,11}$'),
  brand text not null check(length(trim(brand)) between 1 and 80), model text not null check(length(trim(model)) between 1 and 100),
  storage_gb integer check(storage_gb > 0 and storage_gb <= 100000),
  condition_notes text not null check(length(trim(condition_notes)) between 1 and 2000),
  accessories text not null default '', notes text not null default '', photo_paths text[] not null default '{}',
  status text not null default 'new' check(status in ('new','processing','completed','rejected')),
  admin_notes text not null default '', consent_at timestamptz not null, created_at timestamptz not null default now()
);
create index if not exists trade_in_status_created on public.trade_in_requests(status,created_at desc);
create table if not exists public.store_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001' check(id = '00000000-0000-0000-0000-000000000001'),
  store_name text not null default 'Second Device' check(length(trim(store_name)) between 1 and 100),
  tagline text not null default 'Jual Beli Gadget Second', whatsapp_number text not null default '',
  instagram_url text not null default '', address text not null default '', google_maps_url text not null default '',
  opening_hours text not null default '', logo_path text not null default '', about_text text not null default '',
  constraint public_phone check(whatsapp_number = '' or whatsapp_number ~ '^\+?(62|0)8[0-9 .()-]{7,15}$'),
  constraint instagram_protocol check(instagram_url = '' or instagram_url ~ '^https?://'),
  constraint maps_protocol check(google_maps_url = '' or google_maps_url ~ '^https?://')
);
insert into public.store_settings(id) values('00000000-0000-0000-0000-000000000001') on conflict do nothing;
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid,
  action text not null, entity_type text not null, entity_id text not null, created_at timestamptz not null default now()
);
create index if not exists audit_created on public.admin_audit_logs(created_at desc);
create table if not exists private.rate_limits (
  key_hash text primary key, window_start timestamptz not null default now(), attempts integer not null default 1
);

create or replace function private.promotion_visible(promo_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.promotions promo
    join public.promotion_products pp on pp.promotion_id = promo.id
    join public.products p on p.id = pp.product_id
    join public.brands b on b.id = p.brand_id
    join public.categories c on c.id = p.category_id
    where promo.id = promo_id and promo.is_active and promo.start_at <= now() and promo.end_at > now()
      and p.status = 'available' and p.stock_quantity > 0 and b.is_active and c.is_active);
$$;
revoke all on function private.promotion_visible(uuid) from public;
grant execute on function private.promotion_visible(uuid) to anon,authenticated,service_role;

-- Explicit grants: an authenticated account without an admin profile has public-only access.
grant usage on schema public to anon, authenticated, service_role;
do $$ declare t text; begin
  foreach t in array array['admin_profiles','brands','categories','products','product_images','promotions','promotion_products','reviews','trade_in_requests','store_settings','admin_audit_logs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  foreach t in array array['brands','categories','products','product_images','promotions','promotion_products','reviews','store_settings'] loop
    execute format('grant select on public.%I to anon',t);
  end loop;
end $$;
revoke insert,update,delete on public.admin_audit_logs from authenticated;
revoke insert on public.trade_in_requests from authenticated;

drop policy if exists profiles_read on public.admin_profiles;
create policy profiles_read on public.admin_profiles for select to authenticated using(user_id = (select auth.uid()) or (select private.is_owner()));
drop policy if exists profiles_insert on public.admin_profiles;
create policy profiles_insert on public.admin_profiles for insert to authenticated with check((select private.is_owner()));
drop policy if exists profiles_update on public.admin_profiles;
create policy profiles_update on public.admin_profiles for update to authenticated using((select private.is_owner()) and user_id <> (select auth.uid())) with check((select private.is_owner()) and user_id <> (select auth.uid()));
drop policy if exists profiles_delete on public.admin_profiles;
create policy profiles_delete on public.admin_profiles for delete to authenticated using((select private.is_owner()) and user_id <> (select auth.uid()));

do $$ declare t text; begin
  foreach t in array array['brands','categories','products','product_images','promotions','promotion_products','reviews','store_settings'] loop
    execute format('drop policy if exists admin_manage on public.%I',t);
    execute format('create policy admin_manage on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t);
  end loop;
end $$;
-- No permanent product deletion from authenticated clients. Archive individual units.
revoke delete on public.products from authenticated;
drop policy if exists public_brands on public.brands;
create policy public_brands on public.brands for select to anon,authenticated using(is_active);
drop policy if exists public_categories on public.categories;
create policy public_categories on public.categories for select to anon,authenticated using(is_active);
drop policy if exists public_products on public.products;
create policy public_products on public.products for select to anon,authenticated using(
  status in ('available','reserved','sold')
  and exists(select 1 from public.brands b where b.id=brand_id and b.is_active)
  and exists(select 1 from public.categories c where c.id=category_id and c.is_active)
);
drop policy if exists public_product_images on public.product_images;
create policy public_product_images on public.product_images for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and p.status in ('available','reserved','sold')));
drop policy if exists public_promotions on public.promotions;
create policy public_promotions on public.promotions for select to anon,authenticated using(private.promotion_visible(id));
drop policy if exists public_promotion_products on public.promotion_products;
create policy public_promotion_products on public.promotion_products for select to anon,authenticated using(private.promotion_visible(promotion_id));
drop policy if exists public_reviews on public.reviews;
create policy public_reviews on public.reviews for select to anon,authenticated using(is_approved and permission_to_publish);
drop policy if exists public_settings on public.store_settings;
create policy public_settings on public.store_settings for select to anon,authenticated using(true);
drop policy if exists trade_read on public.trade_in_requests;
create policy trade_read on public.trade_in_requests for select to authenticated using((select private.is_admin()));
drop policy if exists trade_update on public.trade_in_requests;
create policy trade_update on public.trade_in_requests for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
drop policy if exists trade_delete on public.trade_in_requests;
create policy trade_delete on public.trade_in_requests for delete to authenticated using((select private.is_owner()));
drop policy if exists audit_owner_read on public.admin_audit_logs;
create policy audit_owner_read on public.admin_audit_logs for select to authenticated using((select private.is_owner()));

create or replace function private.touch_product() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at=now(); if new.status='sold' then new.stock_quantity=0; end if; return new; end;
$$;
drop trigger if exists product_updated on public.products;
create trigger product_updated before insert or update on public.products for each row execute function private.touch_product();
create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare record_json jsonb; begin
  record_json=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.admin_audit_logs(actor_user_id,action,entity_type,entity_id)
  values(auth.uid(),tg_op,tg_table_name,coalesce(record_json->>'id',record_json->>'user_id',record_json->>'promotion_id',''));
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke all on function private.touch_product(), private.audit_change() from public;
do $$ declare t text; begin
  foreach t in array array['admin_profiles','brands','categories','products','product_images','promotions','promotion_products','reviews','trade_in_requests','store_settings'] loop
    execute format('drop trigger if exists audit_change on public.%I',t);
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
  end loop;
end $$;

-- Product and its ordered photo metadata commit in a single transaction; RLS remains enforced.
create or replace function public.save_product(record_data jsonb, image_data jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare p public.products; img jsonb; begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if jsonb_typeof(image_data) <> 'array' or jsonb_array_length(image_data)>12 then raise exception 'invalid_images'; end if;
  if record_data->>'status' in ('available','reserved','sold') and jsonb_array_length(image_data)=0 then raise exception 'photo_required'; end if;
  p = jsonb_populate_record(null::public.products,record_data);
  insert into public.products(id,sku,slug,brand_id,category_id,name,model,price,storage_gb,ram_gb,color,condition_grade,condition_notes,battery_health,accessories,warranty_notes,screen_notes,body_notes,network_notes,status,stock_quantity,is_featured)
  values(p.id,p.sku,p.slug,p.brand_id,p.category_id,p.name,p.model,p.price,p.storage_gb,p.ram_gb,p.color,p.condition_grade,p.condition_notes,p.battery_health,coalesce(p.accessories,''),coalesce(p.warranty_notes,''),coalesce(p.screen_notes,''),coalesce(p.body_notes,''),coalesce(p.network_notes,''),p.status,p.stock_quantity,coalesce(p.is_featured,false))
  on conflict(id) do update set sku=excluded.sku,slug=excluded.slug,brand_id=excluded.brand_id,category_id=excluded.category_id,name=excluded.name,model=excluded.model,price=excluded.price,storage_gb=excluded.storage_gb,ram_gb=excluded.ram_gb,color=excluded.color,condition_grade=excluded.condition_grade,condition_notes=excluded.condition_notes,battery_health=excluded.battery_health,accessories=excluded.accessories,warranty_notes=excluded.warranty_notes,screen_notes=excluded.screen_notes,body_notes=excluded.body_notes,network_notes=excluded.network_notes,status=excluded.status,stock_quantity=excluded.stock_quantity,is_featured=excluded.is_featured;
  delete from public.product_images where product_id=p.id;
  for img in select * from jsonb_array_elements(image_data) loop
    if left(img->>'storage_path',length('products/'||p.id::text||'/')) <> 'products/'||p.id::text||'/' then raise exception 'invalid_image_path'; end if;
    insert into public.product_images(product_id,storage_path,alt_text,sort_order,is_primary)
    values(p.id,img->>'storage_path',coalesce(img->>'alt_text',p.name),(img->>'sort_order')::integer,coalesce((img->>'is_primary')::boolean,false));
  end loop;
  return p.id;
end;
$$;
revoke all on function public.save_product(jsonb,jsonb) from public,anon;
grant execute on function public.save_product(jsonb,jsonb) to authenticated;

create or replace function public.save_promotion(record_data jsonb,product_ids uuid[]) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare p public.promotions; begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  p=jsonb_populate_record(null::public.promotions,record_data);
  insert into public.promotions(id,title,slug,description,banner_path,terms,start_at,end_at,is_active)
  values(p.id,p.title,p.slug,p.description,p.banner_path,p.terms,p.start_at,p.end_at,p.is_active)
  on conflict(id) do update set title=excluded.title,slug=excluded.slug,description=excluded.description,banner_path=excluded.banner_path,terms=excluded.terms,start_at=excluded.start_at,end_at=excluded.end_at,is_active=excluded.is_active;
  delete from public.promotion_products where promotion_id=p.id;
  insert into public.promotion_products(promotion_id,product_id) select p.id,unnest(product_ids) on conflict do nothing;
  return p.id;
end;
$$;
revoke all on function public.save_promotion(jsonb,uuid[]) from public,anon;
grant execute on function public.save_promotion(jsonb,uuid[]) to authenticated;

-- Persistent, atomic limit; keys are server-salted hashes, never raw IPs or phone numbers.
create or replace function public.check_tradein_rate_limit(key_input text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare count_now integer; begin
  if length(key_input)<>64 then return false; end if;
  delete from private.rate_limits where window_start<now()-interval '2 days';
  insert into private.rate_limits(key_hash,window_start,attempts) values(key_input,now(),1)
  on conflict(key_hash) do update set attempts=case when private.rate_limits.window_start<now()-interval '1 hour' then 1 else private.rate_limits.attempts+1 end,
  window_start=case when private.rate_limits.window_start<now()-interval '1 hour' then now() else private.rate_limits.window_start end
  returning attempts into count_now;
  return count_now<=5;
end;
$$;
revoke all on function public.check_tradein_rate_limit(text) from public,anon,authenticated;
grant execute on function public.check_tradein_rate_limit(text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']),
      ('trade-in-private','trade-in-private',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists product_media_read on storage.objects;
create policy product_media_read on storage.objects for select to anon,authenticated using(bucket_id='product-images');
drop policy if exists product_media_admin on storage.objects;
create policy product_media_admin on storage.objects for all to authenticated using(bucket_id='product-images' and (select private.is_admin())) with check(bucket_id='product-images' and (select private.is_admin()));
drop policy if exists trade_media_admin_read on storage.objects;
create policy trade_media_admin_read on storage.objects for select to authenticated using(bucket_id='trade-in-private' and (select private.is_admin()));
drop policy if exists trade_media_owner_delete on storage.objects;
create policy trade_media_owner_delete on storage.objects for delete to authenticated using(bucket_id='trade-in-private' and (select private.is_owner()));
commit;
