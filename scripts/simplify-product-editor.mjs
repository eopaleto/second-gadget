import { readFile, writeFile } from 'node:fs/promises'
const path='src/features/admin/ProductEditor.tsx'
let source=await readFile(path,'utf8')
const start=source.indexOf('  const textFields:')
const end=source.indexOf('        <label className="flex items-center gap-3 text-sm">',start)
if(start<0||end<0)throw new Error('Editor anchors not found')
source=source.slice(0,start)+`  return (
    <form onSubmit={handleSubmit(save)} className="space-y-7" noValidate>
      <fieldset disabled={isSubmitting} className="space-y-7">
        <div className="rounded-xl border border-line bg-paper/60 p-5">
          <p className="mb-5 text-xs font-bold uppercase tracking-wider text-muted">01 / Pilih perangkat</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Brand" htmlFor="product-brand" error={errors.brand_id?.message}>
              <select id="product-brand" className={inputClass} {...register('brand_id')} onChange={e=>{setValue('brand_id',e.target.value,{shouldValidate:true});setValue('model_id','');setValue('model','');setValue('name','');setValue('category_id','');setValue('color','');setValue('storage_gb','');setValue('ram_gb','');setManualModel(false);setModelSearch('')}}>
                <option value="">Pilih brand terlebih dahulu</option>
                {brands.filter(b=>b.is_active || b.id===brandId).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Model" htmlFor="product-model-choice" error={errors.model?.message}>
              <select id="product-model-choice" className={inputClass} disabled={!brandId} value={manualModel?'manual':selectedModel?.id||''} onChange={e=>pickModel(e.target.value)}>
                <option value="">Pilih model</option>
                {filteredModels.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                <option value="manual">Model lain / tambah manual</option>
              </select>
            </Field>
            {brandId && availableModels.length>8 && <Field label="Cari model dalam daftar" htmlFor="model-search"><input id="model-search" type="search" className={inputClass} placeholder="Contoh: iPhone 13" value={modelSearch} onChange={e=>setModelSearch(e.target.value)} /></Field>}
            {manualModel && <Field label="Nama model baru" htmlFor="product-model" error={errors.model?.message}><input id="product-model" className={inputClass} {...register('model')} onChange={e=>{setValue('model',e.target.value);setValue('name',e.target.value);if(!product)setValue('slug',slugify(e.target.value)+'-'+getValues('id').slice(0,8))}} /></Field>}
            <Field label="Kategori" htmlFor="product-category" error={errors.category_id?.message}><select id="product-category" className={inputClass} {...register('category_id')} disabled={Boolean(selectedModel&&!manualModel)}><option value="">Pilih kategori</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          </div>
          {selectedModel?.source_url && <a href={selectedModel.source_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 text-[11px] text-muted underline">Referensi spesifikasi produsen<ArrowUpRight size={12} /></a>}
          <p className="mt-2 text-[11px] leading-6 text-muted">Pilihan spesifikasi adalah referensi. Pilih konfigurasi yang sesuai unit masuk; bukan seluruh varian berarti ada stok.</p>
        </div>
        <div><p className="mb-5 text-xs font-bold uppercase tracking-wider text-muted">02 / Varian & kondisi unit</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <SpecChoice label="Penyimpanan" name="storage_gb" value={watch('storage_gb')} options={(selectedModel?.storage_options.length?selectedModel.storage_options:STORAGE_OPTIONS).map(n=>String(n))} suffix=" GB" error={errors.storage_gb?.message} onChange={v=>{setValue('storage_gb',v,{shouldValidate:true});const rams=selectedModel?.variants.filter(x=>x.storage_gb===Number(v)).map(x=>x.ram_gb)||[];if(rams.length===1)setValue('ram_gb',rams[0]===null?'':String(rams[0]));else if(rams.length && !rams.includes(Number(getValues('ram_gb'))))setValue('ram_gb','')}} />
            <SpecChoice label="RAM (opsional)" name="ram_gb" value={watch('ram_gb')} options={ramOptions.map(n=>String(n))} suffix=" GB" error={errors.ram_gb?.message} onChange={v=>setValue('ram_gb',v,{shouldValidate:true})} />
            <SpecChoice label="Warna unit" name="color" value={watch('color')} options={selectedModel?.color_options.length?selectedModel.color_options:COLOR_OPTIONS} error={errors.color?.message} onChange={v=>setValue('color',v,{shouldValidate:true})} />
            <Field label="Kondisi" htmlFor="product-condition" error={errors.condition_label?.message}><select id="product-condition" className={inputClass} {...register('condition_label')}><option value="">Pilih kondisi unit</option>{CONDITIONS.map(c=><option key={c}>{c}</option>)}</select>{product&&!product.condition_label&&<p className="mt-2 text-xs text-muted">Data lama: {conditionText(product)}. Tentukan kondisi yang sesuai setelah memeriksa unit.</p>}</Field>
            <Field label="Harga jual (Rp)" htmlFor="product-price" error={errors.price?.message}><input id="product-price" type="number" min="0" className={inputClass} placeholder="Contoh: 6500000" {...register('price')} /></Field>
            <Field label="Battery health (%, opsional)" htmlFor="product-battery" error={errors.battery_health?.message}><input id="product-battery" type="number" min="0" max="100" className={inputClass} placeholder="Kosongkan jika belum diperiksa" {...register('battery_health')} /></Field>
            <Field label="Status stok" htmlFor="product-status"><select id="product-status" className={inputClass} {...register('status')}><option value="draft">Draft</option><option value="available">Tersedia</option><option value="reserved">Dipesan</option><option value="sold">Terjual</option><option value="archived">Diarsipkan</option></select></Field>
            <Field label="Garansi unit" htmlFor="warranty-choice"><select id="warranty-choice" className={inputClass} value={!watch('has_warranty')?'none':/^Garansi toko \\d+ hari/.test(watch('warranty_notes'))?watch('warranty_notes').match(/\\d+/)?.[0]:'custom'} onChange={e=>{setValue('has_warranty',e.target.value!=='none');setValue('warranty_notes',e.target.value==='none'?'':e.target.value==='custom'?'':'Garansi toko '+e.target.value+' hari sejak tanggal transaksi.')}}><option value="none">Tidak ada / belum dikonfirmasi</option>{[7,14,30,90,180,365].map(d=><option key={d} value={d}>Garansi toko {d} hari</option>)}<option value="custom">Garansi resmi / ketentuan lain</option></select></Field>
          </div>
        </div>
        <Field label="Catatan kondisi unit" htmlFor="product-condition-notes" error={errors.condition_notes?.message}><textarea id="product-condition-notes" rows={3} className={inputClass} placeholder="Tuliskan kondisi fisik dan kekurangan unit yang ditemukan saat pemeriksaan." {...register('condition_notes')} /></Field>
        {watch('has_warranty') && <Field label="Ketentuan garansi yang berlaku" htmlFor="product-warranty" error={errors.warranty_notes?.message}><textarea id="product-warranty" rows={2} className={inputClass} {...register('warranty_notes')} /><p className="mt-2 text-xs text-muted">Unit ini akan muncul di koleksi bergaransi. Pastikan ketentuannya benar dan jelaskan cakupannya.</p></Field>}
        <details className="rounded-xl border border-line p-5" open={Boolean(errors.name||errors.sku||errors.slug||errors.stock_quantity)}><summary className="cursor-pointer text-sm font-bold">Detail tambahan & kode otomatis</summary><div className="mt-5 grid gap-5 sm:grid-cols-2">
          {([['name','Nama tampilan'],['sku','SKU otomatis'],['slug','Slug otomatis'],['stock_quantity','Jumlah unit']] as const).map(([key,label])=><Field key={key} label={label} htmlFor={'product-'+key} error={errors[key]?.message}><input id={'product-'+key} className={inputClass} type={key==='stock_quantity'?'number':'text'} {...register(key)} /></Field>)}
          {([['screen_notes','Kondisi layar'],['body_notes','Kondisi bodi'],['network_notes','Status jaringan'],['accessories','Kelengkapan']] as const).map(([key,label])=><Field key={key} label={label} htmlFor={'product-'+key}><textarea id={'product-'+key} rows={2} className={inputClass} {...register(key)} /></Field>)}
        </div></details>
`+source.slice(end)
source+=`\nfunction SpecChoice({label,name,value,options,onChange,error,suffix=''}:{label:string;name:string;value:string;options:string[];onChange:(value:string)=>void;error?:string;suffix?:string}) {
 const [custom,setCustom]=useState(Boolean(value && !options.includes(value)))
 useEffect(()=>{if(!value || options.includes(value))setCustom(false)},[value,options.join('|')])
 return <Field label={label} htmlFor={'spec-'+name} error={error}><select id={'spec-'+name} className={inputClass} value={custom?'custom':value} onChange={e=>{if(e.target.value==='custom'){setCustom(true);onChange('')}else{setCustom(false);onChange(e.target.value)}}><option value="">Pilih / belum dicatat</option>{options.map(v=><option key={v} value={v}>{v}{suffix}</option>)}<option value="custom">Varian lain (isi manual)</option></select>{custom&&<><label className="sr-only" htmlFor={'custom-'+name}>Varian lain {label}</label><input id={'custom-'+name} className={inputClass+' mt-2'} type={suffix?'number':'text'} value={value} onChange={e=>onChange(e.target.value)} placeholder={label} /></>}</Field>
}\n`
await writeFile(path,source)
