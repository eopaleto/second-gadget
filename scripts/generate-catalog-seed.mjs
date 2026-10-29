import {readFile,writeFile} from 'node:fs/promises'
const catalog=JSON.parse(await readFile('src/data/device-catalog.json','utf8'))
const quote=v=>`'${String(v).replaceAll("'","''")}'`
const json=v=>`${quote(JSON.stringify(v))}::jsonb`
const arr=(values,type='text')=>`ARRAY[${values.map(v=>type==='integer'?Number(v):quote(v)).join(',')}]::${type}[]`
let sql='-- Manufacturer reference data, checked 2026-10-29. No inventory is created.\nbegin;\n'
for(const b of catalog.brands) sql+=`insert into public.brands(id,name,slug,logo_path,sort_order) values(${quote(b.id)},${quote(b.name)},${quote(b.slug)},${quote(b.logo_path)},${b.sort_order}) on conflict(slug) do update set logo_path=case when public.brands.logo_path is null or public.brands.logo_path='' then excluded.logo_path else public.brands.logo_path end;\n`
for(const c of catalog.categories) sql+=`insert into public.categories(id,name,slug) values(${quote(c.id)},${quote(c.name)},${quote(c.slug)}) on conflict(slug) do nothing;\n`
for(const m of catalog.models) sql+=`insert into public.device_models(id,brand_id,category_id,name,storage_options,ram_options,color_options,variants,source_url) select ${quote(m.id)},b.id,c.id,${quote(m.name)},${arr(m.storage_options,'integer')},${arr(m.ram_options,'integer')},${arr(m.color_options)},${json(m.variants)},${quote(m.source_url)} from public.brands b cross join public.categories c where b.slug=${quote(m.brand_slug)} and c.slug=${quote(m.category_slug)} on conflict(brand_id,name) do nothing;\n`
sql+='commit;\n'
await writeFile('supabase/migrations/202610290003_reference_catalog.sql',sql)
console.log(`Prepared ${catalog.brands.length} brands, ${catalog.categories.length} categories, ${catalog.models.length} models.`)
