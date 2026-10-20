const inRect=(p,r)=>p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;
function boothAt(position,world){return world.areas.find(a=>a.kind==='booth'&&inRect(position,a))?.id||null;}
function sourcesFor(member,presentations){
 const speaking=member.booth&&presentations.get(member.booth);
 const muted=member.dnd||(speaking&&speaking!==member.id&&!member.holdingMic);
 const sources=muted?[]:[2];
 if(member.role==='PRESENTER'&&member.booth===member.ownedBooth&&!member.dnd)sources.push(1,3,4);
 return sources;
}
function canHear(listener,speaker,presentations,wasNear=false){
 if(listener.dnd||speaker.dnd)return false;
 const presenting=speaker.booth&&presentations.get(speaker.booth);
 if(presenting)return listener.booth===speaker.booth&&(speaker.id===presenting||speaker.holdingMic);
 return Math.hypot(listener.x-speaker.x,listener.y-speaker.y)<=(wasNear?220:180);
}
module.exports={inRect,boothAt,sourcesFor,canHear};
