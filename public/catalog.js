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
// Each side is one continuous painted surface from front fender to rear quarter, so artwork can run across the door gaps.
// Excluded: wheel arches (with their black trim) and the corners where the paint stops at lights and black bumpers.
// x0/x1 are metres along the car; keep-out boxes are [x0,x1,top,bottom] in metres.
function side(id,name,x0,x1,top,bottom,z,s,arches,boxes){
 const w=Math.round((x1-x0)*100),h=Math.round((top-bottom)*100),along=x=>(s>0?x-x0:x1-x)*100;
 const cuts=[...arches.map(a=>({x:along(a.x),y:(top-a.y)*100,r:a.r*100})),
  ...boxes.map(([a,b,t,u])=>{const [l,r]=[along(a),along(b)].sort((m,n)=>m-n);return {rect:[l,(top-t)*100,r-l,(t-u)*100].map(Math.round)};})];
 panel(id,name,w,h,[s>0?x0:x1,top,s*z],[s,0,0],[0,-1,0],[0,0,s],s>0?14:50,cuts);
}
for(const [label,s] of [['Driver',1],['Passenger',-1]])side(label.toLowerCase()+'-side',`${label} side`,-2.05,2.15,1.15,.50,.955,s,[arch(AXLES.front),arch(AXLES.rear)],
 [[-2.05,-1.08,1.15,1.10],[1.04,2.15,1.15,1.10],[-2.05,-1.12,.72,.50],[1.10,2.15,.72,.50]]);
// Rear hatch between the tail light bar and the black bumper; front fascia between the headlights.
panel('hatch','Rear hatch',140,35,[2.345,1.155,.70],[0,0,-1],[0,-1,0],[1,0,0],32);
// Full-width fascia below the light bar, including the silver area under each headlight (headlights cut out).
panel('front-fascia','Front fascia',170,27,[-2.345,.99,-.85],[0,0,1],[0,-1,0],[-1,0,0],66,[{rect:[18,0,19,14]},{rect:[133,0,19,14]}]);
// Rear pillars: the silver panel between the rear door window and the rear quarter window.
for(const [label,s] of [['Driver',1],['Passenger',-1]])panel(label.toLowerCase()+'-pillar',`${label} rear pillar`,24,40,[s>0?.98:1.22,1.58,s*.88],[s,0,0],[0,-1,0],[0,.3,s],s>0?14:50);
// Retained so stored references stay valid; sponsorships are now placed freely and priced by size.
export const slots=[];
export function quote(p){return Math.max(300,Math.ceil((150+p.w*p.h*.95)/50)*50);}
export function overlaps(a,b){return a.panel===b.panel && a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;}
// True when a rectangle would sit over a wheel arch or a keep-out area.
export function hitsCut(p,r){return p.cuts.some(c=>{if(c.rect){const [x,y,w,h]=c.rect;return r.x<x+w&&r.x+r.w>x&&r.y<y+h&&r.y+r.h>y;}const dx=c.x-Math.max(r.x,Math.min(c.x,r.x+r.w)),dy=c.y-Math.max(r.y,Math.min(c.y,r.y+r.h));return dx*dx+dy*dy<c.r*c.r;});}
export function validatePlacement(input){
 const p=panels.find(p=>p.id===input.panel);if(!p)throw Error('Unknown panel');
 const r={panel:p.id};for(const k of ['x','y','w','h']){r[k]=Number(input[k]);if(!Number.isFinite(r[k]))throw Error('Invalid dimensions');}
 if(r.w<5||r.h<5||r.x<0||r.y<0||r.x+r.w>p.w+.001||r.y+r.h>p.h+.001)throw Error('Placement must fit inside the panel');
 if(hitsCut(p,r))throw Error('Placement must fit inside the panel, clear of the wheel arch and trim');
 return {...r,slot:null,name:p.name,tier:'Custom',price:quote(r)};
}
export const point=(p,x,y)=>p.origin.map((n,i)=>n+p.u[i]*x/100+p.v[i]*y/100);
