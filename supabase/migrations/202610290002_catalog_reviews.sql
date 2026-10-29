begin;
create table if not exists public.device_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  category_id uuid not null references public.categories(id),
  name text not null check(length(trim(name)) between 1 and 100),
  storage_options integer[] not null default '{}', ram_options integer[] not null default '{}',
  color_options text[] not null default '{}', variants jsonb not null default '[]' check(jsonb_typeof(variants)='array'),
  source_url text not null default '' check(source_url='' or source_url ~ '^https://'),
  is_active boolean not null default true,
  unique(brand_id,name)
);
create index if not exists device_models_brand on public.device_models(brand_id);
alter table public.device_models enable row level security;
grant select on public.device_models to anon;
grant select,insert,update,delete on public.device_models to authenticated;
grant all on public.device_models to service_role;
drop policy if exists public_models on public.device_models;
create policy public_models on public.device_models for select to anon,authenticated using(is_active and exists(select 1 from public.brands b where b.id=brand_id and b.is_active));
drop policy if exists admin_models on public.device_models;
create policy admin_models on public.device_models for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
drop trigger if exists audit_change on public.device_models;
create trigger audit_change after insert or update or delete on public.device_models for each row execute function private.audit_change();

alter table public.products add column if not exists model_id uuid references public.device_models(id);
alter table public.products add column if not exists condition_label text;
alter table public.products add column if not exists has_warranty boolean not null default false;
alter table public.products add column if not exists sold_at timestamptz;
alter table public.products drop constraint if exists valid_condition_label;
alter table public.products add constraint valid_condition_label check(condition_label is null or condition_label in ('Sangat Baik','Baik','Like New','Brand New In Box','Brand New Open Box'));
alter table public.products drop constraint if exists warranty_details_required;
alter table public.products add constraint warranty_details_required check(not has_warranty or length(trim(warranty_notes))>0);
-- Do not invent dates for historical sales. sold_at remains NULL for existing sold units.
create or replace function private.touch_product() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at=now();
  if new.status='sold' then
    new.stock_quantity=0;
    if tg_op='INSERT' then new.sold_at=now();
    elsif old.status is distinct from 'sold' then new.sold_at=now();
    else new.sold_at=old.sold_at; end if;
  else new.sold_at=null; end if;
  return new;
end;
$$;

create or replace function public.save_product_v2(record_data jsonb,image_data jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare product_id uuid; chosen_model uuid; brand uuid; category uuid; label text; begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  brand=(record_data->>'brand_id')::uuid; category=(record_data->>'category_id')::uuid;
  chosen_model=nullif(record_data->>'model_id','')::uuid;
  label=record_data->>'condition_label';
  if label is null or label not in ('Sangat Baik','Baik','Like New','Brand New In Box','Brand New Open Box') then raise exception 'condition_required'; end if;
  if chosen_model is null then
    insert into public.device_models(brand_id,category_id,name) values(brand,category,trim(record_data->>'model'))
    on conflict(brand_id,name) do update set name=excluded.name returning id into chosen_model;
  end if;
  if not exists(select 1 from public.device_models m where m.id=chosen_model and m.brand_id=brand and m.category_id=category) then raise exception 'model_brand_category_mismatch'; end if;
  -- Clearing warranty notes must not transiently violate the existing warranty check.
  -- Both updates and the underlying product/image write remain in this transaction.
  if not coalesce((record_data->>'has_warranty')::boolean,false) then
    update public.products set has_warranty=false where id=(record_data->>'id')::uuid and has_warranty;
  end if;
  product_id=public.save_product(record_data,image_data);
  update public.products set model_id=chosen_model,condition_label=label,
    condition_grade=case when label='Baik' then 'B' else 'A' end,
    has_warranty=coalesce((record_data->>'has_warranty')::boolean,false)
  where id=product_id;
  return product_id;
end;
$$;
revoke all on function public.save_product_v2(jsonb,jsonb) from public,anon;
grant execute on function public.save_product_v2(jsonb,jsonb) to authenticated;

alter table public.store_settings add column if not exists facebook_url text not null default '';
alter table public.store_settings add column if not exists tiktok_url text not null default '';
alter table public.store_settings add column if not exists youtube_url text not null default '';
alter table public.store_settings add column if not exists payment_methods text[] not null default array['qris','bank','ewallet','visa','mastercard','kredivo'];
alter table public.store_settings drop constraint if exists valid_social_urls;
alter table public.store_settings add constraint valid_social_urls check(
 (facebook_url='' or facebook_url ~ '^https?://') and (tiktok_url='' or tiktok_url ~ '^https?://') and (youtube_url='' or youtube_url ~ '^https?://'));
alter table public.store_settings drop constraint if exists valid_payment_methods;
alter table public.store_settings add constraint valid_payment_methods check(payment_methods <@ array['qris','bank','ewallet','visa','mastercard','kredivo']::text[]);

-- Reviews are authored by visitors through the validated server function.
-- Admins may only moderate publication, never change the author's text or rating.
drop policy if exists admin_manage on public.reviews;
revoke insert,update,delete on public.reviews from authenticated;
grant update(is_approved) on public.reviews to authenticated;
drop policy if exists admin_read_reviews on public.reviews;
create policy admin_read_reviews on public.reviews for select to authenticated using((select private.is_admin()));
drop policy if exists admin_moderate_reviews on public.reviews;
create policy admin_moderate_reviews on public.reviews for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));

-- One subscription replaces polling. Nothing private is exposed by publication:
-- Realtime still applies the subscriber's SELECT privileges/RLS.
do $$ declare t text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach t in array array['products','product_images','brands','categories','device_models','promotions','promotion_products','reviews','store_settings','trade_in_requests'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
        execute format('alter publication supabase_realtime add table public.%I',t);
      end if;
    end loop;
  end if;
end $$;
commit;
