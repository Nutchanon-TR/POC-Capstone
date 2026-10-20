import * as THREE from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';

// A lightweight articulated character: shared geometry, procedural suit artwork,
// and blended joint poses. Local forward is -Z; the origin is at the hips.
export function createSpiderMan() {
  const root = new THREE.Group();
  root.name = 'Spider-Man';
  const body = new THREE.Group(); root.add(body);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#cf193b'; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#401525'; ctx.lineWidth = 3;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  for (let y = -32; y < 544; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x < 512; x += 64) ctx.quadraticCurveTo(x + 32, y + 24, x + 64, y);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const red = new THREE.MeshStandardMaterial({ map: texture, roughness: .72 });
  const blue = new THREE.MeshStandardMaterial({ color: '#1258ba', roughness: .68 });
  const black = new THREE.MeshStandardMaterial({ color: '#080d1c', roughness: .65 });
  const emblemRed = new THREE.MeshStandardMaterial({ color: '#ff304a', emissive: '#a81228', emissiveIntensity: .3 });
  const white = new THREE.MeshStandardMaterial({ color: '#f5faff', emissive: '#bfdfff', emissiveIntensity: .35, roughness: .3 });
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  function ellipsoid(parent, name, material, x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(sphere, material); mesh.name = name;
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
  }
  function segment(parent, name, material, length, top, bottom) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, length, 12), material);
    mesh.name = name; mesh.position.y = -length / 2; parent.add(mesh);
    ellipsoid(parent, `${name}-joint`, material, 0, 0, 0, top, top, top);
  }
  ellipsoid(body, 'blue-ribcage', blue, 0, .37, 0, .43, .58, .25);
  ellipsoid(body, 'webbed-chest', red, 0, .58, -.035, .47, .35, .265);
  ellipsoid(body, 'red-abdomen', red, 0, .12, -.065, .26, .38, .22);
  ellipsoid(body, 'pelvis', blue, 0, -.21, 0, .32, .24, .23);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(.31, .32, .13, 20), red);
  belt.scale.z = .77; belt.position.y = -.1; body.add(belt);
  ellipsoid(body, 'neck', red, 0, .98, 0, .14, .2, .14);
  const head = new THREE.Group(); head.position.y = 1.22; body.add(head);
  ellipsoid(head, 'webbed-mask', red, 0, 0, 0, .285, .365, .265);
  // Curved angular lenses sit on the front of the mask, with thick black rims.
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0, .075); shape.quadraticCurveTo(.10, .08, .24, .19);
    shape.quadraticCurveTo(.235, -.12, .085, -.11); shape.quadraticCurveTo(.02, -.08, 0, .075);
    function curvedLens(scale, offset) {
      const geometry = new TessellateModifier(.025, 6).modify(new THREE.ShapeGeometry(shape, 16));
      const positions = geometry.attributes.position;
      for (let i=0; i<positions.count; i++) {
        const x = side*(.022+.12+(positions.getX(i)-.12)*scale);
        const y = .02+positions.getY(i)*scale;
        const z = -.265*Math.sqrt(Math.max(.015,1-(x/.285)**2-(y/.365)**2))-offset;
        positions.setXYZ(i,x,y,z);
      }
      geometry.computeVertexNormals(); return geometry;
    }
    head.add(new THREE.Mesh(curvedLens(1,.009),black));
    head.add(new THREE.Mesh(curvedLens(.77,.016),white));
    // Mirrored lenses have opposite winding.
    black.side = THREE.DoubleSide; white.side = THREE.DoubleSide;
  }
  function spider(z, material, scale) {
    const group = new THREE.Group(); group.position.set(0, .47, z); group.scale.setScalar(scale); body.add(group);
    ellipsoid(group, 'spider-body', material, 0, 0, 0, .065, .15, .025);
    ellipsoid(group, 'spider-head', material, 0, .13, 0, .05, .055, .025);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const points = [new THREE.Vector3(side * .025, .07-i*.045, 0), new THREE.Vector3(side * (.14+i*.022), .15-i*.08, 0), new THREE.Vector3(side * (.2+i*.016), .28-i*.18, 0)];
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 8, .016, 5, false), material));
    }
  }
  spider(-.304, black, .9); spider(.257, emblemRed, 1.2);
  const arms = [], legs = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(side * .47, .75, 0); body.add(shoulder);
    segment(shoulder, 'upper-arm', red, .43, .145, .115);
    const elbow = new THREE.Group(); elbow.position.y = -.43; shoulder.add(elbow);
    segment(elbow, 'webbed-forearm', red, .43, .115, .083);
    const hand = new THREE.Group(); hand.position.y = -.46; elbow.add(hand);
    ellipsoid(hand, 'glove', red, 0, -.04, -.015, .095, .14, .075);
    for (let digit = 0; digit < 4; digit++) ellipsoid(hand, 'finger', red, (digit-1.5)*.036, -.17, -.014, .021, .065, .025);
    ellipsoid(hand, 'thumb', red, side*.09, -.04, -.01, .035, .075, .04);
    arms.push({ shoulder, elbow, hand });
    const hip = new THREE.Group(); hip.position.set(side*.19, -.3, 0); body.add(hip);
    segment(hip, 'thigh', blue, .61, .18, .13);
    const knee = new THREE.Group(); knee.position.y = -.61; hip.add(knee);
    segment(knee, 'webbed-boot', red, .6, .135, .085);
    const foot = ellipsoid(knee, 'boot-foot', red, 0, -.61, -.10, .11, .11, .23);
    legs.push({ hip, knee, foot });
  }
  let phase = 0, animationTime = 0, state = 'idle';
  const desiredRotation = new THREE.Quaternion();
  const down = new THREE.Vector3(0, -1, 0);
  function rotate(joint, x, y, z, blend) {
    joint.rotation.x = THREE.MathUtils.lerp(joint.rotation.x, x, blend);
    joint.rotation.y = THREE.MathUtils.lerp(joint.rotation.y, y, blend);
    joint.rotation.z = THREE.MathUtils.lerp(joint.rotation.z, z, blend);
  }
  function update({ dt, position, velocity, yaw, grounded, anchor, wallNormal, reduced = false }) {
    const speed = new THREE.Vector2(velocity.x, velocity.z).length();
    animationTime += dt;
    state = wallNormal ? 'wall-run' : anchor ? 'swing' : grounded ? (speed > .5 ? 'run' : 'idle') : velocity.y > 1 ? 'jump' : 'fall';
    phase += dt * (state === 'wall-run' ? Math.max(2, Math.abs(velocity.y)*.85) : Math.max(2, speed*1.65));
    const blend = 1 - Math.exp(-15*dt);
    root.position.copy(position).add(new THREE.Vector3(0, .83, 0));
    let facing = yaw;
    if (grounded && speed > .5) facing = Math.atan2(-velocity.x, -velocity.z);
    if (wallNormal) facing = Math.atan2(wallNormal.x, wallNormal.z);
    desiredRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), facing);
    root.quaternion.slerp(desiredRotation, blend);
    const stride = reduced ? 0 : Math.sin(phase);
    body.position.y = state === 'run' && !reduced ? Math.abs(Math.cos(phase))*.065 : 0;
    rotate(body, state === 'wall-run' ? -.16 : state === 'swing' ? -.28 : state === 'run' ? -.13 : 0, 0, state === 'swing' ? THREE.MathUtils.clamp(velocity.x*.006,-.18,.18) : 0, blend);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1, cycle = stride * side;
      let armX = 0, armZ = side*.08, elbowX = -.12, hipX = 0, hipZ = 0, kneeX = .05;
      if (state === 'run') { armX = -cycle*.85; elbowX = -.8; hipX = cycle*.85; kneeX = .18+Math.max(0,-cycle)*1.2; }
      if (state === 'wall-run') { armX = -1.8+cycle*.6; armZ = side*.3; elbowX = -.5; hipX = -.65-cycle*.6; hipZ = side*.15; kneeX = .85+Math.max(0,cycle)*.8; }
      if (state === 'swing') { const sway=reduced?0:Math.sin(animationTime*3.5)*.16; armX = -2.6; armZ = side*.2; elbowX = i===1?0:-.2; hipX = (i === 0 ? -.75 : .25)+sway*side; kneeX = (i === 0 ? 1.4 : .65)+sway+THREE.MathUtils.clamp(velocity.y*.012,-.15,.15); }
      if (state === 'jump') { armX = -.65; armZ = side*.4; elbowX = -.65; hipX = i === 0 ? -.9 : .25; kneeX = 1; }
      if (state === 'fall') { armX = -.15; armZ = side*1; elbowX = -.45; hipX = i === 0 ? -.35 : .25; hipZ = side*.14; kneeX = .45; }
      if(!anchor || i!==1) rotate(arms[i].shoulder, armX, 0, armZ, blend);
      rotate(arms[i].elbow, elbowX, 0, 0, blend);
      rotate(legs[i].hip, hipX, 0, hipZ, blend); rotate(legs[i].knee, kneeX, 0, 0, blend);
    }
    if (anchor) {
      // Aim the shooting shoulder at the real anchor; the rope starts at this hand.
      root.updateMatrixWorld(true);
      const localAnchor = body.worldToLocal(anchor.clone()).sub(arms[1].shoulder.position).normalize();
      desiredRotation.setFromUnitVectors(down, localAnchor);
      arms[1].shoulder.quaternion.slerp(desiredRotation, blend);
      arms[1].elbow.rotation.x *= 1-blend;
    }
    root.updateMatrixWorld(true);
  }
  return { root, update, webOrigin: (target) => arms[1].hand.getWorldPosition(target), snapshot: () => ({ state, phase, leftKnee: legs[0].knee.rotation.x, rightKnee: legs[1].knee.rotation.x }) };
}
