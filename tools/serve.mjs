import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('../docs/',import.meta.url));
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let target=resolve(root,'.'+path);if(target!==resolve(root)&&!target.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}if((await stat(target)).isDirectory())target=resolve(target,'index.html');const body=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end('Not found');}}).listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('TNi PM Academy: http://localhost:'+(process.env.PORT||4173)));
