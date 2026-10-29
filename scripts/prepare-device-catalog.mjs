import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { JSDOM } from 'jsdom'

// Reference catalog only: no prices, inventory, condition or warranty claims are seeded.
const id = (text) => { const h=createHash('sha256').update(`second-device:${text}`).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}` }
const brands = ['Apple','Samsung','Xiaomi','POCO','OPPO','vivo','realme','Infinix','TECNO','ASUS','Lenovo','Acer','HP','Dell','MSI','Huawei','HONOR','Google','Nothing','OnePlus','Motorola','Sony','Nokia','Microsoft'].map((name,i)=>({id:id(`brand:${name.toLowerCase()}`),name,slug:name.toLowerCase(),logo_path:`/brands/${name.toLowerCase()}.svg`,is_active:true,sort_order:i}))
const categories = [['iPhone','iphone'],['Android','android'],['Tablet','tablet'],['Laptop','laptop'],['Aksesori','aksesori'],['Lainnya','lainnya']].map(([name,slug])=>({id:id(`category:${slug}`),name,slug,is_active:true}))
const models=[]
function add(brand,name,category,storage=[],ram=[],colors=[],source='',variants=[]) {models.push({id:id(`model:${brand}:${name}`),brand_slug:brand,category_slug:category,name,storage_options:storage,ram_options:ram,color_options:colors,variants,source_url:source,is_active:true})}
const appleSource='https://support.apple.com/en-us/108044'
const document=new JSDOM(await readFile('artifacts/research/apple-iphone.html','utf8')).window.document
for(const heading of document.querySelectorAll('h2')) {
  const name=heading.textContent.trim()
  if(!/^iPhone (?:1[1-7](?: |$)|SE \((?:2nd|3rd)|XR$|XS(?: |$))/.test(name))continue
  const parts=[]; let sibling=heading.nextElementSibling
  while(sibling && sibling.tagName!=='H2'){parts.push(sibling.textContent.trim());sibling=sibling.nextElementSibling}
  const text=parts.join('\n'),capacity=text.match(/Capacity:\s*([^\n]+)/i)?.[1],color=text.match(/Colou?rs:\s*([^\n]+)/i)?.[1]
  if(!capacity||!color)continue
  const storage=capacity.split(',').map(part=>{const m=part.trim().match(/^(\d+)\s*(GB|TB)?/);return m?Number(m[1])*(m[2]==='TB'?1024:1):null}).filter(n=>n!==null)
  add('apple',name,'iphone',storage,[],color.split(',').map(x=>x.trim()),appleSource)
}
if(models.length<20)throw new Error('Apple extraction incomplete: inspect the source before regenerating.')
add('apple','iPad (10th generation)','tablet',[64,256],[],['Silver','Blue','Pink','Yellow'],'https://support.apple.com/en-us/111840')
add('apple','MacBook Air (M1, 2020)','laptop',[256,512,1024,2048],[8,16],['Gold','Silver','Space Gray'],'https://support.apple.com/en-us/111883')
add('samsung','Galaxy A55 5G','android',[128,256],[8,12],['Awesome Iceblue','Awesome Navy','Awesome Lilac'],'https://news.samsung.com/id/5-alasan-galaxy-a55-5g-cocok-buatmu-performanya-menyala', [{storage_gb:128,ram_gb:8},{storage_gb:256,ram_gb:8},{storage_gb:256,ram_gb:12}])
add('samsung','Galaxy S23','android',[128,256],[8],['Phantom Black','Cream','Green','Lavender'],'https://image-us.samsung.com/SamsungUS/samsungbusiness/pdf/spec-sheets/s23/att/hhp-s23-spec-att.pdf')
add('xiaomi','Redmi Note 13','android',[256],[8],['Midnight Black','Ice Blue','Ocean Sunset'],'https://www.mi.co.id/id/product/redmi-note-13/specs/')
add('xiaomi','Xiaomi Pad 6','tablet',[256],[8],['Gravity Gray','Mist Blue'],'https://www.mi.co.id/id/product/xiaomi-pad-6/specs/')
add('poco','POCO X6 Pro 5G','android',[512],[12],['Black','Yellow','Grey'],'https://www.mi.co.id/id/product/poco-x6-pro/specs/')
add('oppo','Reno12 F','android',[256],[8],['Oranye','Hijau','Abu-abu'],'https://www.oppo.com/id/smartphones/series-reno/reno12-f-4g/specs/')
add('oppo','Reno12 F 5G','android',[256,512],[8,12],['Amber Orange','Olive Green'],'https://www.oppo.com/en/smartphones/series-reno/reno12-f-5g/specs/',[{storage_gb:256,ram_gb:8},{storage_gb:256,ram_gb:12},{storage_gb:512,ram_gb:12}])
add('vivo','V30','android',[256,512],[8,12],['Hijau Khatulistiwa','Putih Puspa','Hitam Vulkanik'],'https://www.vivo.com/id/products/param/v30',[{storage_gb:256,ram_gb:8},{storage_gb:512,ram_gb:12}])
add('realme','realme 12+ 5G','android',[256],[8],['Pioneer Green','Navigator Beige'],'https://www.realme.com/id/realme-12-plus/specs')
// Model names are sourced; empty option lists deliberately require the actual unit configuration.
add('infinix','NOTE 40','android',[],[],[],'https://id.infinixmobility.com/note-40')
add('tecno','SPARK 20','android',[],[],[],'https://www.tecno-mobile.com/id/phones/tech-specs/techspecs/spark-20/')
add('asus','Zenbook 14 OLED (UX3402)','laptop',[],[],[],'https://www.asus.com/id/laptops/for-home/zenbook/zenbook-14-oled-ux3402/techspec/')
add('lenovo','ThinkPad T14 Gen 2 (Intel)','laptop',[],[],[],'https://psref.lenovo.com/Product/ThinkPad/ThinkPad_T14_Gen_2_Intel')
add('dell','Latitude 5420','laptop',[],[],[],'https://www.dell.com/support/manuals/en-us/latitude-5420-laptop/5420_sp14_setupspecs/')
add('huawei','MatePad 11 (2023)','tablet',[],[],[],'https://consumer.huawei.com/id/tablets/matepad-11-2023/specs/')
await mkdir('src/data',{recursive:true});await mkdir('public/brands',{recursive:true})
const failures=[]
await Promise.all(brands.map(async b=>{
  try {const response=await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@11.15.0/icons/${b.slug}.svg`);if(!response.ok)throw new Error();const svg=await response.text();if(!svg.includes('<svg')||/<script/i.test(svg))throw new Error();await writeFile(`public/brands/${b.slug}.svg`,svg)}
  catch {failures.push(b.name);await writeFile(`public/brands/${b.slug}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 50"><title>${b.name}</title><text x="90" y="34" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#111318">${b.name}</text></svg>`)}
}))
await writeFile('src/data/device-catalog.json',JSON.stringify({checked_at:'2026-10-29',brands,categories,models},null,2)+'\n')
console.log(JSON.stringify({brands:brands.length,models:models.length,wordmark_fallbacks:failures}))
