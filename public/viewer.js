import {panels,slots,point,overlaps,TIERS} from './catalog.js';
// Independently implemented image-sequence viewer. Frame imagery is © Rivian.
// Camera fitted to the 1600×900 render sequence: wheel, bumper and silhouette landmarks across all 72 frames.
const CAMERA={pitch:3.82*Math.PI/180,distance:16.87,focal:3100,cx:798.5,cy:431,pivot:.85,dx:.14,dz:-.065};
// Turntable heading per frame in degrees (0 = facing camera, 90 = driver side). The sequence eases around the front three-quarter view.
const HEADING=[20.1,20.9,22.2,24.6,28.3,32.7,37.2,42.8,49.5,56.9,64.4,72.2,80.2,87.8,94.3,99.8,104.8,109.8,114.8,119.8,124.8,129.8,134.8,139.8,144.8,149.8,154.8,159.8,164.8,169.8,174.8,179.8,184.8,189.8,194.8,199.8,204.8,209.8,214.8,219.8,224.8,229.8,234.8,239.8,244.8,249.8,254.8,259.8,264.8,269.8,275.3,281.2,286.9,292.7,298.4,304.2,309.9,315.7,321.4,327.2,332.9,338.7,344.4,350.1,355.8,.6,4.5,8.3,12,15.2,17.5,19.1];
const VIEWS={perspective:6,driver:14,passenger:50,front:66,rear:32};
export function createVehicle(onSelect){
 const real=document.getElementById('vehicle-real'),base=real.getContext('2d',{willReadFrequently:true}),layer=document.createElement('canvas'),ctx=layer.getContext('2d'),decal=document.createElement('canvas'),dctx=decal.getContext('2d',{willReadFrequently:true}),cache=new Map();
 let frame=6,desired=6,zoom=1,selected=null,logo=null,occupied=[],show=true,drag=null,moved=false,hits=[],width,height,scale,ox,oy,dpr=1;
 const wrap=n=>(Math.round(n)-1+7200)%72+1;
 async function load(n){n=wrap(n);if(cache.has(n))return cache.get(n);const img=new Image();const promise=new Promise((resolve,reject)=>{img.onload=()=>resolve(img);img.onerror=reject;});img.src=`/assets/r2/${String(n).padStart(5,'0')}.webp`;cache.set(n,promise);if(cache.size>14){for(const k of cache.keys()){const dist=Math.min(Math.abs(k-desired),72-Math.abs(k-desired));if(dist>4&&k!==n)cache.delete(k);if(cache.size<=10)break;}}try{return await promise;}catch{cache.delete(n);return null;}}
 const yawOf=n=>(90-HEADING[n-1])*Math.PI/180;
 function rotate([x,y,z],yaw,translate=true){if(translate){x+=CAMERA.dx;z+=CAMERA.dz;y-=CAMERA.pivot;}const X=x*Math.cos(yaw)+z*Math.sin(yaw),Z=-x*Math.sin(yaw)+z*Math.cos(yaw),p=CAMERA.pitch;return [X,y*Math.cos(p)-Z*Math.sin(p),y*Math.sin(p)+Z*Math.cos(p)];}
 // Vehicle metres to canvas CSS pixels for the current frame.
 function projection(v){const [X,Y,Z]=rotate(v,yawOf(frame)),k=CAMERA.focal/(CAMERA.distance-Z);return [(CAMERA.cx+X*k-270)*scale+ox,(CAMERA.cy-Y*k-210)*scale+oy];}
 // How squarely a panel faces the camera: 1 head-on, 0 edge-on, negative when facing away.
 function facing(p,s){const yaw=yawOf(frame),c=point(p,s.x+s.w/2,s.y+s.h/2),[X,Y,Z]=rotate(c,yaw),n=rotate(p.normal,yaw,false),view=[-X,-Y,CAMERA.distance-Z];return (n[0]*view[0]+n[1]*view[1]+n[2]*view[2])/(Math.hypot(...n)*Math.hypot(...view));}
 function triangle(g,img,source,dest){const [[sx0,sy0],[sx1,sy1],[sx2,sy2]]=source,[[x0,y0],[x1,y1],[x2,y2]]=dest;const den=sx0*(sy1-sy2)+sx1*(sy2-sy0)+sx2*(sy0-sy1);if(Math.abs(den)<.01)return;const a=(x0*(sy1-sy2)+x1*(sy2-sy0)+x2*(sy0-sy1))/den,b=(y0*(sy1-sy2)+y1*(sy2-sy0)+y2*(sy0-sy1))/den,c=(x0*(sx2-sx1)+x1*(sx0-sx2)+x2*(sx1-sx0))/den,d=(y0*(sx2-sx1)+y1*(sx0-sx2)+y2*(sx1-sx0))/den,e=(x0*(sx1*sy2-sx2*sy1)+x1*(sx2*sy0-sx0*sy2)+x2*(sx0*sy1-sx1*sy0))/den,f=(y0*(sx1*sy2-sx2*sy1)+y1*(sx2*sy0-sx0*sy2)+y2*(sx0*sy1-sx1*sy0))/den;g.save();g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.lineTo(x2,y2);g.closePath();g.clip();g.transform(a,b,c,d,e,f);g.drawImage(img,0,0);g.restore();}
 // Split the rectangle into a grid so perspective stays straight across large panels.
 function warp(g,img,p,x,y,w,h){const N=4;for(let i=0;i<N;i++)for(let j=0;j<N;j++){const q=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([a,b])=>projection(point(p,x+w*a/N,y+h*b/N))),src=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([a,b])=>[img.width*a/N,img.height*b/N]);triangle(g,img,[src[0],src[1],src[2]],[q[0],q[1],q[2]]);triangle(g,img,[src[0],src[2],src[3]],[q[0],q[2],q[3]]);}}
 const artwork=new Map();
 function placeholder(s){const key=`${s.w}:${s.h}`;if(artwork.has(key))return artwork.get(key);const c=document.createElement('canvas'),ratio=s.w/s.h;c.width=ratio>=1?600:Math.round(600*ratio);c.height=ratio>=1?Math.round(600/ratio):600;const g=c.getContext('2d');g.fillStyle='#f4f1e6';g.textAlign='center';g.textBaseline='middle';const size=Math.min(c.height*.42,c.width/7.2);g.font=`600 ${size}px "Helvetica Neue",Arial,sans-serif`;g.fillText('YOUR BRAND',c.width/2,c.height/2);artwork.set(key,c);return c;}
 // Paint the artwork onto the panel, then let the render's own light and reflections show through it like a printed wrap.
 function paintDecal(s,p,art,alpha){
  const ratio=Math.min(s.w/art.width,s.h/art.height)*.92,rw=art.width*ratio,rh=art.height*ratio,x=s.x+(s.w-rw)/2,y=s.y+(s.h-rh)/2;
  const quad=[[x,y],[x+rw,y],[x+rw,y+rh],[x,y+rh]].map(([a,b])=>projection(point(p,a,b)));
  const xs=quad.map(q=>q[0]*dpr),ys=quad.map(q=>q[1]*dpr),bx=Math.max(0,Math.floor(Math.min(...xs))-2),by=Math.max(0,Math.floor(Math.min(...ys))-2),bw=Math.min(layer.width,Math.ceil(Math.max(...xs))+2)-bx,bh=Math.min(layer.height,Math.ceil(Math.max(...ys))+2)-by;if(bw<2||bh<2)return;
  dctx.setTransform(1,0,0,1,0,0);dctx.clearRect(0,0,decal.width,decal.height);dctx.setTransform(dpr,0,0,dpr,0,0);warp(dctx,art,p,x,y,rw,rh);
  const ink=dctx.getImageData(bx,by,bw,bh),car=base.getImageData(bx,by,bw,bh),a=ink.data,b=car.data;let sum=0,count=0;
  for(let i=0;i<a.length;i+=4)if(a[i+3]>8&&b[i+3]>8){sum+=b[i]*.3+b[i+1]*.59+b[i+2]*.11;count++;}
  const ref=Math.max(30,sum/(count||1));
  for(let i=0;i<a.length;i+=4){if(!a[i+3])continue;const lum=b[i]*.3+b[i+1]*.59+b[i+2]*.11,shade=Math.max(.42,Math.min(1.45,lum/ref)),gloss=Math.max(0,lum-ref*1.18)*.55;a[i]=Math.min(255,a[i]*shade*.94+gloss);a[i+1]=Math.min(255,a[i+1]*shade*.94+gloss);a[i+2]=Math.min(255,a[i+2]*shade*.94+gloss);a[i+3]=a[i+3]*(b[i+3]/255)*alpha;}
  dctx.setTransform(1,0,0,1,0,0);dctx.putImageData(ink,bx,by);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(decal,bx,by,bw,bh,bx,by,bw,bh);ctx.restore();
 }
 async function draw(){const requested=desired;dpr=Math.min(devicePixelRatio||1,2);width=real.clientWidth;height=real.clientHeight;if(!width||!height)return;
 const img=await load(requested);if(!img||requested!==desired)return;frame=requested;
 for(const c of [real,layer,decal]){c.width=width*dpr;c.height=height*dpr;}base.setTransform(dpr,0,0,dpr,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);scale=Math.min(width/1060,height/500)*zoom;ox=(width-1060*scale)/2;oy=(height-500*scale)/2;
 const at=[-270*scale+ox,-210*scale+oy,1600*scale,900*scale];ctx.clearRect(0,0,width,height);base.clearRect(0,0,width,height);base.drawImage(img,...at);hits=[];
 const list=[...(show?slots:[]),...(selected&&(!selected.id||!show)?[selected]:[])];
 for(const s of list){const p=panels.find(p=>p.id===s.panel);if(!p)continue;const face=facing(p,s);if(face<.1)continue;
  const fade=Math.min(1,(face-.1)/.25),active=selected&&(selected.id?s.id===selected.id:s===selected),blocked=occupied.some(o=>overlaps(o,s));
  const path=new Path2D();[[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.h],[s.x,s.y+s.h]].forEach(([x,y],i)=>{const [u,v]=projection(point(p,x,y));i?path.lineTo(u,v):path.moveTo(u,v);});path.closePath();
  if(active){paintDecal(s,p,logo||placeholder(s),fade);if(!show){hits.push({path,s});continue;}ctx.globalAlpha=fade;ctx.setLineDash([4,3]);ctx.strokeStyle='#fffce6';ctx.lineWidth=1.2;ctx.stroke(path);ctx.setLineDash([]);ctx.globalAlpha=1;}
  else{ctx.globalAlpha=fade;ctx.fillStyle=blocked?'#30363280':(TIERS[s.tier]?.color||'#84906a')+'3a';ctx.fill(path);ctx.strokeStyle=blocked?'#c9cbc1aa':'#fbfaee90';ctx.lineWidth=.7;ctx.stroke(path);ctx.globalAlpha=1;}
  hits.push({path,s});
 }
 // Clip overlays to the vehicle silhouette so nothing spills onto the backdrop.
 ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(img,...at);ctx.restore();base.drawImage(layer,0,0,width,height);
 }
 function turn(n){document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));desired=wrap(n);draw();for(const offset of [-2,-1,1,2])load(desired+offset);}
 real.addEventListener('pointerdown',e=>{drag={x:e.clientX,start:desired};moved=false;real.setPointerCapture(e.pointerId);});real.addEventListener('pointermove',e=>{if(!drag)return;const delta=e.clientX-drag.x;if(Math.abs(delta)>4)moved=true;turn(drag.start-delta/7);});real.addEventListener('pointerup',e=>{if(!moved){const rect=real.getBoundingClientRect();const hit=hits.toReversed().find(h=>ctx.isPointInPath(h.path,(e.clientX-rect.left)*dpr,(e.clientY-rect.top)*dpr));if(hit?.s.id)onSelect(hit.s);}drag=null;});real.addEventListener('pointercancel',()=>drag=null);
 real.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.75,Math.min(1.6,zoom-e.deltaY*.001));draw();},{passive:false});real.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','+','-','='].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')turn(desired-1);if(e.key==='ArrowRight')turn(desired+1);if(['+','='].includes(e.key))zoom=Math.min(1.6,zoom+.1);if(e.key==='-')zoom=Math.max(.75,zoom-.1);draw();});
 new ResizeObserver(draw).observe(real);load(6).then(draw);
 // Warm the sequence incrementally without delaying the first frame.
 async function warm(){for(const n of [5,7,14,32,50,66])await load(n);}warm();
 return {update(s,img,occ){selected=s;logo=img;occupied=occ;draw();},toggle(){show=!show;draw();return show;},view(name){turn(VIEWS[name]);},focus(s){turn(panels.find(p=>p.id===s.panel).view);}};
}
