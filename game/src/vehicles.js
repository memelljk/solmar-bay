// Cars: the player's arcade driving physics and the city's traffic.
// A traffic car drives from one road intersection to the next, so it always
// stays on the roads and turns naturally; it brakes for the car ahead of it.

import { CAR, ROADS_X, ROADS_Y, TRAFFIC } from './config.js';

const CAR_COLORS = ['#c0392b', '#2980b9', '#7f8c8d', '#e67e22', '#8e44ad', '#16a085', '#d4d4d4', '#2c3e50', '#b03a5b', '#3a7d44'];
const KINDS = ['sedan', 'sedan', 'sedan', 'taxi', 'truck', 'sport'];

export function makeCar(rng, x, y, angle, kind, opts = {}) {
  return {
    x, y, angle, speed: 0,
    kind: kind || rng.pick(KINDS),
    color: opts.color || rng.pick(CAR_COLORS),
    npc: opts.npc !== false,
    hp: CAR.hp,
    cruise: rng ? rng.range(TRAFFIC.speedMin, TRAFFIC.speedMax) : 170,
    target: null,
    stopped: false,
    honk: 0,
    skid: 0,
  };
}

/** Pick a neighbouring intersection of (rx, ry) along the road grid. */
function nextIntersection(rng, rx, ry) {
  const ix = ROADS_X.indexOf(rx);
  const iy = ROADS_Y.indexOf(ry);
  const options = [];
  if (ix > 0) options.push({ x: ROADS_X[ix - 1], y: ry });
  if (ix < ROADS_X.length - 1) options.push({ x: ROADS_X[ix + 1], y: ry });
  if (iy > 0) options.push({ x: rx, y: ROADS_Y[iy - 1] });
  if (iy < ROADS_Y.length - 1) options.push({ x: rx, y: ROADS_Y[iy + 1] });
  return rng.pick(options);
}

export function spawnTraffic(G) {
  const rng = G.rng;
  G.traffic = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const rx = rng.pick(ROADS_X);
    const ry = rng.pick(ROADS_Y);
    const car = makeCar(rng, rx, ry, rng.range(0, Math.PI * 2), null, { npc: true });
    car.target = nextIntersection(rng, rx, ry);
    G.traffic.push(car);
  }
}

/** Is another car close ahead of `car` in its heading? */
export function carAhead(G, car, dist) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  let best = Infinity;
  const all = G.traffic;
  for (let i = 0; i < all.length; i += 1) {
    const other = all[i];
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * fx + dy * fy;
    const side = Math.abs(-dx * fy + dy * fx);
    if (along > 0 && along < dist && side < 30) best = Math.min(best, along);
  }
  if (G.playerCar) {
    const dx = G.playerCar.x - car.x;
    const dy = G.playerCar.y - car.y;
    const along = dx * fx + dy * fy;
    const side = Math.abs(-dx * fy + dy * fx);
    if (along > 0 && along < dist && side < 30) best = Math.min(best, along);
  }
  return best;
}

function stepTrafficCar(G, car, dt) {
  const rng = G.rng;
  const target = car.target;
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 14) {
    car.target = nextIntersection(rng, target.x, target.y);
    return;
  }
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
  const ahead = carAhead(G, car, 110);
  const wantSpeed = ahead < 110 ? Math.max(0, (ahead - 46) * 2.2) : car.cruise;
  car.speed += (wantSpeed - car.speed) * Math.min(1, 2.4 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

export function stepTraffic(G, dt) {
  for (const car of G.traffic) stepTrafficCar(G, car, dt);
}

/**
 * The player's car. Returns an event string ('crash' | 'hard-crash' | null).
 * Steering tightens with speed; the handbrake loosens the grip for drifts.
 */
export function stepPlayerCar(G, car, input, dt) {
  const held = input.held;
  const forward = Math.cos(car.angle);
  const right = Math.sin(car.angle);
  const speedAlong = car.speed;
  let event = null;

  if (held.up) car.speed += CAR.accel * dt;
  if (held.down) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverseAccel) * dt;
  if (!held.up && !held.down) car.speed -= car.speed * 0.7 * dt;
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));

  const steerInput = (held.left ? -1 : 0) + (held.right ? 1 : 0);
  const steerAmount = steerInput * CAR.steer * dt * Math.min(1, Math.abs(car.speed) / 120 + 0.25);
  car.angle += (car.speed >= 0 ? steerAmount : -steerAmount) * Math.sign(car.speed || 1);

  const grip = held.brake ? CAR.handbrakeGrip : CAR.grip;
  const vx = forward * speedAlong;
  const vy = right * speedAlong;
  void vx; void vy;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const moved = G.city.moveCircle(car, nx - car.x, ny - car.y, 16);
  if (!moved && Math.abs(car.speed) > 60) {
    event = Math.abs(car.speed) > 260 ? 'hard-crash' : 'crash';
    car.speed *= -0.25;
    car.hp = Math.max(0, car.hp - Math.min(30, Math.abs(car.speed) / 18));
  }
  if (held.brake && Math.abs(car.speed) > 120) {
    car.skid += dt;
    if (car.skid > 0.05) {
      car.skid = 0;
      G.skids.push({ x: car.x - Math.cos(car.angle) * 16, y: car.y - Math.sin(car.angle) * 16, angle: car.angle, life: 1.6 });
    }
  }
  // Dust when accelerating hard on the road.
  if (held.up && Math.abs(car.speed) > 200 && G.rng.chance(0.25)) {
    G.particles.push({
      x: car.x - Math.cos(car.angle) * 22, y: car.y - Math.sin(car.angle) * 22,
      vx: -Math.cos(car.angle) * 40 + G.rng.range(-20, 20), vy: -Math.sin(car.angle) * 40 + G.rng.range(-20, 20),
      life: 0.5, maxLife: 0.5, size: 5 + G.rng.next() * 5, color: '#8a8a8a', kind: 'smoke',
    });
  }
  return event;
}

/** Find the nearest car (traffic or parked) within `dist` of a point. */
export function nearestCar(G, x, y, dist) {
  let best = null;
  let bestD = dist;
  const consider = (car) => {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  };
  for (const car of G.traffic) consider(car);
  for (const car of G.parked) consider(car);
  if (G.playerCar) consider(G.playerCar);
  return best;
}
