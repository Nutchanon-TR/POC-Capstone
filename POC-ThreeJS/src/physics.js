import { Vector3 } from 'three';

export function constrainRope(position, velocity, anchor, length) {
  const radial = position.clone().sub(anchor);
  const distance = radial.length();
  if (distance <= length || distance === 0) return;
  radial.divideScalar(distance);
  position.copy(anchor).addScaledVector(radial, length);
  const outward = velocity.dot(radial);
  if (outward > 0) velocity.addScaledVector(radial, -outward);
}

// Small fixed steps keep fast swings from tunnelling through building walls.
export function collide(position, velocity, boxes, radius = 0.8) {
  let grounded = false;
  for (const box of boxes) {
    const min = box.min.clone().addScalar(-radius);
    const max = box.max.clone().addScalar(radius);
    if (position.x <= min.x || position.x >= max.x || position.y <= min.y || position.y >= max.y || position.z <= min.z || position.z >= max.z) continue;
    const faces = [
      [position.x - min.x, 'x', min.x, -1], [max.x - position.x, 'x', max.x, 1],
      [position.y - min.y, 'y', min.y, -1], [max.y - position.y, 'y', max.y, 1],
      [position.z - min.z, 'z', min.z, -1], [max.z - position.z, 'z', max.z, 1],
    ].sort((a, b) => a[0] - b[0]);
    const [, axis, value, normal] = faces[0];
    position[axis] = value;
    if (velocity[axis] * normal < 0) velocity[axis] = 0;
    if (axis === 'y' && normal === 1) grounded = true;
  }
  if (position.y < radius) { position.y = radius; velocity.y = Math.max(0, velocity.y); grounded = true; }
  return grounded;
}

export function crossedRing(previous, current, center, radius = 7) {
  const delta = current.clone().sub(previous);
  const t = Math.max(0, Math.min(1, center.clone().sub(previous).dot(delta) / (delta.lengthSq() || 1)));
  return new Vector3().copy(previous).addScaledVector(delta, t).distanceTo(center) < radius;
}

// Only vertical faces count: rooftops cannot accidentally start wall running.
export function findWall(position, boxes, reach = 1.25) {
  let nearest = null;
  for (const box of boxes) {
    if (position.y < box.min.y || position.y > box.max.y + .65) continue;
    const faces = [
      ['x', box.min.x, -1, 'z'], ['x', box.max.x, 1, 'z'],
      ['z', box.min.z, -1, 'x'], ['z', box.max.z, 1, 'x'],
    ];
    for (const [axis, surface, sign, tangent] of faces) {
      const distance = (position[axis]-surface)*sign;
      if (distance < .45 || distance > reach || position[tangent] < box.min[tangent] || position[tangent] > box.max[tangent]) continue;
      if (!nearest || distance < nearest.distance) {
        const normal = new Vector3(); normal[axis] = sign;
        nearest = { box, normal, axis, surface, sign, distance };
      }
    }
  }
  return nearest;
}

export function moveOnWall(position, velocity, contact, vertical, sideways, dt) {
  const tangent = new Vector3(0, 1, 0).cross(contact.normal);
  velocity.copy(tangent).multiplyScalar(sideways*7); velocity.y = vertical*11;
  position.addScaledVector(velocity, dt);
  position[contact.axis] = contact.surface + contact.sign*.82;
  // Pull onto the roof once the player's collision center clears the edge.
  if (vertical > 0 && position.y >= contact.box.max.y+.55) {
    position.y = contact.box.max.y+.81;
    position.addScaledVector(contact.normal, -1.85);
    velocity.copy(contact.normal).multiplyScalar(-4);
    return true;
  }
  return false;
}
