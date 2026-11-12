import http from 'node:http';
import {readFile,readdir,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.SHREK_PORT||5173);
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.md':'text/plain; charset=utf-8','.png':'image/png','.apng':'image/apng','.svg':'image/svg+xml','.ips':'application/octet-stream','.bps':'application/octet-stream'};
let check={running:false,exitCode:null,output:'No test run yet.'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(!['localhost:'+port,'127.0.0.1:'+port].includes(req.headers.host)){res.writeHead(403);res.end();return;}
    if(req.headers.origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(req.headers.origin)){res.writeHead(403);res.end();return;}
    if(url.pathname==='/api/tests'&&['GET','POST'].includes(req.method)) {
      if(req.method==='POST'&&!check.running) {
        check={running:true,exitCode:null,output:'Running cartridge checks…\n'};
        let unitTests;
        try{unitTests=(await readdir(new URL('../tests/',import.meta.url))).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>'tests/'+n);}
        catch(e){check={running:false,exitCode:1,output:'Unable to discover cartridge tests.'};throw e;}
        const child=spawn(process.execPath,['--test',...unitTests],{cwd:root});
        const append=b=>check.output=(check.output+b.toString()).slice(-16000);
        child.stdout.on('data',append);child.stderr.on('data',append);
        child.on('error',e=>{check.running=false;check.exitCode=1;append(e.message);});
        child.on('close',code=>{check.running=false;check.exitCode=code;});
      }
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(check));return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    let rel=decodeURIComponent(url.pathname).slice(1)||'index.html';
    const fixed=rel==='api/base-rom'||rel==='api/checkpoint/bedroom';
    if(rel==='api/base-rom')rel='.local/chrono-trigger-usa.sfc';
    else if(rel==='api/checkpoint/bedroom')rel='.local/checkpoints/bedroom.json';
    else if(rel.split('/').some(p=>p.startsWith('.')||p==='node_modules')){res.writeHead(403);res.end();return;}
    const p=path.resolve(root,rel);
    if(!p.startsWith(root)){res.writeHead(403);res.end();return;}
    const resolved=await realpath(p);
    // The two fixed private files may link to a shared copy outside the project
    // (a worktree's base ROM). Requested paths must still resolve inside it.
    if(!fixed&&!resolved.startsWith(root)){res.writeHead(403);res.end();return;}
    const bytes=await readFile(resolved);
    res.writeHead(200,{'Content-Type':mime[path.extname(rel)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:bytes);
  } catch(e) {res.writeHead(e.code==='ENOENT'?404:500);res.end(e.code==='ENOENT'?'Not found':'Unable to read file');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Shrek Trigger: http://127.0.0.1:${port}\nROM stays on this machine. Ctrl-C stops the server.`));
