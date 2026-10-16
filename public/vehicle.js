import {panels,slots,point,TIERS} from './catalog.js';
export function createPlacementVehicle(canvas,onSelect){
 const gl=canvas.getContext('webgl',{antialias:true,alpha:true});if(!gl){canvas.setAttribute('aria-label','3D preview unavailable. Use the placement selector to choose your sponsorship.');return {update(){},toggle(){return false;},view(){},focus(){}};}
 const vertex=`attribute vec3 position;attribute vec2 uv;uniform float yaw;uniform float pitch;uniform vec2 viewport;uniform float zoom;varying vec2 texUV;void main(){vec3 v=position-vec3(0.,.85,0.);float X=v.x*cos(yaw)+v.z*sin(yaw);float Z=-v.x*sin(yaw)+v.z*cos(yaw);float Y=v.y*cos(pitch)-Z*sin(pitch);Z=v.y*sin(pitch)+Z*cos(pitch);float d=6.-Z;float k=min(viewport.x/6.5,viewport.y/3.4)*zoom;gl_Position=vec4(X*k*12./viewport.x,Y*k*12./viewport.y-.02*d,1.01005*d-.201005,d);texUV=uv;}`;
 const fragment=`precision mediump float;uniform vec4 color;uniform sampler2D decal;uniform bool textured;varying vec2 texUV;void main(){vec4 c=color;if(textured){vec4 t=texture2D(decal,texUV);c=vec4(mix(color.rgb,t.rgb,t.a),1.);}gl_FragColor=c;}`;
 const shader=(kind,src)=>{const sh=gl.createShader(kind);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);gl.useProgram(program);
 const pos=gl.getAttribLocation(program,'position'),uv=gl.getAttribLocation(program,'uv'),buffer=gl.createBuffer(),uvbuffer=gl.createBuffer();const uniforms=Object.fromEntries(['yaw','pitch','viewport','zoom','color','textured','decal'].map(k=>[k,gl.getUniformLocation(program,k)]));
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);const textures=new Map();let previousLogo=null;
 function textureFor(f){const key=`${f.label}:${f.slot.w}:${f.slot.h}:${f.image?'logo':'label'}`;if(textures.has(key))return textures.get(key);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);const c=document.createElement('canvas'),ratio=f.slot.w/f.slot.h;c.width=ratio>=1?1024:Math.max(32,Math.round(1024*ratio));c.height=ratio>=1?Math.max(32,Math.round(1024/ratio)):1024;const g=c.getContext('2d');if(f.image){const scale=Math.min(c.width*.90/f.image.width,c.height*.90/f.image.height),w=f.image.width*scale,h=f.image.height*scale;g.drawImage(f.image,(c.width-w)/2,(c.height-h)/2,w,h);}else{g.fillStyle='#fffef5';g.font=`500 ${Math.min(c.height*.40,c.width*.23)}px Arial`;g.textAlign='center';g.textBaseline='middle';g.fillText(f.label,c.width/2,c.height/2);}gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);textures.set(key,texture);return texture;}
 function renderFace(f){let vertices=[],uvs=[];const mapping=[[0,0],[1,0],[1,1],[0,1]];for(let i=1;i<f.v.length-1;i++)for(const idx of [0,i,i+1]){vertices.push(...f.v[idx]);uvs.push(...(mapping[idx]||[.5,.5]));}
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,uvbuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uvs),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);
 const hex=f.color.slice(1,7);const col=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);const a=f.v[0],b=f.v[1],c=f.v[2],u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const norm=Math.hypot(...normal)||1;const light=f.slot?1:.80+.2*Math.abs((normal[0]*-.4+normal[1]*.8+normal[2]*.4)/norm);gl.uniform4f(uniforms.color,...col.map(n=>n*light),1);gl.uniform1i(uniforms.textured,f.slot?1:0);if(f.slot){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textureFor(f));gl.uniform1i(uniforms.decal,0);}gl.drawArrays(gl.TRIANGLES,0,vertices.length/3);
 }
