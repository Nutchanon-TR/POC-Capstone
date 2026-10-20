(() => {
  'use strict';
  const {state,chars}=window.Connecta;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pressed=new Set();
  const route=[[35,34],[38,31],[62,31],[64,41],[70,50],[72,65],[64,74],[53,77],[42,74],[34,65],[33,49]];
  let actors=[],world=null,worldSize={width:1536,height:855},last=0,elapsed=0,autoTarget=null,resizeObserver=null,intersectionObserver=null;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const movementKey=key=>['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key);
  function blocked(x,y) {
    return x<4||x>92||y<28||y>82||(x>38.5&&x<57.5&&y>30&&y<63)||(x<29&&y<81);
  }
  function direction(dx,dy,current) { if(Math.abs(dx)+Math.abs(dy)<.005)return current;return Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy>0?0:1); }
  function refresh() {
    const existing=new Map(actors.map(a=>[a.el,a]));
    actors=[...document.querySelectorAll('.sprite-actor')].map((el,i)=>{
      if(existing.has(el))return existing.get(el);
      const x=parseFloat(el.style.left)||0,y=parseFloat(el.style.top)||0;
      const npc=el.hasAttribute('data-npc');
      let nearest=0;
      if(npc)route.forEach((p,j)=>{if(Math.hypot(p[0]-x,p[1]-y)<Math.hypot(route[nearest][0]-x,route[nearest][1]-y))nearest=j;});
      return {el,body:el.querySelector('.sprite-body'),character:chars[Number(el.dataset.character)],walking:el.dataset.walking==='true',direction:Number(el.dataset.direction),npc,player:el.hasAttribute('data-player'),ambient:el.hasAttribute('data-ambient'),baseX:x,baseY:y,x,y,phase:i*.58,path:nearest,pause:npc&&i%3===0?2+i*.15:0,speed:1.6+(i%4)*.23,lastImage:'',lastPosition:''};
    });
  }
  function init() {
    actors=[];world=document.querySelector('#hall-world');autoTarget=null;pressed.clear();
    resizeObserver?.disconnect();intersectionObserver?.disconnect();
    if(world){
      const measure=()=>{worldSize={width:world.clientWidth,height:world.clientHeight};};measure();
      resizeObserver=new ResizeObserver(measure);resizeObserver.observe(world);
    }
    refresh();
    intersectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');intersectionObserver.unobserve(entry.target);}}),{threshold:.07});
    document.querySelectorAll('.scroll-reveal').forEach(el=>intersectionObserver.observe(el));
  }
  function frame(now) {
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(document.hidden){requestAnimationFrame(frame);return;}
    const decorative=!state.paused&&!reduced.matches;
    if(decorative)elapsed+=dt;
    for(const a of actors){
      if(!a.el.isConnected)continue;
      let walking=a.walking;
      if(a.player){
        let dx=0,dy=0;
        if(!document.querySelector('dialog[open]')){
          dx=Number(pressed.has('d')||pressed.has('arrowright'))-Number(pressed.has('a')||pressed.has('arrowleft'));
          dy=Number(pressed.has('s')||pressed.has('arrowdown'))-Number(pressed.has('w')||pressed.has('arrowup'));
          if(autoTarget&&dx===0&&dy===0){dx=autoTarget[0]-a.x;dy=autoTarget[1]-a.y;if(Math.hypot(dx,dy)<.4){autoTarget=null;dx=0;dy=0;}}
        }
        walking=!!(dx||dy);
        if(walking){const len=Math.hypot(dx,dy),vx=dx/len*dt*9,vy=dy/len*dt*16;
          a.direction=direction(vx,vy,a.direction);
          if(!blocked(a.x+vx,a.y))a.x+=vx;
          if(!blocked(a.x,a.y+vy))a.y+=vy;
          if(autoTarget&&blocked(a.x+vx,a.y+vy))autoTarget=null;
        }
        position(a);
        const ring=document.getElementById('proximity-ring');
        if(ring)ring.style.transform=`translate3d(${(a.x-51)*worldSize.width/100}px,${(a.y-71)*worldSize.height/100}px,0) translate(-50%,-50%)`;
        const count=actors.filter(n=>n.npc&&Math.hypot((n.x-a.x)*1.796,n.y-a.y)<19).length;
        const counter=document.getElementById('nearby-count');
        if(counter&&counter.dataset.count!==String(count)){counter.innerHTML=`<span class="dot"></span>${count} ${count===1?'person':'people'} near you`;counter.dataset.count=String(count);}
      } else if(a.npc){
        walking=false;
        if(decorative){
          if(a.pause>0)a.pause-=dt;
          else{
            const target=route[a.path],dx=target[0]-a.x,dy=target[1]-a.y,dist=Math.hypot(dx,dy);
            if(dist<.25){a.path=(a.path+1)%route.length;a.pause=1.2+(Number(a.el.dataset.npc)%4)*.8;}
            else {walking=true;a.direction=direction(dx*1.796,dy,a.direction);a.x+=dx/dist*dt*a.speed;a.y+=dy/dist*dt*a.speed*1.15;}
          }
        }
        position(a);
      } else if(a.ambient){
        if(decorative){const wave=Math.sin(elapsed*.27+a.phase),dx=wave*22;a.el.style.transform=`translate3d(${dx}px,0,0)`;walking=Math.abs(Math.cos(elapsed*.27+a.phase))>.2;a.direction=Math.cos(elapsed*.27+a.phase)>0?3:2;}
      }
      const animate=(a.player&&walking)||decorative;
      const idle=!walking&&a.character.idle;
      const image=idle?a.character.idle:a.character.walk;
      const col=animate?(walking?Math.floor(elapsed*7+a.phase)%4:idle?Math.floor(elapsed*2+a.phase)%4:0):0;
      const row=a.direction;
      if(a.lastImage!==image){a.body.style.backgroundImage=`url('${image}')`;a.lastImage=image;}
      const pos=`${col*100/3}% ${row*100/3}%`;
      if(a.lastPosition!==pos){a.body.style.backgroundPosition=pos;a.lastPosition=pos;}
      a.el.classList.toggle('breathing',!walking&&!idle&&decorative);
      a.el.dataset.movement=walking?'walking':'idle';
      a.el.dataset.currentFrame=String(row*4+col);
    }
    requestAnimationFrame(frame);
  }
  function position(a){a.el.style.transform=`translate3d(${(a.x-a.baseX)*worldSize.width/100}px,${(a.y-a.baseY)*worldSize.height/100}px,0)`;a.el.style.zIndex=String(Math.round(a.y)+10);}
  document.addEventListener('keydown',e=>{
    if(!world||!movementKey(e.key.toLowerCase())||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,button,a,[contenteditable]'))return;
    e.preventDefault();pressed.add(e.key.toLowerCase());autoTarget=null;
  });
  document.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>pressed.clear());
  document.addEventListener('visibilitychange',()=>pressed.clear());
  document.addEventListener('connecta:render',init);
  document.addEventListener('connecta:refresh',refresh);
  reduced.addEventListener('change',()=>{if(reduced.matches)document.body.classList.add('motion-paused');else document.body.classList.toggle('motion-paused',state.paused);});
  window.ConnectaMotion={
    moveTo(x,y){const a=actors.find(a=>a.player);if(!a)return;a.x=clamp(x,5,91);a.y=clamp(y,5,81);position(a);},
    emote(text){const el=document.querySelector('[data-player]');if(!el)return;el.querySelector('.avatar-emote')?.remove();const emote=document.createElement('span');emote.className='avatar-emote';emote.textContent=text;el.append(emote);setTimeout(()=>emote.remove(),2500);},
    snapshot(){return actors.filter(a=>a.npc||a.player).map(a=>({id:a.el.dataset.npc??'player',character:a.el.dataset.character,x:a.x,y:a.y,mode:a.el.dataset.movement,frame:a.el.dataset.currentFrame}));}
  };
  init();requestAnimationFrame(frame);
})();
