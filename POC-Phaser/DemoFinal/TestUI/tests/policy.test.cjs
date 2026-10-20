const test=require('node:test');
const assert=require('node:assert/strict');
const {sourcesFor,canHear,boothAt}=require('../server/policy.cjs');
const world=require('../assets/maps/exhibition/runtime.json');
const member=(id,extra={})=>({id,role:'VISITOR',booth:'booth-02',ownedBooth:null,x:960,y:274,dnd:false,holdingMic:false,...extra});
test('The imported map retains 5 booth slots, original spawn, and collision footprints',()=>{
 assert.equal(world.areas.filter(a=>a.kind==='booth').length,5);assert.deepEqual(world.spawn,{x:160,y:736});assert.equal(world.sprites.length,204);assert.equal(world.collisions.length,45);assert.equal(boothAt({x:960,y:274},world),'booth-02');
});
test('Visitor tokens only allow a microphone',()=>assert.deepEqual(sourcesFor(member('v'),new Map()),[2]));
test('Presenter camera and screen grants are scoped to their assigned booth',()=>{
 const p=member('p',{role:'PRESENTER',ownedBooth:'booth-02'});assert.deepEqual(sourcesFor(p,new Map()),[2,1,3,4]);assert.deepEqual(sourcesFor({...p,booth:'booth-01'},new Map()),[2]);
});
test('Presentation disables audience publishing until explicit mic acceptance',()=>{
 const presenting=new Map([['booth-02','p']]);assert.deepEqual(sourcesFor(member('v'),presenting),[]);assert.deepEqual(sourcesFor(member('v',{holdingMic:true}),presenting),[2]);
});
test('Do not disturb disables publishing and both directions of listening',()=>{
 const dnd=member('v',{dnd:true}),p=member('p');assert.deepEqual(sourcesFor(dnd,new Map()),[]);assert.equal(canHear(dnd,p,new Map()),false);assert.equal(canHear(p,dnd,new Map()),false);
});
test('Proximity uses a wider exit radius and isolates active booth presentations',()=>{
 const l=member('l'),s=member('s',{x:1160});assert.equal(canHear(l,s,new Map()),false);assert.equal(canHear(l,s,new Map(),true),true);const presenting=new Map([['booth-02','s']]);assert.equal(canHear(l,s,presenting),true);assert.equal(canHear({...l,booth:'booth-01'},s,presenting),false);
});
test('Every map image resolves inside the imported map folder',()=>{
 const fs=require('node:fs'),path=require('node:path');for(const tile of world.tiles)assert.ok(fs.existsSync(path.resolve(__dirname,'..',tile.image)),tile.image);
});
