// Pedestrians: they stroll the sidewalks, cross at intersections, and run
// away from gunfire or a car bearing down on them. A hit pedestrian is a crime.

import { PEDS } from './config.js';

const SHIRTS = ['#e5534b', '#4fc3f7', '#f2c94c', '#9b59b6', '#58b368', '#e67e22', '#ecf0f1', '#1abc9c'];

export function spawnPeds(G) {
  const rng = G.rng;
  G.peds = [];
  for (let i = 0; i < PEDS.count; i += 1) addOnePed(G);
}

/** Add one fresh pedestrian at a random roadside spot. */
export function addOnePed(G) {
  const rng = G.rng;
  const spot = G.city.nearestRoadPoint(
    240 + rng.next() * 3200,
    240 + rng.next() * 2100,
  );
  G.peds.push({
    x: spot.x + rng.range(-60, 60),
    y: spot.y + rng.range(-60, 60),
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(PEDS.speedMin, PEDS.speedMax),
    shirt: rng.pick(SHIRTS),
    tx: 0, ty: 0,
    panic: 0,
    retarget: 0,
  });
}

function pickTarget(G, ped) {
  const spot = G.city.nearestRoadPoint(
    Math.max(220, Math.min(3400, ped.x + G.rng.range(-700, 700))),
    Math.max(220, Math.min(2400, ped.y + G.rng.range(-700, 700))),
  );
  ped.tx = spot.x + G.rng.range(-50, 50);
  ped.ty = spot.y + G.rng.range(-50, 50);
}

export function stepPeds(G, dt) {
  for (const ped of G.peds) {
    ped.retarget -= dt;
    if (ped.retarget <= 0 || Math.hypot(ped.tx - ped.x, ped.ty - ped.y) < 12) {
      pickTarget(G, ped);
      ped.retarget = 6 + G.rng.next() * 8;
    }
    // Panic: run away from the player when shots are fired or a car is close.
    let fx = 0;
    let fy = 0;
    if (ped.panic > 0) {
      ped.panic -= dt;
      const dx = ped.x - G.player.x;
      const dy = ped.y - G.player.y;
      const d = Math.hypot(dx, dy) || 1;
      fx = dx / d;
      fy = dy / d;
    }
    const dx = ped.tx - ped.x;
    const dy = ped.ty - ped.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = ped.panic > 0 ? ped.speed * 2.4 : ped.speed;
    const mx = (dx / d + fx * 1.4) * speed * dt;
    const my = (dy / d + fy * 1.4) * speed * dt;
    const nx = ped.x + mx;
    const ny = ped.y + my;
    if (!G.city.hitsBuilding(nx, ny, 10) && !G.city.inWater(nx, ny)) {
      ped.x = nx;
      ped.y = ny;
    } else {
      ped.retarget = 0;
    }
    ped.angle = Math.atan2(my, mx);
  }
}

/** Frighten every pedestrian near a point (gunshot, crash, stolen car). */
export function scarePeds(G, x, y, radius) {
  for (const ped of G.peds) {
    if (Math.hypot(ped.x - x, ped.y - y) < radius) ped.panic = 2.5;
  }
}
