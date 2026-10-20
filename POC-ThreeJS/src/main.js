import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { constrainRope, collide, crossedRing, findWall, moveOnWall } from './physics.js';
import { createSpiderMan } from './character.js';
import './style.css';

const $ = (id) => document.getElementById(id);
document.body.classList.add('menu-open');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#10132e');
scene.fog = new THREE.FogExp2('#161a3c', 0.0037);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1200);
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch { $('menu-copy').textContent = 'เปิด WebGL ไม่สำเร็จ ลองเปิด Hardware acceleration ในเบราว์เซอร์แล้วโหลดใหม่'; $('start').disabled = true; throw new Error('WebGL unavailable'); }
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
$('game').appendChild(renderer.domElement);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.48, 0.5, 0.85));
composer.addPass(new OutputPass());
scene.add(new THREE.HemisphereLight('#9dabff', '#212444', 2.5));
const moonlight = new THREE.DirectionalLight('#b7c8ff', 2.2);
moonlight.position.set(-70, 160, 70); scene.add(moonlight);
const pinkLight = new THREE.DirectionalLight('#fc488f', 1.2);
pinkLight.position.set(100, 50, -80); scene.add(pinkLight);

const cube = new THREE.BoxGeometry(1, 1, 1);
const cyan = new THREE.MeshBasicMaterial({ color: '#55ffe2', toneMapped: false });
const pink = new THREE.MeshBasicMaterial({ color: '#ff398f', toneMapped: false });
const blue = new THREE.MeshBasicMaterial({ color: '#6c8dff', toneMapped: false });
const dark = new THREE.MeshStandardMaterial({ color: '#151d33', roughness: 0.65, metalness: 0.45 });
function box(x, y, z, w, h, d, material, parent = scene) {
  const mesh = new THREE.Mesh(cube, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
}
let seed = 2047;
function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
const buildings = [], colliders = [], anchors = [];
function facadeTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#15213a'; ctx.fillRect(0, 0, 128, 256);
  for (let y = 5; y < 256; y += 12) for (let x = 5; x < 128; x += 13) {
    ctx.fillStyle = random() > 0.42 ? ['#548694', '#738bd1', '#b375aa', '#a7b9c1'][Math.floor(random() * 4)] : '#1b2942';
    ctx.globalAlpha = 0.3 + random() * 0.7; ctx.fillRect(x, y, 5, 6);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
const texture = facadeTexture();
const wall = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#8699d2', emissiveIntensity: 0.55, roughness: 0.6, metalness: 0.3 });
const mats = [wall, wall, dark, dark, wall, wall];
function building(x, z, w, d, h, accent = cyan) {
  const mesh = box(x, h / 2, z, w, h, d, mats);
  buildings.push(mesh); colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2,0,z-d/2),new THREE.Vector3(x+w/2,h,z+d/2)));
  box(x, h + 0.2, z, w + 0.5, 0.4, d + 0.5, dark);
  box(x, h+0.5, z-d/2, w, 0.22, 0.25, accent);
  box(x, h+0.5, z+d/2, w, 0.22, 0.25, accent);
  box(x-w/2, h+0.5, z, 0.25, 0.22, d, accent);
  box(x+w/2, h+0.5, z, 0.25, 0.22, d, accent);
  box(x-w/2-0.1,h/2,z+d/2,0.2,h,0.2,accent);
  if (h > 65) { box(x,h+5,z,0.3,10,0.3,dark); box(x,h+10,z,0.65,0.65,0.65,pink); }
  for (const dx of [-w/2, w/2]) for (const dz of [-d/2, d/2]) anchors.push(new THREE.Vector3(x+dx,h+0.8,z+dz));
  return mesh;
}
box(0,-0.5,-120,1200,1,1200,new THREE.MeshStandardMaterial({ color:'#0c1328',roughness:0.32,metalness:0.6 }));
for (let x=-6;x<=6;x++) for(let z=-8;z<=4;z++) {
  if(x===0) continue;
  const w=20+random()*13,d=22+random()*13,h=25+random()*115;
  building(x*51+(random()-0.5)*5,z*51,w,d,h,random()>0.55?pink:cyan);
}
// A clear central avenue gives the first route room to swing.
building(0,22,25,24,30,cyan);
for(let z=-450;z<240;z+=18) {
  box(-5,0.03,z,0.12,0.05,8,cyan); box(5,0.03,z,0.12,0.05,8,pink);
}
for(let z=-8;z<=4;z++) box(0,0.01,z*51+23,700,0.03,0.14,blue);

