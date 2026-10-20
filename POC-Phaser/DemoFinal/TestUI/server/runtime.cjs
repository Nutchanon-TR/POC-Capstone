const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Server,Room}=require('@colyseus/core');
const {WebSocketTransport}=require('@colyseus/ws-transport');
const {AccessToken,RoomServiceClient}=require('livekit-server-sdk');
const {boothAt,sourcesFor,canHear}=require('./policy.cjs');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||4175),realtimePort=Number(process.env.REALTIME_PORT||2567);
const world=JSON.parse(fs.readFileSync(path.join(root,'assets/maps/exhibition/runtime.json'),'utf8'));
const mediaUrl=process.env.LIVEKIT_URL||'ws://127.0.0.1:7880',mediaRoom='connecta-exhibition';
const apiKey=process.env.LIVEKIT_API_KEY||'devkey',apiSecret=process.env.LIVEKIT_API_SECRET||'secret';
const livekit=new RoomServiceClient(mediaUrl.replace(/^ws/,'http'),apiKey,apiSecret);
const sessions=new Map(),presentations=new Map(),permissionCache=new Map();
const permissionJobs=new Map();
const accounts={visitor:{role:'VISITOR',ownedBooth:null},presenter:{role:'PRESENTER',ownedBooth:'booth-02'},'presenter-a':{role:'PRESENTER',ownedBooth:'booth-01'},judge:{role:'JUDGE',ownedBooth:null},staff:{role:'STAFF',ownedBooth:null}};
let activeRoom=null;
const publicMember=m=>({id:m.id,name:m.name,avatar:m.avatar,x:m.x,y:m.y,direction:m.direction,moving:m.moving,role:m.role,booth:m.booth,dnd:m.dnd,hand:m.hand,holdingMic:m.holdingMic,micOffer:m.micOffer||null});
const metadata=m=>JSON.stringify({role:m.role,booth:m.booth,dnd:m.dnd,ownedBooth:m.ownedBooth,holdingMic:!!m.holdingMic});
function sessionFor(req){const key=(req.headers.authorization||'').replace(/^Bearer /,'');return [...sessions.values()].find(s=>s.key===key&&Date.now()-s.createdAt<14400000);}
function snapshot(){return [...sessions.values()].filter(s=>s.connected).map(publicMember);}
function publish(){activeRoom?.broadcast('presence',{peers:snapshot(),presentations:Object.fromEntries(presentations)});}
async function refreshPermission(member){
 const sources=sourcesFor(member,presentations),signature=JSON.stringify([sources,metadata(member)]);
 if(permissionCache.get(member.id)===signature)return;
 const previous=permissionJobs.get(member.id)||Promise.resolve();
 const next=previous.then(async()=>{const currentSources=sourcesFor(member,presentations),currentSignature=JSON.stringify([currentSources,metadata(member)]);if(permissionCache.get(member.id)===currentSignature)return;try{await livekit.updateParticipant(mediaRoom,member.id,{metadata:metadata(member),permission:{canSubscribe:!member.dnd,canPublish:currentSources.length>0,canPublishData:false,canUpdateOwnMetadata:false,canPublishSources:currentSources}});permissionCache.set(member.id,currentSignature);}catch{/* Position updates retry after media joins. */}});
 permissionJobs.set(member.id,next);await next;if(permissionJobs.get(member.id)===next)permissionJobs.delete(member.id);
}
function returnMic(member){member.holdingMic=false;member.micOffer=null;}
function leaveZone(member,previous){if(previous!==member.booth){returnMic(member);member.hand=false;if(presentations.get(previous)===member.id){presentations.delete(previous);for(const s of sessions.values())if(s.booth===previous)returnMic(s);}}}
class ExhibitionRoom extends Room {
 onCreate(){
  activeRoom=this;this.maxClients=40;
  this.onMessage('move',(client,data)=>{
   const member=sessions.get(client.auth.id);if(!member||!data||typeof data.x!=='number'||typeof data.y!=='number'||!Number.isFinite(data.x)||!Number.isFinite(data.y))return;
   const now=Date.now(),elapsed=Math.min(1,(now-member.lastMove)/1000),allowed=160*elapsed+12,dx=data.x-member.x,dy=data.y-member.y,len=Math.hypot(dx,dy),factor=len>allowed?allowed/len:1;
   const next={x:Math.max(48,Math.min(1280,member.x+dx*factor)),y:Math.max(80,Math.min(766,member.y+dy*factor))};
   const blocked=world.collisions.some(r=>next.x+7>r.x&&next.x-7<r.x+r.width&&next.y+2>r.y&&next.y-5<r.y+r.height);
   if(!blocked){member.x=next.x;member.y=next.y;}member.lastMove=now;member.direction=Number.isInteger(data.direction)&&data.direction>=0&&data.direction<4?data.direction:0;member.moving=!!data.moving;
   const previous=member.booth;member.booth=boothAt(member,world);leaveZone(member,previous);for(const s of sessions.values())if(s.connected)void refreshPermission(s);publish();
  });
  this.onMessage('warp',(client,data)=>{const s=sessions.get(client.auth.id),a=world.areas.filter(a=>a.kind==='booth')[data?.index];if(!s||!a)return;const previous=s.booth;s.x=a.x+a.width/2;s.y=a.y+a.height-14;s.booth=a.id;s.lastMove=Date.now();leaveZone(s,previous);publish();for(const p of sessions.values())if(p.connected)void refreshPermission(p);});
  this.onMessage('chat',(client,data)=>{
   const s=sessions.get(client.auth.id);if(!s||typeof data?.text!=='string'||Date.now()-s.lastChat<400)return;s.lastChat=Date.now();
   const message={id:s.id,name:s.name,text:data.text.trim().slice(0,300),public:!!data.public,at:Date.now()};if(!message.text)return;
   for(const c of this.clients){const peer=sessions.get(c.auth.id);if(peer&&(data.public||peer.id===s.id||canHear(peer,s,presentations)))c.send('chat',message);}
  });
  this.onMessage('poster',(client,data)=>{const s=sessions.get(client.auth.id);if(!s||s.role!=='PRESENTER'||s.booth!==s.ownedBooth||typeof data?.zoom!=='number'||!Number.isFinite(data.zoom))return;const view={booth:s.booth,zoom:Math.max(1,Math.min(4,data.zoom)),x:Math.max(-500,Math.min(500,Number(data.x)||0)),y:Math.max(-500,Math.min(500,Number(data.y)||0))};for(const c of this.clients)if(sessions.get(c.auth.id)?.booth===s.booth)c.send('poster',view);});
 }
 onAuth(client,options){const s=[...sessions.values()].find(s=>s.key===options.key&&Date.now()-s.createdAt<14400000);if(!s||s.connected)throw new Error('Choose a valid demo session first.');return{id:s.id};}
 onJoin(client){const s=sessions.get(client.auth.id);s.connected=true;s.lastMove=Date.now();publish();client.send('welcome',{id:s.id,room:mediaRoom});}
 onLeave(client){const s=sessions.get(client.auth.id);if(!s)return;const previous=s.booth;s.connected=false;s.booth=null;leaveZone(s,previous);returnMic(s);permissionCache.delete(s.id);void livekit.removeParticipant(mediaRoom,s.id).catch(()=>{});publish();for(const p of sessions.values())if(p.connected)void refreshPermission(p);}
 onDispose(){if(activeRoom===this)activeRoom=null;}
}
const realtime=new Server({transport:new WebSocketTransport(),greet:false});realtime.define('exhibition',ExhibitionRoom);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json; charset=utf-8','.ttf':'font/ttf','.woff2':'font/woff2','.map':'application/json'};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>16384)throw new Error('Request is too large.');}return text?JSON.parse(text):{};}
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){json(res,403,{error:'Cross-origin writes are not allowed.'});return;}
  if(url.pathname==='/api/health'){json(res,200,{ok:true,phaser:'4.2.1',livekit:mediaUrl,demo:true});return;}
  if(url.pathname==='/api/session'&&req.method==='POST'){
   if(process.env.DEMO_MODE==='false'){json(res,403,{error:'Demo accounts are disabled.'});return;}
   const data=await body(req),account=Object.hasOwn(accounts,data.account)?accounts[data.account]:accounts.visitor,id=crypto.randomUUID();
   const s={id,key:crypto.randomBytes(32).toString('hex'),name:String(data.name||'Visitor').slice(0,40),avatar:Number.isInteger(data.avatar)&&data.avatar>=0&&data.avatar<14?data.avatar:7,...account,x:world.spawn.x,y:world.spawn.y,direction:0,moving:false,booth:null,dnd:false,hand:false,holdingMic:false,micOffer:null,lastMove:Date.now(),createdAt:Date.now(),lastChat:0,connected:false};sessions.set(id,s);
   json(res,200,{id:s.id,key:s.key,name:s.name,role:s.role,ownedBooth:s.ownedBooth,realtimeUrl:`ws://${req.headers.host.split(':')[0]}:${realtimePort}`});return;
  }
  if(url.pathname.startsWith('/api/media/')){
   const s=sessionFor(req);if(!s||!s.connected){json(res,401,{error:'Join a demo hall session first.'});return;}
   if(url.pathname==='/api/media/token'&&req.method==='POST'){
    const token=new AccessToken(apiKey,apiSecret,{identity:s.id,name:s.name,metadata:metadata(s),ttl:'15m'});token.addGrant({roomJoin:true,room:mediaRoom,canSubscribe:!s.dnd,canPublish:true,canPublishData:false,canUpdateOwnMetadata:false,canPublishSources:sourcesFor(s,presentations)});json(res,200,{token:await token.toJwt(),url:mediaUrl,room:mediaRoom});return;
   }
   if(url.pathname==='/api/media/action'&&req.method==='POST'){
    const data=await body(req),a=data.action;
    if(a==='dnd')s.dnd=!!data.enabled;
    else if(a==='start-presentation'){
     if(s.role!=='PRESENTER'||s.booth!==s.ownedBooth){json(res,403,{error:'Only the presenter inside their assigned booth can start presenting.'});return;}
     if(presentations.has(s.booth)&&presentations.get(s.booth)!==s.id){json(res,409,{error:'Another presenter is already presenting in this booth.'});return;}presentations.set(s.booth,s.id);
    }else if(a==='stop-presentation'){if(presentations.get(s.booth)!==s.id){json(res,403,{error:'Only the current presenter can stop this presentation.'});return;}presentations.delete(s.booth);for(const peer of sessions.values())if(peer.booth===s.booth)returnMic(peer);}
    else if(a==='raise-hand')s.hand=!s.hand;
    else if(a==='offer-mic'){
     const target=sessions.get(data.target);if(presentations.get(s.booth)!==s.id||!target||target.booth!==s.booth||target.id===s.id){json(res,403,{error:'Choose a raised hand in your own booth.'});return;}
     if([...sessions.values()].some(p=>p.booth===s.booth&&(p.holdingMic||p.micOffer))){json(res,409,{error:'Only one person can hold or receive the mic at a time.'});return;}target.micOffer=s.id;
    }else if(a==='accept-mic'){if(!s.micOffer||presentations.get(s.booth)!==s.micOffer){json(res,403,{error:'There is no active microphone offer.'});return;}s.holdingMic=true;s.hand=false;s.micOffer=null;}
    else if(a==='return-mic')returnMic(s);
    else if(a==='reclaim-mic'){if(presentations.get(s.booth)!==s.id){json(res,403,{error:'Presenter permission is required.'});return;}for(const p of sessions.values())if(p.booth===s.booth)returnMic(p);}
    else {json(res,400,{error:'Unknown media action.'});return;}
    await Promise.all([...sessions.values()].filter(p=>p.connected).map(refreshPermission));publish();json(res,200,{ok:true});return;
   }
   json(res,404,{error:'Unknown media endpoint.'});return;
  }
  const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),file=path.resolve(root,'.'+pathname);
  const allowed=/^\/(assets|dist|screenshots)\//.test(pathname)||['/index.html','/overview.html','/app.js','/features.js','/motion.js','/styles.css','/features.css','/README.md'].includes(pathname);
  if(!allowed||!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);
 }catch(error){json(res,400,{error:error instanceof Error?error.message:'Invalid request.'});}
});
async function shutdown(){await realtime.gracefullyShutdown(false);server.close();process.exit(0);}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void shutdown();});
void realtime.listen(realtimePort,'127.0.0.1').then(()=>server.listen(port,'127.0.0.1',()=>console.log(`Connecta http://localhost:${port} | Colyseus ws://localhost:${realtimePort} | LiveKit ${mediaUrl}`))).catch(error=>{console.error(error.message);process.exit(1);});
