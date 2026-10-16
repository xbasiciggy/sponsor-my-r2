export const GOAL=75000;
// Metres in vehicle space, calibrated against the R2 render sequence: front is -X, +Z is the driver side, Y is up.
// Panel sizes and placements are centimetres measured from the panel's top-left corner as a viewer reads it.
// Price: $150 setup + $0.95 per cm² of decal, rounded up to $50, minimum $300.
export const AXLES={front:-1.70,rear:1.236,height:.44,arch:.58};
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
// Only the silver painted body is offered: no glass, lights, black cladding or black bumpers.
for(const [label,s] of [['Driver',1],['Passenger',-1]]){
 const p=label.toLowerCase();
 side(p+'-front',`${label} front door`,-1.08,.04,1.14,.50,.955,s,[]);
 side(p+'-rear',`${label} rear door`,.08,1.04,1.15,.50,.955,s,[arch(AXLES.rear)]);
 side(p+'-fender',`${label} front fender`,-2.05,-1.12,1.10,.72,.955,s,[arch(AXLES.front)]);
 side(p+'-quarter',`${label} rear quarter`,1.10,2.15,1.10,.72,.955,s,[arch(AXLES.rear)]);
}
// Rear hatch between the tail light bar and the black bumper; front fascia between the headlights.
panel('hatch','Rear hatch',140,35,[2.345,1.155,.70],[0,0,-1],[0,-1,0],[1,0,0],32);
panel('front-fascia','Front fascia',90,25,[-2.345,.99,-.45],[0,0,1],[0,-1,0],[-1,0,0],66);
// Retained so stored references stay valid; sponsorships are now placed freely and priced by size.
export const slots=[];
export function quote(p){return Math.max(300,Math.ceil((150+p.w*p.h*.95)/50)*50);}
export function overlaps(a,b){return a.panel===b.panel && a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;}
// True when a rectangle would sit over a wheel arch opening.
export function hitsCut(p,r){return p.cuts.some(c=>{const dx=c.x-Math.max(r.x,Math.min(c.x,r.x+r.w)),dy=c.y-Math.max(r.y,Math.min(c.y,r.y+r.h));return dx*dx+dy*dy<c.r*c.r;});}
export function validatePlacement(input){
 const p=panels.find(p=>p.id===input.panel);if(!p)throw Error('Unknown panel');
 const r={panel:p.id};for(const k of ['x','y','w','h']){r[k]=Number(input[k]);if(!Number.isFinite(r[k]))throw Error('Invalid dimensions');}
 if(r.w<5||r.h<5||r.x<0||r.y<0||r.x+r.w>p.w+.001||r.y+r.h>p.h+.001)throw Error('Placement must fit inside the panel');
 if(hitsCut(p,r))throw Error('Placement must fit inside the panel, clear of the wheel arch');
 return {...r,slot:null,name:p.name,tier:'Custom',price:quote(r)};
}
export const point=(p,x,y)=>p.origin.map((n,i)=>n+p.u[i]*x/100+p.v[i]*y/100);