function sign(text,x,y,z,color,w=17,h=8) {
  const c=document.createElement('canvas'); c.width=512;c.height=256;
  const ctx=c.getContext('2d');ctx.fillStyle='#090f24';ctx.fillRect(0,0,512,256);
  ctx.strokeStyle=color;ctx.lineWidth=9;ctx.strokeRect(8,8,496,240);
  ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 74px sans-serif';ctx.fillText(text,256,133);
  ctx.font='20px sans-serif';ctx.fillText('N I G H T   N E T W O R K',256,199);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false}));
  mesh.position.set(x,y,z);scene.add(mesh);
}
sign('未来 FUTURE',51,55,17,'#57ffed',23,12);
sign('夜行 / 07',-51,44,-33,'#ff459f',23,13);
sign('NEON',50,75,-85,'#fb68d5',22,12);
sign('空 SKY',-102,96,-135,'#7c9cff',25,14);
sign('UPLINK',102,50,68,'#60ffde');
const moon = new THREE.Mesh(new THREE.SphereGeometry(20,32,24),new THREE.MeshBasicMaterial({color:'#dbb9d7'}));moon.position.set(160,200,-550);scene.add(moon);
const stars=new Float32Array(1200);
for(let i=0;i<stars.length;i+=3){stars[i]=(random()-.5)*1300;stars[i+1]=180+random()*300;stars[i+2]=(random()-.5)*1300;}
const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#b6c9ff',size:0.55,transparent:true,opacity:0.7})));
const traffic=[];
for(let i=0;i<22;i++){const car=box((i%2?1:-1)*8,1,-400+i*29,1.6,0.6,4,i%2?pink:cyan);traffic.push(car);}

const character = createSpiderMan();
const hero = character.root; scene.add(hero);
const handPosition = new THREE.Vector3();
const webGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
const web=new THREE.Line(webGeo,new THREE.LineBasicMaterial({color:'#bbfff4',toneMapped:false}));web.frustumCulled=false;web.visible=false;scene.add(web);
const marker=new THREE.Mesh(new THREE.IcosahedronGeometry(.55,0),cyan);marker.visible=false;scene.add(marker);

