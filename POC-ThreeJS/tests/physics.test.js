import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Box3 } from 'three';
import { constrainRope, collide, crossedRing, findWall, moveOnWall } from '../src/physics.js';
test('taut rope keeps tangential momentum and cancels outward velocity',()=>{const p=new Vector3(12,0,0),v=new Vector3(4,8,0);constrainRope(p,v,new Vector3(),10);assert.equal(p.length(),10);assert.equal(v.x,0);assert.equal(v.y,8);});
test('slack rope does not pull or delete momentum',()=>{const p=new Vector3(4,0,0),v=new Vector3(-2,8,0);constrainRope(p,v,new Vector3(),10);assert.equal(p.x,4);assert.equal(v.x,-2);});
test('rooftop landing resolves penetration and preserves horizontal motion',()=>{const p=new Vector3(0,10.5,0),v=new Vector3(3,-20,0);assert.equal(collide(p,v,[new Box3(new Vector3(-5,0,-5),new Vector3(5,10,5))]),true);assert.equal(p.y,10.8);assert.equal(v.y,0);assert.equal(v.x,3);});
test('building side prevents passage',()=>{const p=new Vector3(5.3,5,0),v=new Vector3(-30,0,5);assert.equal(collide(p,v,[new Box3(new Vector3(-5,0,-5),new Vector3(5,10,5))]),false);assert.equal(p.x,5.8);assert.equal(v.x,0);});
test('fast segment collects ring without requiring a frame inside',()=>{assert.ok(crossedRing(new Vector3(0,0,10),new Vector3(0,0,-10),new Vector3()));assert.equal(crossedRing(new Vector3(20,0,10),new Vector3(20,0,-10),new Vector3()),false);});

const tower = new Box3(new Vector3(-5,0,-5),new Vector3(5,30,5));
test('wall detection finds all four outward normals, excludes roof and distant faces',()=>{
 for(const [p,n] of [[[5.8,10,0],[1,0,0]],[[-5.8,10,0],[-1,0,0]],[[0,10,5.8],[0,0,1]],[[0,10,-5.8],[0,0,-1]]])assert.deepEqual(findWall(new Vector3(...p),[tower]).normal.toArray(),n);
 assert.equal(findWall(new Vector3(0,30.8,0),[tower]),null);
 assert.equal(findWall(new Vector3(8,10,0),[tower]),null);
});
test('wall run gains height, holds stand-off, and can descend or strafe',()=>{
 const p=new Vector3(5.82,10,0),v=new Vector3(),contact=findWall(p,[tower]);
 assert.equal(moveOnWall(p,v,contact,1,0,.5),false);assert.equal(p.y,15.5);assert.equal(p.x,5.82);
 moveOnWall(p,v,contact,-1,1,.25);assert.equal(p.y,12.75);assert.equal(p.z,-1.75);
 moveOnWall(p,v,contact,0,0,.25);assert.equal(v.length(),0);
});
test('mantle ends above roof and inside its boundary on every face',()=>{
 for(const p of [new Vector3(5.82,30.5,0),new Vector3(-5.82,30.5,0),new Vector3(0,30.5,5.82),new Vector3(0,30.5,-5.82)]){
  const v=new Vector3(),contact=findWall(p,[tower]);assert.ok(moveOnWall(p,v,contact,1,0,1/120));assert.equal(p.y,30.81);assert.ok(Math.abs(p.x)<5&&Math.abs(p.z)<5);
 }
});
