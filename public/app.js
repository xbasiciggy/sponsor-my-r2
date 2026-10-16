import {slots,panels,TIERS,GOAL,quote,overlaps,validatePlacement} from './catalog.js';
import {createVehicle} from './viewer.js';
const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
let custom=false,selected=slots[0],image=null,logoData=null,occupied=[],live=false,sending=false,snapshot=null;
const vehicle=createVehicle($('vehicle'),s=>selectSlot(s));
$('slot-select').innerHTML=slots.map(s=>`<option value="${s.id}">${s.id} · ${s.name} · ${money(s.price)}</option>`).join('');
$('panel').innerHTML=panels.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
$('tier-cards').innerHTML=Object.entries(TIERS).map(([tier,t])=>`<button class="tier-card" data-tier="${tier}"><span class="tier-top"><span>${tier}</span><span>${slots.filter(s=>s.tier===tier).length} spots ↗</span></span><strong>${money(t.price)}</strong><small>One-time sponsorship</small></button>`).join('');
function renderList(){const filter=$('filter').value;$('slot-list').innerHTML=slots.filter(s=>filter==='all'||s.tier===filter).map(s=>{const blocked=occupied.some(o=>overlaps(s,o));return `<button class="slot-row" data-slot="${s.id}"><span class="slot-id">${s.id}</span><span><strong>${s.name}</strong><small>${s.tier} · ${s.w} × ${s.h} cm · ${blocked?'Reserved':'Available'}</small></span><span>${money(s.price)} ↗</span></button>`;}).join('');}
function update(){
 if(custom){const p=panels.find(p=>p.id===$('panel').value);$('w').max=p.w;$('h').max=p.h;$('w').value=Math.min(+$('w').value,p.w);$('h').value=Math.min(+$('h').value,p.h);$('x').max=p.w-+$('w').value;$('y').max=p.h-+$('h').value;
 selected={panel:p.id,x:+$('x').value,y:+$('y').value,w:+$('w').value,h:+$('h').value};selected.price=quote(selected);selected.name=`Custom ${p.name}`;
 $('w-val').textContent=`${selected.w} cm`;$('h-val').textContent=`${selected.h} cm`;
 }
 $('estimate').textContent=money(selected.price);$('size-note').textContent=`${selected.w} × ${selected.h} cm`;$('slot-detail').textContent=`${selected.tier||'Custom'} placement · ${selected.w} × ${selected.h} cm`;
 const conflict=occupied.some(o=>overlaps(selected,o));$('conflict').textContent=conflict?'This area is reserved. Choose another spot or adjust your custom placement.':'';$('apply').disabled=conflict||!live;
 vehicle.update(selected,image,occupied);
}
function selectSlot(s){custom=false;selected=s;$('slot-select').value=s.id;setMode(false);vehicle.focus(s);document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));}
function setMode(mode){custom=mode;$('custom-controls').hidden=!mode;$('fixed-controls').hidden=mode;$('fixed-tab').classList.toggle('active',!mode);$('custom-tab').classList.toggle('active',mode);if(!mode)selected=slots.find(s=>s.id===$('slot-select').value);update();}
$('fixed-tab').onclick=()=>setMode(false);$('custom-tab').onclick=()=>{setMode(true);vehicle.focus(selected);};$('slot-select').onchange=()=>selectSlot(slots.find(s=>s.id===$('slot-select').value));
for(const id of ['w','h','x','y'])$(id).oninput=update;$('panel').onchange=()=>{update();vehicle.focus(selected);};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{vehicle.view(b.dataset.view);document.querySelectorAll('[data-view]').forEach(c=>c.classList.toggle('active',b===c));});
$('toggle-slots').onclick=()=>{const shown=vehicle.toggle();$('toggle-slots').textContent=shown?'Hide placements':'Show placements';$('toggle-slots').setAttribute('aria-pressed',String(shown));};
$('slot-list').onclick=e=>{const b=e.target.closest('[data-slot]');if(b){selectSlot(slots.find(s=>s.id===b.dataset.slot));$('studio').scrollIntoView({behavior:'smooth'});}};
$('filter').onchange=renderList;$('tier-cards').onclick=e=>{const b=e.target.closest('[data-tier]');if(b){$('filter').value=b.dataset.tier;renderList();}};
$('logo').onchange=async()=>{
 const f=$('logo').files[0];if(!f)return;try{if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>5000000)throw Error('Choose a PNG, JPEG or WebP under 5 MB.');
 const bitmap=await createImageBitmap(f);if(bitmap.width>16000||bitmap.height>16000){bitmap.close();throw Error('Please use a smaller image.');}
 const c=document.createElement('canvas'),scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();logoData=c.toDataURL('image/png');if(logoData.length>1333300)throw Error('The processed logo is too large. Please use simpler artwork.');
 image=await createImageBitmap(await (await fetch(logoData)).blob());$('remove-logo').hidden=false;update();
 }catch(e){logoData=null;image=null;$('logo').value='';$('remove-logo').hidden=true;update();$('conflict').textContent=e.message;}
};
$('remove-logo').onclick=()=>{image?.close();image=null;logoData=null;$('logo').value='';$('remove-logo').hidden=true;update();};
async function refresh(){try{const res=await fetch('/api/status');if(!res.ok)throw Error();const data=await res.json();occupied=data.placements;live=true;$('funded').textContent=money(data.funded);$('progress').value=Math.min(GOAL,data.funded);$('percent').textContent=`${Math.round(data.funded/GOAL*100)}%`;$('connection').textContent='Live availability · Pending applications temporarily reserve their area.';}catch{live=false;$('connection').textContent='Preview mode · Live applications require Cloudflare database and logo storage setup. You can explore every placement and preview your logo.';}renderList();update();}
$('apply').onclick=()=>{snapshot={...selected};$('application-summary').textContent=`${selected.name} · ${money(selected.price)} one-time · ${selected.w} × ${selected.h} cm`;$('form-status').textContent='';$('application').showModal();};
$('close-dialog').onclick=()=>{if(!sending)$('application').close();};$('application').addEventListener('cancel',e=>{if(sending)e.preventDefault();});
$('application-form').onsubmit=async e=>{e.preventDefault();if(sending)return;sending=true;$('submit').disabled=true;$('form-status').textContent='Sending your application…';
 const f=new FormData(e.target);try{const placement=validatePlacement(snapshot.id?{slot:snapshot.id}:snapshot);const res=await fetch('/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company:f.get('company'),email:f.get('email'),message:f.get('message'),website:f.get('website'),consent:f.get('consent')==='on',placement,logo:logoData})});const data=await res.json();if(!res.ok)throw Error(data.error||'Unable to submit');
 $('form-status').textContent=`Application received. Reference: ${data.id}. Your area is reserved for review. The organizer will contact you by email.`;e.target.reset();$('submit').hidden=true;await refresh();
 }catch(err){$('form-status').textContent=err.message;await refresh();}finally{sending=false;$('submit').disabled=false;}
};$('application').addEventListener('close',()=>{$('submit').hidden=false;});
renderList();update();refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
