import {validatePlacement} from '../../public/catalog.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function authorized(req,env){
 if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32)return false;
 const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [a,b]=await Promise.all([hash(req.headers.get('Authorization')||''),hash(`Bearer ${env.ADMIN_TOKEN}`)]);return a.reduce((n,v,i)=>n|(v^b[i]),0)===0;
}
export async function onRequest({request:req,env,params}){
 try{
 const path=(params.path||[]).join('/');const url=new URL(req.url);
 if(!env.DB)return json({error:'Applications are not connected yet. Please return after launch.'},503);
 if(!['GET','HEAD'].includes(req.method)&&req.headers.get('Origin')!==url.origin)return json({error:'Invalid request origin'},403);
 if(path==='status'&&req.method==='GET'){
 const {results}=await env.DB.prepare("SELECT panel,x,y,w,h,slot,status,price FROM applications WHERE status != 'rejected'").all();
 return json({placements:results.map(({price,...r})=>r),funded:results.filter(r=>r.status==='paid').reduce((n,r)=>n+r.price,0)});
 }
 if(path.startsWith('admin')){
 if(!await authorized(req,env))return json({error:'Admin access denied'},401);
 if(path==='admin'&&req.method==='GET'){const {results}=await env.DB.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();return json({applications:results});}
 if(req.method==='PATCH'){
 const {status}=await req.json();if(!['pending','approved','paid','rejected'].includes(status))return json({error:'Invalid status'},400);
 const result=await env.DB.prepare("UPDATE applications SET status=?,paid_at=CASE WHEN ?='paid' THEN COALESCE(paid_at,datetime('now')) ELSE NULL END WHERE id=?").bind(status,status,path.split('/')[1]).run();
 return result.meta.changes?json({ok:true}):json({error:'Application not found'},404);
 }
 if(req.method==='GET'&&path.startsWith('admin/logo/')){
 const row=await env.DB.prepare('SELECT logo_key FROM applications WHERE id=?').bind(path.split('/')[2]).first();
 if(!row?.logo_key||!env.LOGOS)return json({error:'Logo not found'},404);
 const obj=await env.LOGOS.get(row.logo_key);if(!obj)return json({error:'Logo not found'},404);
 return new Response(obj.body,{headers:{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 }
 if(path==='applications'&&req.method==='POST'){
 if(!env.LOGOS)return json({error:'Logo storage is not connected yet.'},503);
 if(Number(req.headers.get('Content-Length'))>1600000)return json({error:'Request too large'},413);
 const raw=await req.text();if(raw.length>1600000)return json({error:'Request too large'},413);
 const body=JSON.parse(raw);const p=validatePlacement(body.placement||{});
 const company=String(body.company||'').trim(),email=String(body.email||'').trim(),message=String(body.message||'').trim();
 if(company.length<2||company.length>100||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||message.length>2000||body.consent!==true) return json({error:'Enter your company, a valid email, and consent.'},400);
 // Honeypot: do not record automated submissions.
 if(body.website)return json({error:'Unable to accept application'},400);
 let bytes=null;const id=crypto.randomUUID();const key=`logos/${id}.png`;
 if(body.logo){if(typeof body.logo!=='string'||!body.logo.startsWith('data:image/png;base64,'))return json({error:'Logo must be PNG'},400);
 const bin=atob(body.logo.split(',')[1]);bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
 if(bytes.length>1000000||bytes.length<24||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return json({error:'Invalid PNG or file too large'},400);
 const dv=new DataView(bytes.buffer);if(dv.getUint32(16)>2048||dv.getUint32(20)>2048)return json({error:'Image dimensions too large'},400);
 await env.LOGOS.put(key,bytes,{httpMetadata:{contentType:'image/png'}});
 }
 try{await env.DB.prepare('INSERT INTO applications (id,company,email,message,slot,panel,x,y,w,h,price,logo_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,company,email,message,p.slot,p.panel,p.x,p.y,p.w,p.h,p.price,bytes?key:null).run();}
 catch(e){if(bytes)await env.LOGOS.delete(key);throw e;}
 return json({id,price:p.price,status:'pending'},201);
 }
 return json({error:'Not found'},404);
 }catch(e){if(String(e).includes('placement_conflict'))return json({error:'This area was just reserved. Refresh availability and choose another position.'},409);
 if(e instanceof SyntaxError||/Unknown|dimensions|fit inside/.test(e.message))return json({error:e.message},400);
 return json({error:'Service temporarily unavailable. Your application has not been confirmed.'},503);}
}
