// The player on foot: walking and running, entering and leaving cars, and
// stealing the nearest car. Driving itself lives in vehicles.js.

import { PLAYER } from './config.js';
import { nearestCar } from './vehicles.js';
import { addHeat } from './police.js';
import { scarePeds } from './traffic.js';

export function stepPlayerOnFoot(G, input, dt) {
  const p = G.player;
  const held = input.held;
  let mx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  let my = (held.down ? 1 : 0) - (held.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    const speed = held.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    p.angle = Math.atan2(my, mx);
    const moved = G.city.moveCircle(p, mx * speed * dt, my * speed * dt, PLAYER.radius);
    p.moving = moved;
    if (moved && G.rng.chance(0.06)) {
      G.particles.push({
        x: p.x, y: p.y + 10, vx: G.rng.range(-8, 8), vy: G.rng.range(4, 16),
        life: 0.3, maxLife: 0.3, size: 3, color: '#b8a888', kind: 'dot',
      });
    }
  } else {
    p.moving = false;
  }
  if (p.invuln > 0) p.invuln -= dt;
}

/** Enter the nearest parked or traffic car (E), or steal the nearest one (F). */
export function tryEnterCar(G, steal) {
  const p = G.player;
  const car = nearestCar(G, p.x, p.y, 90);
  if (!car) {
    G.message = { text: 'No car close enough.', until: G.time + 1.5 };
    return;
  }
  const wasParked = G.parked.includes(car);
  const wasTraffic = G.traffic.includes(car);
  if (wasTraffic) {
    // A traffic car has a driver: taking it is grand theft auto.
    G.traffic.splice(G.traffic.indexOf(car), 1);
    addHeat(G, 55, 'grand theft auto');
    scarePeds(G, p.x, p.y, 260);
  }
  if (wasParked) G.parked.splice(G.parked.indexOf(car), 1);
  car.npc = false;
  G.playerCar = car;
  p.onFoot = false;
  p.x = car.x;
  p.y = car.y;
  G.audio.enterCar();
  G.message = { text: steal ? 'Car stolen — the cops noticed.' : 'You are driving.', until: G.time + 2 };
}

/** Step out of the car (E) and leave it parked where it stops. */
export function exitCar(G) {
  const p = G.player;
  const car = G.playerCar;
  if (!car) return;
  car.speed = 0;
  car.npc = false;
  // Step out to the side of the car.
  const side = p.angle + Math.PI / 2;
  p.x = car.x + Math.cos(side) * 34;
  p.y = car.y + Math.sin(side) * 34;
  if (G.city.blocked(p.x, p.y, PLAYER.radius)) {
    p.x = car.x - Math.cos(side) * 34;
    p.y = car.y - Math.sin(side) * 34;
  }
  G.parked.push(car);
  G.playerCar = null;
  p.onFoot = true;
  G.audio.enterCar();
}
