import Phaser from 'phaser';
import type { WorldData,Point,Peer } from './contracts';

let game:Phaser.Game|null=null;
let active:HallScene|null=null;
let generation=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
interface Person { id:string;sprite:Phaser.GameObjects.Sprite;label:Phaser.GameObjects.Text;character:number;direction:number;moving:boolean;target:Point|null;pause:number;path:Point[];step:number;isRemote?:boolean }

class HallScene extends Phaser.Scene {
 world:WorldData; people:Person[]=[];player!:Person;keys:Phaser.Types.Input.Keyboard.CursorKeys|null=null;
 letters:Record<string,Phaser.Input.Keyboard.Key>={}; ring!:Phaser.GameObjects.Arc;
 grid:boolean[][]=[];lastPositionUpdate=0;lastBooth:string|null=null;fitZoom=1;zoomMultiplier=1;clickPath:Point[]=[];
 boothLabels=new Map<string,{label:Phaser.GameObjects.Text;index:number}>();presentingBooths=new Set<string>();
 constructor(world:WorldData){super('Exhibition');this.world=world;}
 preload(){
  this.load.image('floor','assets/maps/exhibition/floor-atlas.png');
  for(const t of this.world.tiles)this.load.image('tile-'+t.gid,t.image);
  for(const [i,c] of window.Connecta.chars.entries()){
   this.load.spritesheet('walk-'+i,c.walk,{frameWidth:80,frameHeight:80});
   if(c.idle)this.load.spritesheet('idle-'+i,c.idle,{frameWidth:80,frameHeight:80});
  }
 }
 create(){
  active=this;
  const rows=Array.from({length:this.world.rows},(_,r)=>this.world.floor.slice(r*this.world.columns,(r+1)*this.world.columns));
  const map=this.make.tilemap({data:rows,tileWidth:32,tileHeight:32});
  const floor=map.addTilesetImage('floor','floor',32,32,0,0,0);
  if(floor)map.createLayer(0,floor,0,0)?.setDepth(-1000);
  for(const object of this.world.sprites){
   const im=this.add.image(object.x,object.y,'tile-'+object.gid).setOrigin(0,0).setDisplaySize(object.width,object.height).setDepth(object.depth);
   if(object.interactable){im.setInteractive({useHandCursor:true});im.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(pointer.event.target!==this.game.canvas)return;const area=this.world.areas.filter(a=>a.kind==='booth').findIndex(a=>object.x>=a.x&&object.x<a.x+a.width&&object.y>=a.y&&object.y<a.y+a.height);if(area>=0)this.openBooth(area);else if(['chair','sofa'].includes(object.kind)){window.Connecta.toast('A little pause. Click the floor to keep walking.');this.clickPath=[];}});}
  }
  this.grid=Array.from({length:this.world.rows},(_,r)=>Array.from({length:this.world.columns},(_,c)=>!this.blocked({x:c*32+16,y:r*32+16})));
  const booths=this.world.areas.filter(a=>a.kind==='booth');
  for(const [i,area] of booths.entries()){
   const tag=this.add.text(area.x+area.width/2,area.y+10,`0${i+1} · ${['Aurora','Pixel Path','GreenLoop','Re:Cycle','Touchpoint'][i]}`,{fontFamily:'Plus Jakarta Sans',fontSize:'10px',color:'#1d5cf5',backgroundColor:'#ffffff',padding:{x:7,y:4}}).setOrigin(.5,0).setDepth(area.y+1000).setInteractive({useHandCursor:true});tag.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(pointer.event.target!==this.game.canvas)return;this.warp(i);this.openBooth(i);});
   this.boothLabels.set(area.id,{label:tag,index:i});
  }
  const mediaChanged=(event:Event)=>{if(event instanceof CustomEvent&&event.detail&&typeof event.detail==='object'&&event.detail.presentations)this.presentingBooths=new Set(Object.keys(event.detail.presentations));};
  window.addEventListener('connecta:media-state',mediaChanged);this.events.once('shutdown',()=>window.removeEventListener('connecta:media-state',mediaChanged));
  const open=this.openCells();
  for(let i=0;i<window.Connecta.chars.length;i++){
   const p=open[(i*47+19)%open.length];if(!p)continue;
   const person=this.makePerson('npc-'+i,window.Connecta.chars[i].name,i,p);
   person.path=this.path(p,open[(i*61+103)%open.length]||p);person.pause=i%3;this.people.push(person);
  }
  this.player=this.makePerson('player',window.Connecta.state.name+' (you)',window.Connecta.state.avatar,this.world.spawn);
  this.player.label.setBackgroundColor('#1d5cf5');
  this.ring=this.add.circle(this.player.sprite.x,this.player.sprite.y,115,0x1d5cf5,.025).setStrokeStyle(1,0x1d5cf5,.22).setDepth(-100);
  if(this.input.keyboard){this.keys=this.input.keyboard.createCursorKeys();for(const key of ['W','A','S','D','E'])this.letters[key]=this.input.keyboard.addKey(key);}
  this.input.on('pointerup',(pointer:Phaser.Input.Pointer,objects:Phaser.GameObjects.GameObject[])=>{
   if(pointer.event.target!==this.game.canvas||objects.length||pointer.getDistance()>8||this.uiFocused())return;
   const p=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
   if(!this.blocked(p))this.clickPath=this.path(this.player.sprite,p);
  });
  this.cameras.main.setBounds(0,0,this.world.width,this.world.height);
  this.scale.on('resize',()=>this.fit());this.fit();
  const loading=document.getElementById('hall-loading');if(loading)loading.remove();
  window.dispatchEvent(new CustomEvent('connecta:hall-ready',{detail:{width:this.world.width,height:this.world.height}}));
  window.ConnectaHall={warp:i=>this.warp(i),zoom:n=>{this.zoomMultiplier=n;this.fit();},position:()=>({x:this.player.sprite.x,y:this.player.sprite.y}),snapshot:()=>({phaser:Phaser.VERSION,objects:this.world.sprites.length,collisions:this.world.collisions.length,npcs:this.people.filter(p=>p.id.startsWith('npc')).length,player:{x:this.player.sprite.x,y:this.player.sprite.y},booth:this.lastBooth,canvas:this.game.canvas.width+'x'+this.game.canvas.height}),destroy:dispose,emote:t=>this.say(t),say:(t,id)=>this.say(t,id)};
 }
 makePerson(id:string,name:string,character:number,p:Point):Person{
  const sprite=this.add.sprite(p.x,p.y,'walk-'+character,0).setOrigin(.5,.91).setScale(.75);
  const label=this.add.text(p.x,p.y+7,name,{fontFamily:'Plus Jakarta Sans',fontSize:'9px',backgroundColor:'#26314f',color:'#ffffff',padding:{x:4,y:2}}).setOrigin(.5,0);
  return{id,sprite,label,character,direction:0,moving:false,target:null,pause:0,path:[],step:0};
 }
 blocked(p:Point){
  if(p.x<48||p.x>1280||p.y<80||p.y>766)return true;
  return this.world.collisions.some(r=>p.x+8>r.x&&p.x-8<r.x+r.width&&p.y+3>r.y&&p.y-7<r.y+r.height);
 }
 openCells(){const list:Point[]=[];for(let r=3;r<24;r++)for(let c=2;c<40;c++)if(this.grid[r]?.[c])list.push({x:c*32+16,y:r*32+16});return list;}
 path(from:Point,to:Point):Point[]{
  const start={x:Math.floor(from.x/32),y:Math.floor(from.y/32)},end={x:Math.floor(to.x/32),y:Math.floor(to.y/32)};
  const key=(p:Point)=>`${p.x},${p.y}`;const queue=[start];const previous=new Map<string,Point|null>([[key(start),null]]);let found:Point|null=null;
  for(let head=0;head<queue.length;head++){
   const cur=queue[head];if(cur.x===end.x&&cur.y===end.y){found=cur;break;}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const next={x:cur.x+dx,y:cur.y+dy};if(this.grid[next.y]?.[next.x]&&!previous.has(key(next))){previous.set(key(next),cur);queue.push(next);}}
  }
  if(!found)return [];
  const result:Point[]=[];let cursor:Point|null=found;
  while(cursor){result.push({x:cursor.x*32+16,y:cursor.y*32+16});cursor=previous.get(key(cursor))||null;}
  return result.reverse().slice(1);
 }
 fit(){
  const w=this.scale.width,h=this.scale.height;
  this.fitZoom=Math.min(w/this.world.width,(h-105)/this.world.height);
  this.cameras.main.setZoom(this.fitZoom*this.zoomMultiplier).centerOn(this.world.width/2,this.world.height/2);
  if(w<700)this.cameras.main.setZoom(Math.max(.75,this.fitZoom*this.zoomMultiplier)).startFollow(this.player.sprite,true,.08,.08);
  else this.cameras.main.stopFollow();
 }
 uiFocused(){return !!document.querySelector('dialog[open]')||!!document.activeElement?.closest('input,textarea,select');}
 move(person:Person,dx:number,dy:number,dt:number,speed=128){
  const len=Math.hypot(dx,dy);person.moving=len>.05;
  if(!person.moving)return;
  person.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy>0?0:1);
  const x=person.sprite.x+dx/len*speed*dt,y=person.sprite.y+dy/len*speed*dt;
  if(!this.blocked({x,y:person.sprite.y}))person.sprite.x=x;
  if(!this.blocked({x:person.sprite.x,y}))person.sprite.y=y;
 }
 animate(person:Person,time:number){
  const c=window.Connecta.chars[person.character];const idle=!person.moving&&!!c.idle;
  const texture=(idle?'idle-':'walk-')+person.character;
  if(person.sprite.texture.key!==texture)person.sprite.setTexture(texture);
  const animate=(!window.Connecta.state.paused&&!reduced.matches)||person.id==='player'&&person.moving;
  const frame=person.direction*4+(animate?Math.floor(time/(person.moving?135:500))%4:0);
  person.sprite.setFrame(idle||person.moving?frame:person.direction*4);
  const breath=!person.moving&&!idle&&animate?Math.sin(time/460)*.008:0;person.sprite.setScale(.75,.75+breath).setDepth(person.sprite.y);
  person.label.setPosition(person.sprite.x,person.sprite.y+6).setDepth(person.sprite.y+1);
 }
 update(time:number,delta:number){
  if(!this.player)return;
  const dt=Math.min(delta/1000,.04);let dx=0,dy=0;
  if(!this.uiFocused()){
   dx=Number(this.keys?.right.isDown||this.letters.D?.isDown)-Number(this.keys?.left.isDown||this.letters.A?.isDown);
   dy=Number(this.keys?.down.isDown||this.letters.S?.isDown)-Number(this.keys?.up.isDown||this.letters.W?.isDown);
   if(dx||dy)this.clickPath=[];
   else if(this.clickPath[0]){dx=this.clickPath[0].x-this.player.sprite.x;dy=this.clickPath[0].y-this.player.sprite.y;if(Math.hypot(dx,dy)<5){this.clickPath.shift();dx=dy=0;}}
  }
  this.move(this.player,dx,dy,dt);this.animate(this.player,time);this.ring.setPosition(this.player.sprite.x,this.player.sprite.y);
  const open=this.openCells();
  for(const person of this.people){
   if(person.isRemote){this.animate(person,time);continue;}
   person.moving=false;
   if(!window.Connecta.state.paused&&!reduced.matches&&!document.hidden){
    if(person.pause>0)person.pause-=dt;
    else if(person.path[0]){const p=person.path[0];this.move(person,p.x-person.sprite.x,p.y-person.sprite.y,dt,52);if(distance(person.sprite,p)<4)person.path.shift();}
    else {person.pause=1+Number(person.id.replace('npc-',''))%3;person.path=this.path(person.sprite,Phaser.Utils.Array.GetRandom(open));}
   }
   this.animate(person,time);
  }
  const area=this.world.areas.find(a=>a.kind==='booth'&&this.player.sprite.x>=a.x&&this.player.sprite.x<a.x+a.width&&this.player.sprite.y>=a.y&&this.player.sprite.y<a.y+a.height);
  const booth=area?.id||null;
  if(booth!==this.lastBooth){this.lastBooth=booth;window.dispatchEvent(new CustomEvent('connecta:zone',{detail:{booth,index:area?this.world.areas.filter(a=>a.kind==='booth').indexOf(area):-1}}));}
  if(this.letters.E&&Phaser.Input.Keyboard.JustDown(this.letters.E)&&area&&!this.uiFocused())this.openBooth(this.world.areas.filter(a=>a.kind==='booth').indexOf(area));
  if(time-this.lastPositionUpdate>100){this.lastPositionUpdate=time;window.dispatchEvent(new CustomEvent('connecta:position',{detail:{x:this.player.sprite.x,y:this.player.sprite.y,direction:this.player.direction,moving:this.player.moving}}));this.syncPeers();}
 }
 syncPeers(){
  const peers=window.ConnectaMedia?.peers;if(!peers)return;
  for(const [id,peer] of peers){if(id===window.ConnectaMedia?.session?.id)continue;let person=this.people.find(p=>p.id===id);if(!person){person=this.makePerson(id,peer.name+' · '+peer.role,peer.avatar,peer);person.isRemote=true;this.people.push(person);}person.sprite.setPosition(peer.x,peer.y);person.direction=peer.direction;person.moving=peer.moving;person.label.setText(peer.name+(peer.dnd?' · DND':''));}
  this.people=this.people.filter(person=>{if(person.isRemote&&!peers.has(person.id)){person.sprite.destroy();person.label.destroy();return false;}return true;});
  for(const [id,{label,index}]of this.boothLabels){const present=[...peers.values()].filter(p=>p.booth===id),name=['Aurora','Pixel Path','GreenLoop','Re:Cycle','Touchpoint'][index];const status=this.presentingBooths.has(id)?'Presenting':present.some(p=>p.role==='PRESENTER')?'Presenter here':'No presenter';label.setText(`0${index+1} · ${name}\n${status} · ${present.length} here`);}
 }
 warp(index:number){
  const area=this.world.areas.filter(a=>a.kind==='booth')[index];if(!area){window.Connecta.toast('This project has not been assigned a slot in this hall.');return;}
  const p={x:area.x+area.width/2,y:area.y+area.height-14};this.player.sprite.setPosition(p.x,p.y);this.clickPath=[];window.Connecta.state.pendingWarp=index;window.ConnectaMedia?.send('warp',{index});
 }
 openBooth(index:number){window.dispatchEvent(new CustomEvent('connecta:open-booth',{detail:{index}}));}
 say(text:string,id='player'){
  const p=id==='player'?this.player:this.people.find(p=>p.id===id);if(!p)return;
  const bubble=this.add.text(p.sprite.x,p.sprite.y-70,text.slice(0,160),{fontFamily:'Plus Jakarta Sans',fontSize:'12px',color:'#0f1a3a',backgroundColor:'#ffffff',padding:{x:10,y:7},wordWrap:{width:180}}).setOrigin(.5,1).setDepth(10000);
  this.time.delayedCall(6500,()=>bubble.destroy());
 }
}
function dispose(){generation++;game?.destroy(true);game=null;active=null;delete window.ConnectaHall;}
async function mount(){
 dispose();const mountGeneration=generation;const host=document.getElementById('phaser-host');if(!host)return;
 try{
  const response=await fetch('assets/maps/exhibition/runtime.json');if(!response.ok)throw new Error('Map data could not be loaded.');
  const world:WorldData=await response.json();if(generation!==mountGeneration||!host.isConnected)return;
  game=new Phaser.Game({type:Phaser.WEBGL,parent:host,width:host.clientWidth,height:host.clientHeight,backgroundColor:'#e0e8e1',pixelArt:true,roundPixels:true,scale:{mode:Phaser.Scale.RESIZE},scene:[new HallScene(world)],audio:{noAudio:true}});
 }catch(error){const el=document.getElementById('hall-loading');if(el)el.textContent=error instanceof Error?error.message:'Unable to start Phaser.';}
}
document.addEventListener('connecta:render',()=>{void mount();});
window.addEventListener('beforeunload',dispose);
void mount();
