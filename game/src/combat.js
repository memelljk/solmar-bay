// Combat: fists up close, a pistol with a mouse aim, bullets, and the armed
// enemies the dock mission throws at the player. Enemies chase and shoot back.

import { BULLET, PLAYER } from './config.js';
import { spawnBurst } from './particles.js';
import { scarePeds } from './traffic.js';
import { addHeat } from './police.js';

export function fireBullet(G, x, y, angle, fromPlayer) {
  G.bullets.push({
    x: x + Math.cos(angle) * 22,
    y: y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * BULLET.speed,
    vy: Math.sin(angle) * BULLET.speed,
    life: BULLET.life,
    fromPlayer,
  });
  spawnBurst(G, x + Math.cos(angle) * 26, y + Math.sin(angle) * 26, '#f2c94c', 4, 160, 0.18, 3);
}

export function punch(G) {
  const p = G.player;
  if (p.punchCd > 0) return;
  p.punchCd = PLAYER.punchCooldown;
  p.punchAnim = 0.18;
  G.audio.punch();
  const range = PLAYER.punchRange + 14;
  // Hit the nearest enemy or cop inside the swing arc.
  const tryHit = (target, hp) => {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range) return false;
    let diff = Math.atan2(dy, dx) - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > PLAYER.punchArc) return false;
    target.hp -= PLAYER.punchDamage;
    spawnBurst(G, target.x, target.y, '#ffffff', 6, 200, 0.3, 3);
    return true;
  };
  for (const enemy of G.enemies) {
    if (enemy.hp > 0 && tryHit(enemy, enemy.hp)) {
      if (enemy.hp <= 0) onEnemyDown(G, enemy);
      return;
    }
  }
  for (const cop of G.cops) {
    if (tryHit(cop, cop.hp)) {
      addHeat(G, 30, 'assaulting an officer');
      return;
    }
  }
  // Punching a pedestrian is a crime too.
  for (const ped of G.peds) {
    if (tryHit(ped, 100)) {
      addHeat(G, 45, 'assault');
      scarePeds(G, p.x, p.y, 300);
      return;
    }
  }
}

export function onEnemyDown(G, enemy) {
  G.mission.kills += 1;
  spawnBurst(G, enemy.x, enemy.y, '#e5534b', 14, 240, 0.5, 4);
  G.audio.crash();
}

export function stepCombat(G, dt) {
  const p = G.player;
  if (p.punchCd > 0) p.punchCd -= dt;
  if (p.punchAnim > 0) p.punchAnim -= dt;
  if (p.shootCd > 0) p.shootCd -= dt;

  // Bullets fly, hit buildings, cars, enemies, cops and peds.
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.life <= 0 || G.city.blocked(b.x, b.y, 1);
    if (!dead) {
      const targets = b.fromPlayer
        ? [...G.enemies, ...G.cops]
        : [G.player];
      for (const t of targets) {
        if (t.hp <= 0) continue;
        if (Math.hypot(t.x - b.x, t.y - b.y) < 16) {
          t.hp -= BULLET.damage;
          spawnBurst(G, b.x, b.y, '#e5534b', 8, 220, 0.35, 3);
          if (t === G.player) {
            G.player.invuln = 0.3;
          } else if (G.enemies.includes(t) && t.hp <= 0) {
            onEnemyDown(G, t);
          } else if (G.cops.includes(t)) {
            addHeat(G, 40, 'shooting at police');
          }
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.fromPlayer) {
      for (const ped of G.peds) {
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
          addHeat(G, 90, 'shooting a bystander');
          scarePeds(G, b.x, b.y, 400);
          spawnBurst(G, b.x, b.y, '#e5534b', 8, 220, 0.35, 3);
          dead = true;
          break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }

  // Enemies: chase the player, shoot when in range.
  for (let i = G.enemies.length - 1; i >= 0; i -= 1) {
    const e = G.enemies[i];
    if (e.hp <= 0) {
      G.enemies.splice(i, 1);
      continue;
    }
    const dx = G.player.x - e.x;
    const dy = G.player.y - e.y;
    const dist = Math.hypot(dx, dy);
    e.angle = Math.atan2(dy, dx);
    e.shootCd -= dt;
    if (dist > 130) {
      const step = e.speed * dt;
      const nx = e.x + Math.cos(e.angle) * step;
      const ny = e.y + Math.sin(e.angle) * step;
      if (!G.city.blocked(nx, ny, 11)) {
        e.x = nx;
        e.y = ny;
      }
    } else if (e.shootCd <= 0) {
      e.shootCd = 1.1 + G.rng.next() * 0.6;
      fireBullet(G, e.x, e.y, e.angle + G.rng.range(-0.12, 0.12), false);
      G.audio.shot();
    }
  }
}
