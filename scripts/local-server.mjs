// Local development only. Cloudflare uses Pages Functions with D1 and R2.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,unlink} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {resolve,extname,join} from 'node:path';
import {onRequest} from '../functions/api/[[path]].js';
export function databaseAdapter(sqlite){return {prepare(sql){return {bind(...values){return statement(sql,values);},...statement(sql,[])};}};function statement(sql,values){return {async all(){return {results:sqlite.prepare(sql).all(...values)};},async first(){return sqlite.prepare(sql).get(...values);},async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}};}}
const root=fileURLToPath(new URL('../',import.meta.url));
export async function start(port=8788){
 const data=join(root,'.local-data');await mkdir(data,{recursive:true});const db=new DatabaseSync(join(data,'studio.sqlite'));db.exec(await readFile(join(root,'schema.sql'),'utf8'));
 const env={DB:databaseAdapter(db),ADMIN_TOKEN:process.env.ADMIN_TOKEN||'local-preview-token-change-before-deploy',LOGOS:{async put(key,bytes){await writeFile(join(data,key.split('/').pop()),bytes);},async get(key){try{return {body:await readFile(join(data,key.split('/').pop()))};}catch{return null;}},async delete(key){await unlink(join(data,key.split('/').pop())).catch(()=>{});}}};
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
 const server=createServer(async(req,res)=>{try{const url=new URL(req.url,`http://127.0.0.1:${port}`);
 if(url.pathname.startsWith('/api/')){let chunks=[],len=0;for await(const chunk of req){len+=chunk.length;if(len>1600000){res.writeHead(413);res.end();return;}chunks.push(chunk);}const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});const response=await onRequest({request,env,params:{path:url.pathname.slice(5).split('/')}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
 const path=resolve(root,'public','.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(join(root,'public')+'/')){res.writeHead(403);res.end();return;}const content=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",'X-Content-Type-Options':'nosniff'});res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}});
 await new Promise(r=>server.listen(port,'127.0.0.1',r));console.log(`Local: http://127.0.0.1:${port}`);return {server,db};
}
if(process.argv[1]===fileURLToPath(import.meta.url))await start(Number(process.env.PORT)||8788);