let yaw=.62,pitch=.24,zoom=1,selected=null,logo=null,show=true,occupied=[],hit=[],W,H;let drag=null,moved=false;
 const rot=([x,y,z])=>{y-=.85;const X=x*Math.cos(yaw)+z*Math.sin(yaw),Z=-x*Math.sin(yaw)+z*Math.cos(yaw);return [X,y*Math.cos(pitch)-Z*Math.sin(pitch),y*Math.sin(pitch)+Z*Math.cos(pitch)];};
 const project=v=>{const [x,y,z]=rot(v),s=Math.min(W/6.5,H/3.4)*zoom*6/(6-z);return [W/2+x*s,H*.51-y*s,z];};
 let faces=[];
 function poly(v,color,stroke='#46504430',extra={}){const pts=v.map(project);faces.push({v,pts,z:pts.reduce((n,p)=>n+p[2],0)/pts.length,color,stroke,...extra});}
 function box(x0,y0,z0,x1,y1,z1,color){poly([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]],color);poly([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],color);poly([[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],color);poly([[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]],color);poly([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],'#cdd1bc');}
 function draw(){
 const dpr=Math.min(devicePixelRatio||1,2);W=canvas.clientWidth;H=canvas.clientHeight;if(canvas.width!==W*dpr||canvas.height!==H*dpr){canvas.width=W*dpr;canvas.height=H*dpr;}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(uniforms.yaw,yaw);gl.uniform1f(uniforms.pitch,pitch);gl.uniform2f(uniforms.viewport,W,H);gl.uniform1f(uniforms.zoom,zoom);faces=[];hit=[];
 box(-2.36,.43,-.95,2.36,1.20,.95,'#b8bfa7');box(-2.34,.36,-.96,2.34,.53,.96,'#353c35');
 // Tapered greenhouse, windshield, panoramic roof and upright rear glass.
 poly([[-1.13,1.20,-.92],[-.65,1.70,-.79],[1.91,1.70,-.79],[2.19,1.20,-.92]],'#273932');
 poly([[-1.13,1.20,.92],[-.65,1.70,.79],[1.91,1.70,.79],[2.19,1.20,.92]],'#2f433b');
 poly([[-1.13,1.20,-.92],[-1.13,1.20,.92],[-.65,1.70,.79],[-.65,1.70,-.79]],'#384d46');
 poly([[2.19,1.20,-.92],[2.19,1.20,.92],[1.91,1.70,.79],[1.91,1.70,-.79]],'#253b32');
 poly([[-.65,1.70,-.79],[-.65,1.70,.79],[1.91,1.70,.79],[1.91,1.70,-.79]],'#768573');
 // Window pillars, door seams, flush handles and mirrors.
 for(const side of [-1,1]){
 const z=side*.953;for(const x of [-.89,.02,1.01])poly([[x,.53,z],[x+.012,.53,z],[x+.012,1.20,z],[x,1.20,z]],'#7c8672');
 for(const x of [.01,1.03])poly([[x,1.22,side*.922],[x-.02,1.68,side*.798],[x+.045,1.68,side*.798],[x+.075,1.22,side*.922]],'#5e6958');
 for(const x of [-.21,.68])box(x,1.09,z-side*.01,x+.13,1.115,z+side*.015,'#6b7563');
 box(-.94,1.16,side*.94,-.73,1.27,side*1.075,'#a6af99');
 // Wheels: 32 in diameter, 115.6 in wheelbase.
 for(const x of [-1.468,1.468]){
 const ring=(r,z)=>Array.from({length:32},(_,i)=>[x+Math.cos(i*Math.PI/16)*r,.407+Math.sin(i*Math.PI/16)*r,z]);
 const a=ring(.406,side*.83),b=ring(.406,side*1.003);for(let i=0;i<32;i++)poly([a[i],a[(i+1)%32],b[(i+1)%32],b[i]],'#252a27');
 poly(b,'#202723');poly(ring(.29,side*1.009),'#69716a');poly(ring(.235,side*1.012),'#303a34');
 for(let i=0;i<6;i++){const t=i*Math.PI/3;poly([[x,.407,side*1.015],[x+Math.cos(t)*.27,.407+Math.sin(t)*.27,side*1.015],[x+Math.cos(t+.15)*.27,.407+Math.sin(t+.15)*.27,side*1.015]],'#9aa299');}poly(ring(.07,side*1.02),'#a3aca0');
 }
 }
 // Signature lightbar and vertical capsule lamps.
 box(-2.375,.995,-.87,-2.365,1.025,.87,'#f5f8d7');
 for(const z of [-.64,.64]){const pts=Array.from({length:24},(_,i)=>[-2.382,1.01+Math.sin(i*Math.PI/12)*.145,z+Math.cos(i*Math.PI/12)*.07]);poly(pts,'#f7f8dc','#e4ead4');poly(Array.from({length:24},(_,i)=>[-2.384,1.01+Math.sin(i*Math.PI/12)*.115,z+Math.cos(i*Math.PI/12)*.044]),'#536455');}
 box(2.363,1.12,-.86,2.374,1.15,.86,'#a44e3f');
 // Placements are part of the depth-sorted scene, so hidden surfaces stay hidden.
 for(const s of [...(show?slots:[]),...(selected&&(!selected.id||!show)?[selected]:[])]){
 const p=panels.find(p=>p.id===s.panel);if(!p)continue;
 const isSelected=selected&&(selected.id?s.id===selected.id:s===selected);const reserved=occupied.some(o=>o.panel===s.panel&&s.x<o.x+o.w&&s.x+s.w>o.x&&s.y<o.y+o.h&&s.y+s.h>o.y);
 const verts=[[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.h],[s.x,s.y+s.h]].map(([x,y])=>point(p,x,y));
 poly(verts,isSelected?'#e8e5bc':reserved?'#a9ada1':(TIERS[s.tier]?.color||'#84906a')+'aa',isSelected?'#faf8d7':'#f5f4e5aa',{slot:s,label:s.id||'YOUR BRAND',image:isSelected?logo:null});
 }
 for(const f of faces){renderFace(f);hit.push(f);}
 }
 function pick(x,y){let closest=null,best=-Infinity;for(const f of hit){for(let i=1;i<f.pts.length-1;i++){const [a,b,c]=[f.pts[0],f.pts[i],f.pts[i+1]];const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<.01)continue;const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den,w=1-u-v;if(u>=0&&v>=0&&w>=0){const depth=u*a[2]+v*b[2]+w*c[2];if(depth>best){best=depth;closest=f.slot;}}}}return closest;}
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};moved=false;canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;yaw+=dx*.009;pitch=Math.max(-.12,Math.min(1.5,pitch+dy*.007));drag={x:e.clientX,y:e.clientY};draw();});
 canvas.addEventListener('pointerup',e=>{if(!moved){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const target=pick(x,y);if(target?.id)onSelect(target);} drag=null;});canvas.addEventListener('pointercancel',()=>drag=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.65,Math.min(1.6,zoom-e.deltaY*.001));draw();},{passive:false});
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.15;if(e.key==='ArrowRight')yaw+=.15;if(e.key==='ArrowUp')pitch=Math.min(1.5,pitch+.1);if(e.key==='ArrowDown')pitch=Math.max(-.12,pitch-.1);if(['+','='].includes(e.key))zoom=Math.min(1.6,zoom+.1);if(e.key==='-')zoom=Math.max(.65,zoom-.1);draw();});
 new ResizeObserver(draw).observe(canvas);
 return {update(s,img,occ){selected=s;if(previousLogo!==img||textures.size>80){for(const t of textures.values())gl.deleteTexture(t);textures.clear();}previousLogo=img;logo=img;occupied=occ;draw();},toggle(){show=!show;draw();return show;},view(name){[yaw,pitch]=({perspective:[.62,.24],driver:[0,.06],passenger:[Math.PI,.06],front:[Math.PI/2,.06],rear:[-Math.PI/2,.06],top:[0,1.5]})[name];draw();},focus(s){const p=panels.find(p=>p.id===s.panel);this.view(p.id.startsWith('passenger')?'passenger':p.id.startsWith('driver')?'driver':p.id==='hood'?'perspective':p.id==='roof'?'top':p.id==='front-bumper'?'front':'rear');}};
}