const route=[ [0,27,-15],[0,35,-62],[0,43,-110],[0,35,-163],[0,47,-215],[0,40,-266],[0,48,-318],[0,36,-370] ].map(p=>new THREE.Vector3(...p));
const rings=route.map((p,i)=>{const group=new THREE.Group();group.position.copy(p);const mat=new THREE.MeshBasicMaterial({color:i===0?'#58ffe0':'#647bb5',transparent:true,opacity:i===0?1:.48,toneMapped:false});const torus=new THREE.Mesh(new THREE.TorusGeometry(6,.14,8,64),mat);group.add(torus);const outer=new THREE.Mesh(new THREE.TorusGeometry(6.6,.04,4,64,Math.PI*1.4),mat);group.add(outer);scene.add(group);return group;});
$('progress').innerHTML=route.map(()=>'<i></i>').join('');
let position=new THREE.Vector3(0,31,22),velocity=new THREE.Vector3(),checkpoint=position.clone();
let yaw=0,pitch=-.08,playing=false,started=false,complete=false,grounded=false,anchor=null,ropeLength=0,target=null,elapsed=0,collected=0,noticeUntil=0;
let wallContact = null, wallCooldown = 0;
const keys=new Set(),raycaster=new THREE.Raycaster();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function forward(){return new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));}
function toast(text){$('notice').textContent=text;noticeUntil=performance.now()+3000;}
function release(){anchor=null;web.visible=false;}
function respawn(){position.copy(checkpoint);velocity.set(0,0,0);wallContact=null;wallCooldown=0;release();yaw=0;pitch=-.08;camera.position.copy(position).add(new THREE.Vector3(0,5,12));toast('กลับมาที่จุดล่าสุดแล้ว');}
function attach(){
 if(!playing||anchor)return;
 if(!target){toast('เล็งให้สูงขึ้นหรือหันเข้าหาตึกใกล้ ๆ');return;}
 anchor=target.clone();ropeLength=Math.max(7,position.distanceTo(anchor));
 if(wallContact){position.addScaledVector(wallContact.normal,.4);velocity.addScaledVector(wallContact.normal,7);wallContact=null;wallCooldown=.4;}
 // A small launch assist makes roof takeoffs and street recovery accessible.
 if(grounded||velocity.length()<8){velocity.addScaledVector(forward(),10);velocity.y=Math.max(velocity.y,13);}
 grounded=false;web.visible=true;
}
function pause(){if(!playing)return;playing=false;keys.clear();release();$('menu').classList.remove('hidden');document.body.classList.add('menu-open');$('menu-copy').textContent='พักบนเส้นขอบฟ้าสักครู่ แล้วกลับไปโหนต่อ';$('start').innerHTML='เล่นต่อ <span>↗</span>';if(document.pointerLockElement)document.exitPointerLock();}
function start(){
 if(complete){collected=0;elapsed=0;complete=false;checkpoint.set(0,31,22);respawn();rings.forEach(r=>r.visible=true);}
 started=true;playing=true;$('menu').classList.add('hidden');document.body.classList.remove('menu-open');
 // Embedded browsers may deny pointer lock; mouse position remains a fallback.
 try{const request=renderer.domElement.requestPointerLock();request?.catch(()=>toast('โหมดเมาส์อิสระ: ขยับเมาส์ไปขอบจอเพื่อหันกล้อง'));}catch{toast('ขยับเมาส์ไปขอบจอเพื่อหันกล้อง');}
}
$('start').addEventListener('click',start);$('pause').addEventListener('click',pause);
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){pause();return;}if(!playing)return;keys.add(e.code);if(e.code==='KeyR')respawn();if(e.code==='KeyE'&&!e.repeat)attach();if(e.code==='Space'&&!e.repeat){if(wallContact){velocity.copy(wallContact.normal).multiplyScalar(13);velocity.y=15;wallContact=null;wallCooldown=.55;grounded=false;}else if(grounded){velocity.y=15;grounded=false;}}});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyE')release();});
renderer.domElement.addEventListener('mousedown',e=>{if(e.button===0)attach();});
window.addEventListener('mouseup',e=>{if(e.button===0)release();});
let mouseX=0,mouseY=0;
window.addEventListener('mousemove',e=>{if(!playing)return;if(document.pointerLockElement){yaw-=e.movementX*.0025;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-.8,.7);}else{mouseX=e.clientX/innerWidth*2-1;mouseY=e.clientY/innerHeight*2-1;}});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&playing)pause();});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});

