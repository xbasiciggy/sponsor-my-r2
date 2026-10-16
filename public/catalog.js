export const GOAL=75000;
export const TIERS={Hero:{price:5000,color:'#8b704a'},Premium:{price:2000,color:'#6d7961'},Standard:{price:1000,color:'#849399'},Micro:{price:300,color:'#a49788'}};
// Metres in model space; panel dimensions in centimetres. Front is negative X.
export const panels=[];
function panel(id,name,w,h,origin,u,v){panels.push({id,name,w,h,origin,u,v});}
for(const [side,z] of [['driver',1],['passenger',-1]]){
 panel(side+'-front',`${side} front door`,86,58,[-.83,1.12,z*.965],[1,0,0],[0,-1,0]);
 panel(side+'-rear',`${side} rear door`,83,58,[.08,1.12,z*.965],[1,0,0],[0,-1,0]);
 panel(side+'-fender',`${side} front fender`,44,22,[-1.93,1.14,z*.966],[1,0,0],[0,-1,0]);
 panel(side+'-quarter',`${side} rear quarter`,49,22,[1.53,1.14,z*.966],[1,0,0],[0,-1,0]);
 panel(side+'-rocker',`${side} rocker strip`,170,12,[-.82,.48,z*.968],[1,0,0],[0,-1,0]);
}
panel('hood','Hood',140,77,[-2.19,1.202,-.70],[0,0,1],[1,0,0]);
panel('roof','Roof',142,190,[-.65,1.704,-.71],[0,0,1],[1,0,0]);
panel('hatch','Rear hatch',145,54,[2.366,1.08,.725],[0,0,-1],[0,-1,0]);
panel('front-bumper','Front bumper',160,20,[-2.367,.70,-.8],[0,0,1],[0,-1,0]);
panel('rear-bumper','Rear bumper',160,18,[2.367,.55,.8],[0,0,-1],[0,-1,0]);
export const slots=[];
function slot(panelId,tier,name,x,y,w,h){slots.push({id:`${tier[0]}${String(slots.filter(s=>s.tier===tier).length+1).padStart(2,'0')}`,panel:panelId,tier,name,x,y,w,h,price:TIERS[tier].price});}
for(const side of ['driver','passenger']){for(const door of ['front','rear'])slot(`${side}-${door}`,'Hero',`${side} ${door} door`,5,4,70,38);}
slot('hood','Hero','Hood center',20,20,100,45);slot('hood','Hero','Hood leading strip',10,2,120,14);
slot('roof','Hero','Roof main',10,28,120,120);slot('hatch','Hero','Rear hatch',10,3,125,35);
for(const side of ['driver','passenger'])for(const part of ['fender','quarter'])slot(`${side}-${part}`,'Premium',`${side} ${part}`,2,2,40,18);
for(const p of ['front-bumper','rear-bumper'])for(let i=0;i<3;i++)slot(p,'Premium',`${p.replace('-',' ')} ${['left','center','right'][i]}`,3+i*53,2,48,12);
for(const side of ['driver','passenger']){
 for(const door of ['front','rear'])slot(`${side}-${door}`,'Standard',`${side} ${door} door lower`,5,45,70,10);
 for(let i=0;i<2;i++)slot(`${side}-rocker`,'Standard',`${side} rocker ${i+1}`,2+i*85,1,80,9);
}
slot('roof','Standard','Roof front strip',5,3,132,18);slot('roof','Standard','Roof rear strip',5,160,132,18);
slot('hatch','Standard','Hatch lower left',5,41,62,10);slot('hatch','Standard','Hatch lower right',77,41,62,10);
for(const side of ['driver','passenger'])for(const door of ['front','rear'])slot(`${side}-${door}`,'Micro',`${side} ${door} door accent`,77,4,5,16);
for(let i=0;i<6;i++)slot('roof','Micro',`Roof edge ${i+1}`,i<3?1:135,30+(i%3)*40,5,25);
export function quote(p){return Math.max(300,Math.ceil((150+p.w*p.h*.95)/50)*50);}
export function overlaps(a,b){return a.panel===b.panel && a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;}
export function validatePlacement(input){
 if(input.slot){const s=slots.find(s=>s.id===input.slot);if(!s)throw Error('Unknown placement');return {...s,slot:s.id};}
 const p=panels.find(p=>p.id===input.panel);if(!p)throw Error('Unknown panel');
 const r={panel:p.id};for(const k of ['x','y','w','h']){r[k]=Number(input[k]);if(!Number.isFinite(r[k]))throw Error('Invalid dimensions');}
 if(r.w<5||r.h<5||r.x<0||r.y<0||r.x+r.w>p.w+.001||r.y+r.h>p.h+.001)throw Error('Placement must fit inside the panel');
 return {...r,slot:null,name:`Custom ${p.name}`,tier:'Custom',price:quote(r)};
}
export const point=(p,x,y)=>p.origin.map((n,i)=>n+p.u[i]*x/100+p.v[i]*y/100);
