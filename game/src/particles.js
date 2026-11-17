// Particles and skid marks: dust, smoke, sparks, blood-free impact puffs and
// muzzle flashes. Purely visual, drawn under the entities that made them.

export function spawnBurst(G, x, y, color, count, speed, life, size) {
  for (let i = 0; i < count; i += 1) {
    const a = G.rng.range(0, Math.PI * 2);
    const s = G.rng.range(speed * 0.3, speed);
    G.particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * G.rng.range(0.6, 1), maxLife: life,
      size: size * G.rng.range(0.6, 1.4), color, kind: 'dot',
    });
  }
}

export function spawnSmoke(G, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    G.particles.push({
      x: x + G.rng.range(-8, 8), y: y + G.rng.range(-8, 8),
      vx: G.rng.range(-14, 14), vy: G.rng.range(-34, -8),
      life: 0.9, maxLife: 0.9, size: 7 + G.rng.next() * 8, color: '#777777', kind: 'smoke',
    });
  }
}

export function stepParticles(G, dt) {
  for (let i = G.particles.length - 1; i >= 0; i -= 1) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      G.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
  }
  for (let i = G.skids.length - 1; i >= 0; i -= 1) {
    G.skids[i].life -= dt;
    if (G.skids[i].life <= 0) G.skids.splice(i, 1);
  }
}
