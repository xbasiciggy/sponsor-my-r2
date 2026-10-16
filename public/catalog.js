export const GOAL=75000;
export const TIERS={Hero:{price:5000,color:'#8b704a'},Premium:{price:2000,color:'#6d7961'},Standard:{price:1000,color:'#849399'},Micro:{price:300,color:'#a49788'}};
// Metres in vehicle space, calibrated against the R2 render sequence: front is -X, +Z is the driver side, Y is up.
// Panel sizes and placements are centimetres measured from the panel's top-left corner as a viewer reads it.
export const AXLES={front:-1.70,rear:1.236,height:.44,arch:.52};
export const panels=[];
// view is the render frame that shows the panel most squarely.
function panel(id,name,w,h,origin,u,v,normal,view,cuts=[]){panels.push({id,name,w,h,origin,u,v,normal,view,cuts});}
const arch=x=>({x,y:AXLES.height,r:AXLES.arch});
// Side panels read front-to-back on the driver side and back-to-front on the passenger side, so logos are never mirrored.
function side(id,name,x0,x1,top,bottom,z,s,arches,normal=[0,0,s]){
 const w=Math.round((x1-x0)*100),h=Math.round((top-bottom)*100);
 const cuts=arches.map(a=>({x:(s>0?a.x-x0:x1-a.x)*100,y:(top-a.y)*100,r:a.r*100}));
 panel(id,name,w,h,[s>0?x0:x1,top,s*z],[s,0,0],[0,-1,0],normal,s>0?14:50,cuts);
}
for(const [label,s] of [['Driver',1],['Passenger',-1]]){
 const p=label.toLowerCase();
 side(p+'-front',`${label} front door`,-1.08,.04,1.14,.50,.955,s,[]);
 side(p+'-rear',`${label} rear door`,.08,1.04,1.15,.50,.955,s,[arch(AXLES.rear)]);
 side(p+'-fender',`${label} front fender`,-2.15,-1.12,1.11,.78,.955,s,[arch(AXLES.front)]);
 side(p+'-quarter',`${label} rear quarter`,1.10,2.20,1.15,.80,.955,s,[arch(AXLES.rear)]);
 side(p+'-rocker',`${label} rocker cladding`,-1.16,.70,.46,.30,.965,s,[]);
 side(p+'-glass',`${label} rear quarter window`,1.10,1.90,1.55,1.22,.86,s,[],[0,.35,s]);
}
// The roof and hood sit almost edge-on to the render camera, so sponsorship stays on surfaces the photos show.
// Glass placements are perforated window film, which keeps the view out.
panel('windshield','Windshield banner',124,24,[-.42,1.615,-.62],[0,0,1],[-.837,-.547,0],[-.547,.837,0],66);
panel('rear-glass','Rear window',112,34,[2.24,1.60,.56],[0,0,-1],[0,-1,0],[1,.25,0],32);
panel('hatch','Rear hatch',140,35,[2.345,1.155,.70],[0,0,-1],[0,-1,0],[1,0,0],32);
panel('front-bumper','Front fascia',160,50,[-2.345,1.00,-.80],[0,0,1],[0,-1,0],[-1,0,0],66);
panel('rear-bumper','Rear bumper',160,38,[2.36,.79,.80],[0,0,-1],[0,-1,0],[1,0,0],32);
export const slots=[];
// fx is measured from the front edge of a side panel; it is converted so both sides mirror each other physically.
function slot(panelId,tier,name,x,y,w,h,fx=false){const p=panels.find(p=>p.id===panelId);if(fx&&p.u[0]<0)x=p.w-x-w;slots.push({id:`${tier[0]}${String(slots.filter(s=>s.tier===tier).length+1).padStart(2,'0')}`,panel:panelId,tier,name,x,y,w,h,price:TIERS[tier].price});}
const sides=[['driver','Driver'],['passenger','Passenger']];
for(const [p,l] of sides){slot(`${p}-front`,'Hero',`${l} front door`,20,6,72,38,true);slot(`${p}-rear`,'Hero',`${l} rear door`,6,5,62,38,true);}
slot('rear-glass','Hero','Rear window',6,4,100,26);slot('front-bumper','Hero','Front fascia',42,3,76,22);
slot('windshield','Hero','Windshield banner',7,2,110,20);slot('hatch','Hero','Rear hatch',16,11,108,15);
for(const [p,l] of sides){slot(`${p}-fender`,'Premium',`${l} front fender`,8,2,44,12,true);slot(`${p}-quarter`,'Premium',`${l} rear quarter`,44,3,56,20,true);}
slot('front-bumper','Premium','Front bumper center',54,32,52,12);
slot('front-bumper','Premium','Front bumper left',4,32,46,12);slot('front-bumper','Premium','Front bumper right',110,32,46,12);
slot('rear-bumper','Premium','Rear bumper left',4,3,42,12);slot('rear-bumper','Premium','Rear bumper right',114,3,42,12);
slot('rear-bumper','Premium','Rear diffuser',35,25,90,10);
for(const [p,l] of sides){
 slot(`${p}-front`,'Standard',`${l} front door lower`,20,48,72,10,true);slot(`${p}-rear`,'Standard',`${l} rear door lower`,6,48,56,10,true);
 slot(`${p}-rocker`,'Standard',`${l} rocker front`,4,3,86,10,true);slot(`${p}-rocker`,'Standard',`${l} rocker rear`,96,3,86,10,true);
}
for(const [p,l] of sides)slot(`${p}-glass`,'Standard',`${l} quarter window`,5,7,70,20,true);
slot('hatch','Standard','Hatch lower left',6,28,50,6);slot('hatch','Standard','Hatch lower right',84,28,50,6);
for(const [p,l] of sides){
 slot(`${p}-front`,'Micro',`${l} front door accent`,96,4,12,8,true);slot(`${p}-rear`,'Micro',`${l} rear door accent`,74,4,12,8,true);
 slot(`${p}-fender`,'Micro',`${l} fender badge`,84,20,14,8,true);slot(`${p}-quarter`,'Micro',`${l} quarter badge`,6,4,14,8,true);
}
slot('hatch','Micro','Hatch badge left',2,4,12,8);slot('hatch','Micro','Hatch badge right',126,4,12,8);
export function quote(p){return Math.max(300,Math.ceil((150+p.w*p.h*.95)/50)*50);}
export function overlaps(a,b){return a.panel===b.panel && a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;}
// True when a rectangle would sit over a wheel arch opening.
export function hitsCut(p,r){return p.cuts.some(c=>{const dx=c.x-Math.max(r.x,Math.min(c.x,r.x+r.w)),dy=c.y-Math.max(r.y,Math.min(c.y,r.y+r.h));return dx*dx+dy*dy<c.r*c.r;});}
export function validatePlacement(input){
 if(input.slot){const s=slots.find(s=>s.id===input.slot);if(!s)throw Error('Unknown placement');return {...s,slot:s.id};}
 const p=panels.find(p=>p.id===input.panel);if(!p)throw Error('Unknown panel');
 const r={panel:p.id};for(const k of ['x','y','w','h']){r[k]=Number(input[k]);if(!Number.isFinite(r[k]))throw Error('Invalid dimensions');}
 if(r.w<5||r.h<5||r.x<0||r.y<0||r.x+r.w>p.w+.001||r.y+r.h>p.h+.001)throw Error('Placement must fit inside the panel');
 if(hitsCut(p,r))throw Error('Placement must fit inside the panel, clear of the wheel arch');
 return {...r,slot:null,name:`Custom ${p.name}`,tier:'Custom',price:quote(r)};
}
export const point=(p,x,y)=>p.origin.map((n,i)=>n+p.u[i]*x/100+p.v[i]*y/100);
