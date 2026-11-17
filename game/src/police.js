// The wanted system: crimes add heat, heat becomes stars, stars bring police.
// Patrol cars spawn on nearby roads and ram the player; foot officers chase on
// foot when the player is walking. Hide long enough and the heat fades.

import { ROADS_X, ROADS_Y, WANTED } from './config.js';
import { makeCar } from './vehicles.js';

export function addHeat(G, amount, reason) {
  const before = stars(G);
  G.player.heat = Math.min(WANTED.max * 100, G.player.heat + amount);
  const after = stars(G);
  if (after > before) {
    G.message = { text: `WANTED LEVEL ${after} — ${reason}`, until: G.time + 3 };
  }
}

export function stars(G) {
  return Math.min(WANTED.max, Math.floor(G.player.heat / 100));
}

function spawnCopCar(G) {
  const rng = G.rng;
  // Spawn on a road a little away from the player, ideally off-screen.
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 12; tries += 1) {
    const rx = rng.pick(ROADS_X);
    const ry = rng.pick(ROADS_Y);
    x = rx + rng.range(-40, 40);
    y = ry + rng.range(-40, 40);
    if (Math.hypot(x - G.player.x, y - G.player.y) > 500) break;
  }
  const car = makeCar(rng, x, y, 0, 'cop', { npc: true, color: '#2f6fd0' });
  car.cruise = 300;
  car.kind = 'cop';
  G.copCars.push(car);
}

function spawnFootCop(G) {
  const rng = G.rng;
  const a = rng.range(0, Math.PI * 2);
  G.cops.push({
    x: G.player.x + Math.cos(a) * 320,
    y: G.player.y + Math.sin(a) * 320,
    angle: 0, hp: 60, punchCd: 0, speed: 150,
  });
}

export function stepPolice(G, dt) {
  const want = stars(G);
  G.player.wanted = want;

  // Wanted decay: only while no cop can see the player.
  let nearestCop = Infinity;
  for (const car of G.copCars) nearestCop = Math.min(nearestCop, Math.hypot(car.x - G.player.x, car.y - G.player.y));
  for (const cop of G.cops) nearestCop = Math.min(nearestCop, Math.hypot(cop.x - G.player.x, cop.y - G.player.y));
  if (want > 0 && nearestCop > 620) {
    G.player.hiddenTimer += dt;
    if (G.player.hiddenTimer > WANTED.decaySeconds) {
      G.player.hiddenTimer = 0;
      G.player.heat = Math.max(0, G.player.heat - 100);
      if (stars(G) === 0) G.message = { text: 'You lost the cops. Heat is off.', until: G.time + 3 };
    }
  } else {
    G.player.hiddenTimer = 0;
  }

  // Spawn patrol cars up to the wanted level's quota.
  const targetCars = Math.min(WANTED.maxCopCars, want * WANTED.copCarsPerStar);
  if (G.copCars.length < targetCars && G.spawnTimer <= 0) {
    spawnCopCar(G);
    G.spawnTimer = 1.2;
  }
  G.spawnTimer -= dt;
  // Foot officers join when the player is on foot and the heat is high.
  if (want >= 2 && G.player.onFoot && G.cops.length < want - 1 && G.spawnTimer <= 0) {
    spawnFootCop(G);
    G.spawnTimer = 1.5;
  }

  // Patrol cars chase: steer at the player, ram on contact.
  for (let i = G.copCars.length - 1; i >= 0; i -= 1) {
    const car = G.copCars[i];
    const dx = G.player.x - car.x;
    const dy = G.player.y - car.y;
    const dist = Math.hypot(dx, dy);
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-3.6 * dt, Math.min(3.6 * dt, diff));
    const targetSpeed = dist < 60 ? 120 : 300 + want * 22;
    car.speed += (targetSpeed - car.speed) * Math.min(1, 2 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!G.city.blocked(nx, ny, 16)) {
      car.x = nx;
      car.y = ny;
    } else {
      car.speed *= 0.5;
      car.angle += 0.6 * dt;
    }
    if (dist < 46) {
      if (G.playerCar) {
        G.playerCar.hp = Math.max(0, G.playerCar.hp - 26 * dt);
        G.playerCar.speed *= 0.97;
      } else if (G.player.invuln <= 0) {
        G.player.hp -= 18 * dt;
        G.player.invuln = 0.4;
      }
      if (G.rng.chance(0.1)) G.audio.crash();
    }
    // Give up and despawn far away once the heat is gone.
    if (want === 0 && dist > 1400) G.copCars.splice(i, 1);
  }

  // Foot officers: run at the player and swing when close.
  for (let i = G.cops.length - 1; i >= 0; i -= 1) {
    const cop = G.cops[i];
    const dx = G.player.x - cop.x;
    const dy = G.player.y - cop.y;
    const dist = Math.hypot(dx, dy);
    cop.angle = Math.atan2(dy, dx);
    if (dist > 26) {
      const step = cop.speed * dt;
      const nx = cop.x + Math.cos(cop.angle) * step;
      const ny = cop.y + Math.sin(cop.angle) * step;
      if (!G.city.blocked(nx, ny, 11)) {
        cop.x = nx;
        cop.y = ny;
      }
    } else {
      cop.punchCd -= dt;
      if (cop.punchCd <= 0 && G.player.invuln <= 0) {
        cop.punchCd = 0.9;
        G.player.hp -= 12;
        G.player.invuln = 0.35;
        G.audio.punch();
      }
    }
    if (want === 0 && dist > 1200) G.cops.splice(i, 1);
  }
}
