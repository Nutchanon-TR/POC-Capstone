import {Room,RoomEvent,Track,RemoteAudioTrack,ConnectionState,RemoteTrackPublication,RemoteParticipant,LocalTrackPublication} from 'livekit-client';
import {Client,Room as PresenceRoom} from '@colyseus/sdk';
import type {DemoSession,Peer} from './contracts';
let room:Room|null=null,presence:PresenceRoom|null=null,session:DemoSession|null=null;
let peers=new Map<string,Peer>(),presentations:Record<string,string>={},joining=false,generation=0;
const subscribed=new Set<string>();
function object(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null;}
function parsePeer(value:unknown):Peer|null{
 if(!object(value)||typeof value.id!=='string'||typeof value.name!=='string'||typeof value.x!=='number'||typeof value.y!=='number'||typeof value.avatar!=='number'||typeof value.role!=='string')return null;
 return{id:value.id,name:value.name,x:value.x,y:value.y,avatar:value.avatar,direction:typeof value.direction==='number'?value.direction:0,moving:!!value.moving,role:value.role,booth:typeof value.booth==='string'?value.booth:null,dnd:!!value.dnd,hand:!!value.hand,micOffer:typeof value.micOffer==='string'?value.micOffer:null,holdingMic:!!value.holdingMic};
}
function signal(){window.dispatchEvent(new CustomEvent('connecta:media-state',{detail:status()}));}
function status(){return{connected:room?.state===ConnectionState.Connected,realtime:!!presence,joining,session,peers:[...peers.values()],presentations,mic:room?.localParticipant.isMicrophoneEnabled||false,camera:room?.localParticipant.isCameraEnabled||false,screen:room?.localParticipant.isScreenShareEnabled||false,subscriptions:[...subscribed]};}
async function api(endpoint:string,data:Record<string,unknown>){
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.key}:{})},body:JSON.stringify(data)});
 const result:unknown=await response.json();
 if(!response.ok)throw new Error(object(result)&&typeof result.error==='string'?result.error:'The request could not be completed.');
 return result;
}
async function connect(){
 if(joining||presence)return;joining=true;const current=++generation;signal();
 try{
  const result=await api('/api/session',{account:sessionStorage.getItem('connecta-demo-account')||'visitor',name:window.Connecta.state.name,avatar:window.Connecta.state.avatar});
  if(!object(result)||typeof result.id!=='string'||typeof result.key!=='string'||typeof result.role!=='string'||typeof result.name!=='string'||typeof result.realtimeUrl!=='string')throw new Error('Invalid session response.');
  if(current!==generation)return;
  session={id:result.id,key:result.key,name:result.name,role:result.role,ownedBooth:typeof result.ownedBooth==='string'?result.ownedBooth:null,realtimeUrl:result.realtimeUrl};
  window.ConnectaMedia!.session=session;
  const joined=await new Client(session.realtimeUrl).joinOrCreate('exhibition',{key:session.key});
  if(current!==generation){await joined.leave();return;}presence=joined;
  presence.onMessage('presence',(data:unknown)=>{
   if(!object(data)||!Array.isArray(data.peers))return;
   peers.clear();for(const value of data.peers){const peer=parsePeer(value);if(peer)peers.set(peer.id,peer);}
   presentations={};if(object(data.presentations))for(const [key,value]of Object.entries(data.presentations))if(typeof value==='string')presentations[key]=value;
   updateSubscriptions();signal();
  });
  presence.onMessage('welcome',()=>{});
  presence.onMessage('chat',(data:unknown)=>{if(object(data)&&typeof data.text==='string'&&typeof data.id==='string'){window.ConnectaHall?.say(data.text,data.id===session?.id?'player':data.id);window.dispatchEvent(new CustomEvent('connecta:chat',{detail:data}));}});
  presence.onMessage('poster',(data:unknown)=>window.dispatchEvent(new CustomEvent('connecta:poster',{detail:data})));
  presence.onLeave(()=>{presence=null;peers.clear();signal();});
  const scene=window.ConnectaHall?.snapshot();
  const boothNumber=object(scene)&&typeof scene.booth==='string'?Number(scene.booth.replace('booth-',''))-1:undefined;
  const pending=window.Connecta.state.pendingWarp??boothNumber;
  if(pending!==undefined&&Number.isInteger(pending)&&pending>=0&&pending<5){presence.send('warp',{index:pending});delete window.Connecta.state.pendingWarp;}
  const token=await api('/api/media/token',{});
  if(!object(token)||typeof token.token!=='string'||typeof token.url!=='string')throw new Error('Invalid media token response.');
  if(current!==generation)return;
  const media=new Room({adaptiveStream:true,dynacast:true,publishDefaults:{simulcast:true},disconnectOnPageLeave:true});room=media;
  media.on(RoomEvent.TrackPublished,()=>updateSubscriptions());
  media.on(RoomEvent.ParticipantConnected,()=>updateSubscriptions());
  media.on(RoomEvent.TrackSubscribed,(track,publication,participant)=>{
   if(track.kind===Track.Kind.Audio){const el=track.attach();el.dataset.livekitTrack=publication.trackSid;document.body.append(el);}
   else showVideo(track,publication.trackSid,participant.name||participant.identity,false);
   updateSubscriptions();signal();
  });
  media.on(RoomEvent.TrackUnsubscribed,(track,publication)=>{for(const el of track.detach())el.remove();document.querySelector(`[data-livekit-tile="${publication.trackSid}"]`)?.remove();signal();});
  media.on(RoomEvent.LocalTrackPublished,(publication:LocalTrackPublication)=>{if(publication.kind===Track.Kind.Video&&publication.track)showVideo(publication.track,publication.trackSid,'You',true);signal();});
  media.on(RoomEvent.LocalTrackUnpublished,(publication:LocalTrackPublication)=>{for(const el of publication.track?.detach()||[])el.remove();document.querySelector(`[data-livekit-tile="${publication.trackSid}"]`)?.remove();signal();});
  media.on(RoomEvent.ParticipantPermissionsChanged,()=>{updateSubscriptions();signal();});
  media.on(RoomEvent.Disconnected,()=>{document.querySelectorAll('[data-livekit-track],[data-livekit-tile]').forEach(el=>el.remove());signal();});
  media.on(RoomEvent.Reconnecting,signal);media.on(RoomEvent.Reconnected,()=>{updateSubscriptions();signal();});
  await media.connect(token.url,token.token,{autoSubscribe:false});
  if(current!==generation){await media.disconnect();return;}
  updateSubscriptions();signal();
 }catch(error){window.Connecta.toast('Media: '+(error instanceof Error?error.message:'Unable to connect. Start the local LiveKit server.'));signal();}
 finally{joining=false;signal();}
}
function showVideo(track:Track,id:string,name:string,local:boolean){
 const host=document.getElementById('media-videos');if(!host)return;
 document.querySelector(`[data-livekit-tile="${id}"]`)?.remove();
 const tile=document.createElement('div');tile.className=track.source===Track.Source.ScreenShare?'live-screen-tile':'live-camera-tile';tile.dataset.livekitTile=id;
 const video=track.attach();if(video instanceof HTMLVideoElement){video.autoplay=true;video.playsInline=true;video.muted=local;}
 const label=document.createElement('span');label.textContent=name+(track.source===Track.Source.ScreenShare?' · screen':'');tile.append(video,label);host.append(tile);
}
function updateSubscriptions(){
 if(!room||!session)return;
 const local=peers.get(session.id);if(!local)return;
 for(const [id,participant] of room.remoteParticipants){
  const peer=peers.get(id);const dist=peer?Math.hypot(local.x-peer.x,local.y-peer.y):Infinity;
  for(const publication of participant.trackPublications.values()){
   const source=publication.source;const was=subscribed.has(publication.trackSid);
   const presenting=peer?.booth?presentations[peer.booth]:null;
   const sameBooth=!!peer?.booth&&peer.booth===local.booth;
   let want=false;
   if(peer&&!local.dnd&&!peer.dnd){
    if(source===Track.Source.Microphone)want=presenting?sameBooth&&(presenting===id||!!peer.holdingMic):dist<=(was?220:180);
    else want=peer.role==='PRESENTER'&&sameBooth;
   }
   publication.setSubscribed(want);
   if(want)subscribed.add(publication.trackSid);else subscribed.delete(publication.trackSid);
   if(publication.track instanceof RemoteAudioTrack)publication.track.setVolume(presenting?1:Math.max(0,1-dist/220));
  }
 }
}
async function disconnect(){
 generation++;joining=false;
 const oldRoom=room,oldPresence=presence;room=null;presence=null;session=null;peers.clear();subscribed.clear();presentations={};
 if(window.ConnectaMedia)window.ConnectaMedia.session=null;
 await oldRoom?.disconnect();await oldPresence?.leave();
 document.querySelectorAll('[data-livekit-track],[data-livekit-tile]').forEach(el=>el.remove());signal();
}
async function action(name:string,data:Record<string,unknown>={}){const result=await api('/api/media/action',{action:name,...data});return result;}
async function requireRoom(){if(!room||room.state===ConnectionState.Disconnected){if(presence)await disconnect();await connect();}if(!room||room.state!==ConnectionState.Connected)throw new Error('LiveKit is offline. Run npm run media:start first.');return room;}
async function mic(){const r=await requireRoom();await r.startAudio();await r.localParticipant.setMicrophoneEnabled(!r.localParticipant.isMicrophoneEnabled);signal();}
async function camera(){const r=await requireRoom();if(session?.role!=='PRESENTER')throw new Error('Only a Presenter can publish a camera in their own booth.');await r.localParticipant.setCameraEnabled(!r.localParticipant.isCameraEnabled);signal();}
async function screen(){const r=await requireRoom();if(session?.role!=='PRESENTER')throw new Error('Only a Presenter can share a screen in their own booth.');await r.localParticipant.setScreenShareEnabled(!r.localParticipant.isScreenShareEnabled,{audio:true},{simulcast:true});signal();}
window.ConnectaMedia={session,peers,connect,disconnect,mic,camera,screen,action,send:(type,data)=>{if(presence){presence.send(type,data);if(type==='warp')delete window.Connecta.state.pendingWarp;}},status};
window.addEventListener('connecta:position',event=>{if(event instanceof CustomEvent)presence?.send('move',event.detail);});
document.addEventListener('connecta:render',()=>{if(document.getElementById('phaser-host'))void connect();else void disconnect();});
window.addEventListener('beforeunload',()=>{void disconnect();});
window.addEventListener('connecta:audio-start',()=>{void room?.startAudio();});
if(document.getElementById('phaser-host'))void connect();