function findTarget(){
 const facing=forward();let best=null,bestScore=-Infinity;
 raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
 const hit=raycaster.intersectObjects(buildings,false)[0];
 if(hit&&position.distanceTo(hit.point)<115&&hit.point.y>position.y+4)best=hit.point.clone().addScaledVector(hit.face.normal,.35);
 if(best)return best;
 for(const candidate of anchors){const delta=candidate.clone().sub(position),dist=delta.length();if(dist<9||dist>110||delta.y<5)continue;const alignment=delta.clone().setY(0).normalize().dot(facing);if(alignment<.18)continue;const score=alignment*70-dist*.32-Math.abs(delta.y-24)*.25;if(score>bestScore){
  raycaster.set(position,delta.clone().normalize());raycaster.far=dist-.8;const blocked=raycaster.intersectObjects(buildings,false).length>0;raycaster.far=Infinity;
  if(!blocked){best=candidate;bestScore=score;}
 }}return best;
}
function finish(){complete=true;playing=false;release();keys.clear();$('menu').classList.remove('hidden');document.body.classList.add('menu-open');$('menu-copy').textContent=`ครบ 8 วงแหวน! ใช้เวลา ${elapsed.toFixed(1)} วินาที — พร้อมทำเวลาใหม่ไหม`; $('start').innerHTML='เล่นอีกครั้ง <span>↗</span>';if(document.pointerLockElement)document.exitPointerLock();}
function step(dt){
 const previous=position.clone();const f=forward(),right=new THREE.Vector3(-f.z,0,f.x),move=new THREE.Vector3();
 wallCooldown=Math.max(0,wallCooldown-dt);
 const climbing=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&!anchor&&wallCooldown===0;
 wallContact=climbing?findWall(position,colliders):null;
 if(wallContact){
  const toppedOut=moveOnWall(position,velocity,wallContact,Number(keys.has('KeyW'))-Number(keys.has('KeyS')),Number(keys.has('KeyD'))-Number(keys.has('KeyA')),dt);
  grounded=collide(position,velocity,colliders);
  if(toppedOut){wallContact=null;grounded=true;wallCooldown=.3;toast('ขึ้นถึงดาดฟ้าแล้ว · กระโดดแล้วโหนต่อได้เลย');}
  return;
 }
 if(keys.has('KeyW'))move.add(f);if(keys.has('KeyS'))move.sub(f);if(keys.has('KeyD'))move.add(right);if(keys.has('KeyA'))move.sub(right);
 if(move.lengthSq())move.normalize();velocity.addScaledVector(move,(grounded?36:anchor?26:15)*dt);
 velocity.y-=24*dt;
 const drag=Math.exp(-(grounded?5:0.12)*dt);velocity.x*=drag;velocity.z*=drag;
 if(anchor){ropeLength=Math.max(9,ropeLength-6*dt);velocity.addScaledVector(f,8*dt);}
 velocity.clampLength(0,62);position.addScaledVector(velocity,dt);
 if(anchor)constrainRope(position,velocity,anchor,ropeLength);
 const before=position.clone();grounded=collide(position,velocity,colliders);
 if(anchor&&before.distanceTo(position)>0.1)release();
 if(Math.abs(position.x)>340||position.z>260||position.z< -450){respawn();return;}
 if(collected<route.length&&crossedRing(previous,position,route[collected])){
  rings[collected].visible=false;checkpoint.copy(route[collected]);collected++;toast(`Signal ${collected} / 8 — checkpoint saved`);
  if(collected===route.length)finish();
 }
}
const clock=new THREE.Clock();let accumulator=0,visualTime=0,frames=0;
camera.position.set(36,51,75);camera.lookAt(0,38,-70);
function frame(){
 requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);visualTime+=dt;
 if(playing){
  elapsed+=dt;
  if(!document.pointerLockElement){if(Math.abs(mouseX)>.25)yaw-=mouseX*dt*1.3;if(Math.abs(mouseY)>.3)pitch=THREE.MathUtils.clamp(pitch-mouseY*dt*.55,-.8,.7);}
  accumulator+=dt;while(accumulator>=1/120&&playing){step(1/120);accumulator-=1/120;}
  const f=forward(),look=position.clone().add(new THREE.Vector3(0,1.5,0));
  const desired=look.clone().addScaledVector(wallContact?wallContact.normal:f,wallContact?8:-8).add(new THREE.Vector3(0,wallContact?3:3-pitch*9,0));
  const toCamera=desired.clone().sub(look);raycaster.set(look,toCamera.clone().normalize());raycaster.far=toCamera.length();const obstruction=raycaster.intersectObjects(buildings,false)[0];raycaster.far=Infinity;if(obstruction)desired.copy(look).addScaledVector(toCamera.normalize(),Math.max(1,obstruction.distance-.6));
  camera.position.lerp(desired,1-Math.exp(-8*dt));camera.lookAt(wallContact?look:look.addScaledVector(f,9).add(new THREE.Vector3(0,pitch*14,0)));
  camera.fov=THREE.MathUtils.lerp(camera.fov,65+(reduced?0:velocity.length()*.22),dt*3);camera.updateProjectionMatrix();
  if(frames%5===0)target=findTarget();
 }else if(!started&&!reduced){camera.position.x=36+Math.sin(visualTime*.1)*4;camera.lookAt(0,38,-70);}
 character.update({dt:playing?dt:started?0:dt,position,velocity,yaw,grounded,anchor,wallNormal:wallContact?.normal,reduced});
 if(anchor){character.webOrigin(handPosition);const a=webGeo.attributes.position;a.setXYZ(0,handPosition.x,handPosition.y,handPosition.z);a.setXYZ(1,anchor.x,anchor.y,anchor.z);a.needsUpdate=true;}
 marker.visible=playing&&!!target&&!anchor;if(marker.visible)marker.position.copy(target);
 for(let i=0;i<rings.length;i++){const r=rings[i];r.children[1].rotation.z=reduced?0:visualTime*.4;r.children[0].material.color.set(i===collected?'#58ffe0':'#647bb5');r.children[0].material.opacity=i===collected?1:.4;}
 if(!reduced)traffic.forEach((car,i)=>{car.position.z+=dt*(i%2?22:-18);if(car.position.z>240)car.position.z=-440;if(car.position.z< -440)car.position.z=240;});
 if(frames%5===0){document.body.classList.toggle('wall-running',!!wallContact);$('speed').textContent=Math.round(velocity.length()*3.6);$('speed-bar').style.width=`${Math.min(100,velocity.length()/62*100)}%`;$('altitude').textContent=Math.round(position.y);$('web-state').textContent=wallContact?'WALL RUN':anchor?'WEB ATTACHED':grounded?'ON ROOFTOP':'FREE FALL';$('reticle').classList.toggle('ready',!!target);$('target-hint').textContent=wallContact?'W/S ขึ้น–ลง · A/D ไต่ด้านข้าง · Space กระโดดออก':anchor?'ปล่อยเพื่อพุ่งต่อ · WASD เพิ่มแรงเหวี่ยง':target?'กดเมาส์หรือ E ค้างเพื่อโหน':'เล็งเข้าหาตึกเพื่อยิงใย';$('count').textContent=`${String(collected).padStart(2,'0')} / 08`;$('time').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${(elapsed%60).toFixed(1).padStart(4,'0')}`;Array.from($('progress').children).forEach((el,i)=>el.className=i<collected?'done':i===collected?'active':'');$('checkpoint').textContent=collected<8?`วงแหวนถัดไป ${Math.round(position.distanceTo(route[collected]))} m · R กลับจุดล่าสุด`:'เส้นทางสำเร็จ';}
 if(performance.now()>noticeUntil)$('notice').textContent='';
 composer.render();frames++;
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
// Read-only diagnostics for browser smoke tests.
window.__game={snapshot:()=>({playing,position:position.toArray(),speed:velocity.length(),attached:!!anchor,target:target?.toArray(),collected,elapsed,grounded,climbing:!!wallContact,wallNormal:wallContact?.normal.toArray(),animation:character.snapshot(),buildings:buildings.length})};
frame();
