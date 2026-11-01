-- Admin and owner manage all store data. Account management stays owner-only.
-- Preserves records and existing owner-only admin_profiles policies.
begin;

do $$ declare t text; begin
  foreach t in array array['brands','categories','products','product_images','promotions','promotion_products','store_settings','device_models'] loop
    execute format('drop policy if exists owner_manage on public.%I',t);
    execute format('drop policy if exists monitoring_read on public.%I',t);
    execute format('drop policy if exists admin_models on public.%I',t);
    execute format('drop policy if exists admin_manage on public.%I',t);
    execute format('create policy admin_manage on public.%I for all to authenticated using((select private.is_admin())) with check((select private.is_admin()))',t);
  end loop;
end $$;

grant delete on public.products to authenticated;
drop policy if exists trade_update on public.trade_in_requests;
create policy trade_update on public.trade_in_requests for update to authenticated
using((select private.is_admin())) with check((select private.is_admin()));
drop policy if exists trade_delete on public.trade_in_requests;
create policy trade_delete on public.trade_in_requests for delete to authenticated
using((select private.is_admin()));

drop policy if exists admin_moderate_reviews on public.reviews;
create policy admin_moderate_reviews on public.reviews for update to authenticated
using((select private.is_admin())) with check((select private.is_admin()));

drop policy if exists audit_owner_read on public.admin_audit_logs;
drop policy if exists audit_admin_read on public.admin_audit_logs;
create policy audit_admin_read on public.admin_audit_logs for select to authenticated
using((select private.is_admin()));

drop policy if exists product_media_owner on storage.objects;
drop policy if exists product_media_admin on storage.objects;
create policy product_media_admin on storage.objects for all to authenticated
using(bucket_id='product-images' and (select private.is_admin()))
with check(bucket_id='product-images' and (select private.is_admin()));
drop policy if exists trade_media_owner_delete on storage.objects;
drop policy if exists trade_media_admin_delete on storage.objects;
create policy trade_media_admin_delete on storage.objects for delete to authenticated
using(bucket_id='trade-in-private' and (select private.is_admin()));

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

notify pgrst, 'reload schema';
commit;
