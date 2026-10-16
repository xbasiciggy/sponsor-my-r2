import {panels,GOAL,quote,overlaps,hitsCut,validatePlacement} from './catalog.js';
import {createVehicle} from './viewer.js';
const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
let image=null,logoData=null,occupied=[],live=false,sending=false,snapshot=null;
// The sponsor picks the decal centre and width; height follows the artwork's proportions.
let spot={panel:'driver-front',cx:56,cy:30},width=60,selected=null;
const aspect=()=>image?image.width/image.height:2.5;
const vehicle=createVehicle((panel,cx,cy)=>{spot={panel,cx,cy};update();});
const examples=[['Badge',15,8],['Strip',60,15],['Panel logo',50,35],['Full door',100,55]];
$('tier-cards').innerHTML=examples.map(([name,w,h])=>`<div class="tier-card"><span class="tier-top"><span>${name}</span><span>${w} × ${h} cm</span></span><strong>${money(quote({w,h}))}</strong><small>One-time sponsorship</small></div>`).join('');
function fit(){const p=panels.find(p=>p.id===spot.panel),r=aspect(),max=Math.floor(Math.min(p.w,p.h*r));$('w').max=max;width=Math.max(8,Math.min(width,max));let w=width,h=w/r;if(h<5){h=5;w=Math.min(p.w,5*r);}
 w=Math.round(w);h=Math.round(Math.min(h,p.h));let x=Math.round(Math.max(0,Math.min(p.w-w,spot.cx-w/2))),y=Math.round(Math.max(0,Math.min(p.h-h,spot.cy-h/2)));
 // Keep clear of the wheel-arch trim: move to the nearest position that fits, if there is one.
 if(hitsCut(p,{x,y,w,h})){let best=null;for(let ty=0;ty<=p.h-h;ty++)for(let tx=0;tx<=p.w-w;tx++){if(hitsCut(p,{x:tx,y:ty,w,h}))continue;const d=(tx-x)**2+(ty-y)**2;if(!best||d<best.d)best={d,tx,ty};}if(best){x=best.tx;y=best.ty;}}
 return {panel:p.id,x,y,w,h,name:p.name,price:quote({w,h})};}
function update(){
 selected=fit();$('w').value=width;$('w-val').textContent=`${selected.w} cm`;
 $('estimate').textContent=money(selected.price);$('size-note').textContent=`${selected.w} × ${selected.h} cm`;$('slot-detail').textContent=`On the ${selected.name.toLowerCase()} · ${selected.w} × ${selected.h} cm`;
 const p=panels.find(p=>p.id===selected.panel),conflict=occupied.some(o=>overlaps(selected,o)),arch=hitsCut(p,selected);
 $('conflict').textContent=conflict?'Another sponsor has reserved part of this area. Move or shrink your logo.':arch?'Your logo overlaps the wheel arch trim. Move it up or make it smaller.':'';$('apply').disabled=conflict||arch||!live;
 vehicle.update(selected,image,occupied);
}
$('w').oninput=()=>{width=+$('w').value;update();};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{vehicle.view(b.dataset.view);document.querySelectorAll('[data-view]').forEach(c=>c.classList.toggle('active',b===c));});
$('toggle-slots').onclick=()=>{const shown=vehicle.toggle();$('toggle-slots').textContent=shown?'Clean preview':'Show guides';$('toggle-slots').setAttribute('aria-pressed',String(shown));};
$('logo').onchange=async()=>{
 const f=$('logo').files[0];if(!f)return;try{if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>5000000)throw Error('Choose a PNG, JPEG or WebP under 5 MB.');
 const bitmap=await createImageBitmap(f);if(bitmap.width>16000||bitmap.height>16000){bitmap.close();throw Error('Please use a smaller image.');}
 const c=document.createElement('canvas'),scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();logoData=c.toDataURL('image/png');if(logoData.length>1333300)throw Error('The processed logo is too large. Please use simpler artwork.');
 image=await createImageBitmap(c);$('remove-logo').hidden=false;update();
 }catch(e){logoData=null;image=null;$('logo').value='';$('remove-logo').hidden=true;update();$('conflict').textContent=e.message;}
};
$('remove-logo').onclick=()=>{image?.close();image=null;logoData=null;$('logo').value='';$('remove-logo').hidden=true;update();};
async function refresh(){try{const res=await fetch('/api/status');if(!res.ok)throw Error();const data=await res.json();occupied=data.placements;live=true;$('funded').textContent=money(data.funded);$('progress').value=Math.min(GOAL,data.funded);$('percent').textContent=`${Math.round(data.funded/GOAL*100)}%`;$('connection').textContent='Live availability · Areas other sponsors have applied for are shaded and reserved.';}catch{live=false;$('connection').textContent='Preview mode · Applications open once the organizer connects storage. You can still place and price your logo.';}update();}
$('apply').onclick=()=>{snapshot={...selected};$('application-summary').textContent=`${selected.name} · ${money(selected.price)} one-time · ${selected.w} × ${selected.h} cm`;$('form-status').textContent='';$('application').showModal();};
$('close-dialog').onclick=()=>{if(!sending)$('application').close();};$('application').addEventListener('cancel',e=>{if(sending)e.preventDefault();});
$('application-form').onsubmit=async e=>{e.preventDefault();if(sending)return;sending=true;$('submit').disabled=true;$('form-status').textContent='Sending your application…';
 const f=new FormData(e.target);try{const placement=validatePlacement(snapshot);const res=await fetch('/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company:f.get('company'),email:f.get('email'),message:f.get('message'),website:f.get('website'),consent:f.get('consent')==='on',placement,logo:logoData})});const data=await res.json();if(!res.ok)throw Error(data.error||'Unable to submit');
 $('form-status').textContent=`Application received. Reference: ${data.id}. Your area is reserved for review. The organizer will contact you by email.`;e.target.reset();$('submit').hidden=true;await refresh();
 }catch(err){$('form-status').textContent=err.message;await refresh();}finally{sending=false;$('submit').disabled=false;}
};$('application').addEventListener('close',()=>{$('submit').hidden=false;});
update();refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
