// Drawing only: the city, the entities and the effects, painted through a
// camera that follows the player. The view is a fixed 1280x720 logical area
// scaled to the window; the game clock tints the light from morning gold to
// a warm sunset as the day goes on.

import { BEACH, FONT, PALETTE, PARK, ROADS_X, ROADS_Y, ROAD_W, WATER, WORLD } from './config.js';
import { MISSIONS } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WON = 'won';

const VIEW_W = 1280;
const VIEW_H = 720;

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW_W, height / VIEW_H);
    view.x = (width - VIEW_W * view.scale) / 2;
    view.y = (height - VIEW_H * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    const key = `${size}|${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function circle(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  function drawGround(G, cam) {
    const { x0, y0, x1, y1 } = cam;
    // Grass base.
    context.fillStyle = PALETTE.grass;
    context.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Subtle mowing stripes.
    context.fillStyle = PALETTE.grassDark;
    const stripe = 120;
    const startStripe = Math.floor(y0 / stripe) * stripe;
    for (let y = startStripe; y < y1; y += stripe * 2) {
      context.fillRect(x0, y, x1 - x0, stripe);
    }
    // Beach.
    context.fillStyle = PALETTE.sand;
    context.fillRect(Math.max(x0, BEACH.x), Math.max(y0, BEACH.y), Math.min(x1, BEACH.x + BEACH.w) - Math.max(x0, BEACH.x), Math.min(y1, BEACH.y + BEACH.h) - Math.max(y0, BEACH.y));
    // Marina water with a lighter shore line.
    context.fillStyle = PALETTE.waterDeep;
    context.fillRect(Math.max(x0, WATER.x), Math.max(y0, WATER.y), Math.min(x1, WATER.x + WATER.w) - Math.max(x0, WATER.x), Math.min(y1, WATER.y + WATER.h) - Math.max(y0, WATER.y));
    context.fillStyle = PALETTE.water;
    context.fillRect(Math.max(x0, WATER.x + 14), Math.max(y0, WATER.y), Math.min(x1, WATER.x + WATER.w) - Math.max(x0, WATER.x + 14), Math.min(y1, WATER.y + WATER.h) - Math.max(y0, WATER.y));
    // Docks jutting into the bay.
    context.fillStyle = '#8a6f4f';
    for (let i = 0; i < 5; i += 1) {
      const dy = 300 + i * 420;
      if (dy > y0 - 20 && dy < y1 + 20) context.fillRect(120, dy, 90, 16);
    }
    // Park.
    context.fillStyle = PALETTE.parkGreen;
    context.fillRect(PARK.x, PARK.y, PARK.w, PARK.h);
    context.strokeStyle = '#3a6b32';
    context.lineWidth = 4;
    context.strokeRect(PARK.x, PARK.y, PARK.w, PARK.h);
  }

  function drawRoads(G, cam) {
    const { x0, y0, x1, y1 } = cam;
    const half = ROAD_W / 2;
    // Sidewalks first, then asphalt, then lane dashes.
    context.fillStyle = PALETTE.sidewalk;
    for (const rx of ROADS_X) {
      if (rx < x0 - 80 || rx > x1 + 80) continue;
      context.fillRect(rx - half - 12, Math.max(y0, 0), ROAD_W + 24, Math.min(y1, WORLD.height) - Math.max(y0, 0));
    }
    for (const ry of ROADS_Y) {
      if (ry < y0 - 80 || ry > y1 + 80) continue;
      context.fillRect(Math.max(x0, 0), ry - half - 12, Math.min(x1, WORLD.width) - Math.max(x0, 0), ROAD_W + 24);
    }
    context.fillStyle = PALETTE.asphalt;
    for (const rx of ROADS_X) {
      if (rx < x0 - 80 || rx > x1 + 80) continue;
      context.fillRect(rx - half, Math.max(y0, 0), ROAD_W, Math.min(y1, WORLD.height) - Math.max(y0, 0));
    }
    for (const ry of ROADS_Y) {
      if (ry < y0 - 80 || ry > y1 + 80) continue;
      context.fillRect(Math.max(x0, 0), ry - half, Math.min(x1, WORLD.width) - Math.max(x0, 0), ROAD_W);
    }
    // Centre dashes.
    context.fillStyle = PALETTE.lane;
    for (const rx of ROADS_X) {
      if (rx < x0 - 80 || rx > x1 + 80) continue;
      for (let y = Math.floor(Math.max(y0, 0) / 44) * 44; y < Math.min(y1, WORLD.height); y += 44) {
        context.fillRect(rx - 2, y, 4, 22);
      }
    }
    for (const ry of ROADS_Y) {
      if (ry < y0 - 80 || ry > y1 + 80) continue;
      for (let x = Math.floor(Math.max(x0, 0) / 44) * 44; x < Math.min(x1, WORLD.width); x += 44) {
        context.fillRect(x, ry - 2, 22, 4);
      }
    }
  }

  function drawBuildings(G, cam) {
    const { x0, y0, x1, y1 } = cam;
    for (const b of G.city.buildings) {
      if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
      // Soft shadow to the south-east.
      context.fillStyle = 'rgba(0,0,0,0.25)';
      context.fillRect(b.x + 8, b.y + 10, b.w, b.h);
      context.fillStyle = b.roof;
      context.fillRect(b.x, b.y, b.w, b.h);
      // Roof edge.
      context.strokeStyle = 'rgba(0,0,0,0.35)';
      context.lineWidth = 3;
      context.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
      // Windows / roof detail.
      context.fillStyle = 'rgba(255,255,255,0.28)';
      const cols = Math.max(2, Math.floor(b.w / 46));
      const rows = Math.max(2, Math.floor(b.h / 46));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          context.fillRect(b.x + 12 + c * ((b.w - 24) / cols), b.y + 12 + r * ((b.h - 24) / rows), 14, 10);
        }
      }
      if (b.tall) {
        context.fillStyle = 'rgba(255,255,255,0.35)';
        context.fillRect(b.x + b.w / 2 - 16, b.y + b.h / 2 - 16, 32, 32);
      }
    }
    // Trees.
    for (const t of G.city.trees) {
      if (t.x < x0 - 30 || t.x > x1 + 30 || t.y < y0 - 30 || t.y > y1 + 30) continue;
      circle(t.x + 3, t.y + 4, t.r, 'rgba(0,0,0,0.25)');
      circle(t.x, t.y, t.r, PALETTE.tree);
      circle(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.55, PALETTE.treeLight);
    }
    // Street lamps.
    context.fillStyle = '#3a3f4a';
    for (const l of G.city.lamps) {
      if (l.x < x0 || l.x > x1 || l.y < y0 || l.y > y1) continue;
      context.fillRect(l.x - 2, l.y - 2, 4, 4);
    }
  }

  function drawCar(G, car, isPlayer) {
    context.save();
    context.translate(car.x, car.y);
    context.rotate(car.angle);
    const len = car.kind === 'truck' ? 58 : 46;
    const wid = car.kind === 'truck' ? 24 : 22;
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.fillRect(-len / 2 + 3, -wid / 2 + 3, len, wid);
    context.fillStyle = car.color;
    context.beginPath();
    context.roundRect(-len / 2, -wid / 2, len, wid, 7);
    context.fill();
    // Cabin and windshield.
    context.fillStyle = 'rgba(20,26,36,0.85)';
    context.beginPath();
    context.roundRect(-len / 2 + 10, -wid / 2 + 4, car.kind === 'truck' ? 14 : 16, wid - 8, 4);
    context.fill();
    context.fillStyle = 'rgba(180,220,255,0.7)';
    context.fillRect(len / 2 - 12, -wid / 2 + 4, 5, wid - 8);
    // Headlights.
    context.fillStyle = '#fff8c0';
    context.fillRect(len / 2 - 2, -wid / 2 + 2, 3, 4);
    context.fillRect(len / 2 - 2, wid / 2 - 6, 3, 4);
    // Taxi sign / cop light bar.
    if (car.kind === 'taxi') {
      context.fillStyle = '#f2c94c';
      context.fillRect(-6, -wid / 2 - 2, 12, 4);
    }
    if (car.kind === 'cop') {
      context.fillStyle = '#ff4444';
      context.fillRect(-4, -wid / 2 - 3, 7, 5);
      context.fillStyle = '#4488ff';
      context.fillRect(3, -wid / 2 - 3, 7, 5);
    }
    if (car.missionCar) {
      context.fillStyle = '#f2c94c';
      context.font = `bold 13px ${FONT}`;
      context.textAlign = 'center';
      context.fillText('★', 0, -wid / 2 - 8);
    }
    // Damage smoke (puffs on a fixed rhythm so screenshots stay deterministic).
    if (car.hp < 45 && Math.floor(G.time * 4 + car.x) % 3 === 0) {
      context.fillStyle = 'rgba(120,120,120,0.5)';
      context.beginPath();
      context.arc(-len / 2 + 4, 0, 6, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    if (isPlayer) {
      context.strokeStyle = 'rgba(242,201,76,0.9)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(car.x, car.y, 34, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawPerson(x, y, angle, shirt, scale, name) {
    const s = scale || 1;
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.beginPath();
    context.ellipse(2, 3, 12 * s, 9 * s, 0, 0, Math.PI * 2);
    context.fill();
    // Body.
    context.fillStyle = shirt;
    context.beginPath();
    context.arc(0, 0, 11 * s, 0, Math.PI * 2);
    context.fill();
    // Head and facing direction.
    context.fillStyle = '#e8b98a';
    context.beginPath();
    context.arc(7 * s, 0, 5.5 * s, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#222';
    context.beginPath();
    context.arc(9 * s, 0, 2.5 * s, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (name) {
      text(name, x, y - 20, 12, '#ffffff', 'center', true);
    }
  }

  function drawWorld(G, cam) {
    drawGround(G, cam);
    drawRoads(G, cam);
    // Skid marks under everything that drives.
    context.strokeStyle = 'rgba(20,20,20,0.55)';
    context.lineWidth = 5;
    for (const s of G.skids) {
      context.globalAlpha = Math.min(1, s.life);
      context.beginPath();
      context.moveTo(s.x - Math.cos(s.angle) * 12, s.y - Math.sin(s.angle) * 12);
      context.lineTo(s.x + Math.cos(s.angle) * 12, s.y + Math.sin(s.angle) * 12);
      context.stroke();
    }
    context.globalAlpha = 1;
    drawBuildings(G, cam);
    // District labels last, so no building ever clips a word in half.
    for (const d of G.city.districts) {
      if (d.x > cam.x0 - 200 && d.x < cam.x1 + 200 && d.y > cam.y0 - 60 && d.y < cam.y1 + 60) {
        text(d.name, d.x, d.y, 26, 'rgba(255,255,255,0.28)', 'center', true);
      }
    }
    // Bonus packages.
    for (const pkg of G.city.packages) {
      if (pkg.taken) continue;
      if (pkg.x < cam.x0 - 40 || pkg.x > cam.x1 + 40 || pkg.y < cam.y0 - 40 || pkg.y > cam.y1 + 40) continue;
      const bob = Math.sin(G.time * 3 + pkg.x) * 3;
      context.fillStyle = '#f2c94c';
      context.beginPath();
      context.roundRect(pkg.x - 10, pkg.y - 10 + bob, 20, 20, 4);
      context.fill();
      context.fillStyle = '#8a6d1f';
      context.font = `bold 14px ${FONT}`;
      context.textAlign = 'center';
      context.fillText('$', pkg.x, pkg.y + 5 + bob);
    }
    // Race beacon and checkpoints.
    if (G.race && !G.race.done && G.mission.index >= 2) {
      const b = G.race.beacon;
      if (!G.race.active) {
        context.fillStyle = '#58b368';
        context.beginPath();
        context.arc(b.x, b.y, 16, 0, Math.PI * 2);
        context.fill();
        text('RACE', b.x, b.y - 24, 13, '#58b368', 'center', true);
      }
    }
    const cp = G.race && G.race.active ? (G.race.checkpoint < 5 ? [
      { x: 1520, y: 640 }, { x: 2320, y: 640 }, { x: 2320, y: 1660 }, { x: 1120, y: 1660 }, { x: 1120, y: 300 },
    ][G.race.checkpoint] : null) : null;
    if (cp) {
      context.strokeStyle = '#58b368';
      context.lineWidth = 4;
      context.beginPath();
      context.arc(cp.x, cp.y, 34 + Math.sin(G.time * 5) * 5, 0, Math.PI * 2);
      context.stroke();
      text(`CHECKPOINT ${G.race.checkpoint + 1}/5`, cp.x, cp.y - 44, 14, '#58b368', 'center', true);
    }
    // Mission marker: a pulsing ring and a beam.
    const marker = G.mission && G.mission.marker;
    if (marker) {
      const pulse = 30 + Math.sin(G.time * 4) * 8;
      context.strokeStyle = '#f2c94c';
      context.lineWidth = 4;
      context.beginPath();
      context.arc(marker.x, marker.y, pulse, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = 'rgba(242,201,76,0.25)';
      context.beginPath();
      context.arc(marker.x, marker.y, pulse - 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#f2c94c';
      context.beginPath();
      context.moveTo(marker.x, marker.y - 52);
      context.lineTo(marker.x - 10, marker.y - 28);
      context.lineTo(marker.x + 10, marker.y - 28);
      context.closePath();
      context.fill();
    }
    // Hold-zone circle for the vault step.
    const m = G.mission;
    if (m && m.active && m.step < 5) {
      const def = MISSIONS[G.mission.index];
      if (def && def.steps[m.step] && def.steps[m.step].type === 'hold') {
        const step = def.steps[m.step];
        context.strokeStyle = 'rgba(242,201,76,0.9)';
        context.lineWidth = 3;
        context.beginPath();
        context.arc(step.x, step.y, 80, 0, Math.PI * 2);
        context.stroke();
        if (m.holdTimer > 0) {
          context.fillStyle = 'rgba(242,201,76,0.3)';
          context.beginPath();
          context.moveTo(step.x, step.y);
          context.arc(step.x, step.y, 80, -Math.PI / 2, -Math.PI / 2 + (m.holdTimer / step.seconds) * Math.PI * 2);
          context.closePath();
          context.fill();
        }
      }
    }
    // Parked cars, traffic, cop cars.
    for (const car of G.parked) drawCar(G, car, false);
    for (const car of G.traffic) drawCar(G, car, false);
    for (const car of G.copCars) drawCar(G, car, false);
    if (G.playerCar) drawCar(G, G.playerCar, true);
    // Pedestrians, enemies, foot cops.
    for (const ped of G.peds) drawPerson(ped.x, ped.y, ped.angle, ped.shirt, 1);
    for (const e of G.enemies) drawPerson(e.x, e.y, e.angle, '#3a3f4a', 1.05);
    for (const cop of G.cops) drawPerson(cop.x, cop.y, cop.angle, '#2f6fd0', 1.05);
    // The player on foot.
    if (G.player.onFoot) {
      const p = G.player;
      const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
      if (!blink) {
        drawPerson(p.x, p.y, p.angle, PALETTE.playerShirt, 1.15);
        // Pistol in hand when aiming.
        if (p.aiming) {
          context.strokeStyle = '#222';
          context.lineWidth = 4;
          context.beginPath();
          context.moveTo(p.x + Math.cos(p.aimAngle) * 12, p.y + Math.sin(p.aimAngle) * 12);
          context.lineTo(p.x + Math.cos(p.aimAngle) * 26, p.y + Math.sin(p.aimAngle) * 26);
          context.stroke();
        }
        // Punch swing arc.
        if (p.punchAnim > 0) {
          context.strokeStyle = 'rgba(255,255,255,0.8)';
          context.lineWidth = 5;
          context.beginPath();
          context.arc(p.x, p.y, 30, p.angle - 0.8, p.angle + 0.8);
          context.stroke();
        }
      }
    }
    // Bullets.
    context.fillStyle = '#ffe27a';
    for (const b of G.bullets) {
      context.beginPath();
      context.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    // Particles.
    for (const pt of G.particles) {
      context.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      if (pt.kind === 'smoke') {
        context.fillStyle = pt.color;
        context.beginPath();
        context.arc(pt.x, pt.y, pt.size * (1.6 - pt.life / pt.maxLife * 0.6), 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = pt.color;
        context.beginPath();
        context.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
    // Sunset tint: the later the game clock, the warmer the light.
    const hour = G.clockMin / 60;
    const warmth = Math.max(0, Math.min(1, (hour - 15) / 4));
    if (warmth > 0) {
      context.fillStyle = `rgba(255, 140, 60, ${warmth * 0.10})`;
      context.fillRect(cam.x0, cam.y0, cam.x1 - cam.x0, cam.y1 - cam.y0);
    }
  }

  function drawTitle(G, saveExists) {
    context.fillStyle = 'rgba(8, 12, 20, 0.55)';
    context.fillRect(0, 0, VIEW_W, VIEW_H);
    text('SOLMAR BAY', VIEW_W / 2, 190, 84, '#f2c94c', 'center', true);
    text('an open-world crime story · a sun-soaked city of your own', VIEW_W / 2, 232, 22, PALETTE.text, 'center');
    text('Rio is new in town. Lina has jobs. Marco has plans.', VIEW_W / 2, 262, 18, PALETTE.muted, 'center');
    const options = ['1 — New Game', saveExists ? '2 — Continue' : null, '3 — How to play'];
    let y = 340;
    for (const opt of options) {
      if (!opt) continue;
      text(opt, VIEW_W / 2, y, 26, PALETTE.text, 'center');
      y += 46;
    }
    text('WASD move · Shift run · E enter car · F steal car · Click punch / shoot', VIEW_W / 2, 560, 18, PALETTE.muted, 'center');
    text('Space handbrake · R reload · M mute · Esc pause · P big map', VIEW_W / 2, 588, 18, PALETTE.muted, 'center');
    text('Steal cars, dodge the law, finish all five missions.', VIEW_W / 2, 640, 16, PALETTE.gold, 'center');
  }

  function drawPanel(title, lines, prompt) {
    const width = 640;
    const height = 150 + lines.length * 32;
    const x = (VIEW_W - width) / 2;
    const y = (VIEW_H - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.beginPath();
    context.roundRect(x, y, width, height, 12);
    context.fill();
    context.strokeStyle = 'rgba(242,201,76,0.6)';
    context.lineWidth = 2;
    context.stroke();
    text(title, VIEW_W / 2, y + 62, 34, PALETTE.gold, 'center', true);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], VIEW_W / 2, y + 108 + i * 32, 19, PALETTE.text, 'center');
    }
    if (prompt) text(prompt, VIEW_W / 2, y + height - 26, 18, PALETTE.muted, 'center');
  }

  /** Paint one frame. `screen` is one of the SCREEN_* constants. */
  function draw(G, screen, saveExists) {
    const cam = {
      x: G.camera.x, y: G.camera.y,
      x0: G.camera.x - VIEW_W / 2, y0: G.camera.y - VIEW_H / 2,
      x1: G.camera.x + VIEW_W / 2, y1: G.camera.y + VIEW_H / 2,
    };
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0b0e14';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x - cam.x0 * view.scale, view.y - cam.y0 * view.scale);
    drawWorld(G, cam);
    // Screen-space overlays (HUD is drawn by hud.js through the same transform).
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) drawTitle(G, saveExists);
    else if (screen === SCREEN_PAUSED) drawPanel('PAUSED', ['The city waits for no one — except right now.', ''], 'Esc / click to resume · M mute');
    else if (screen === SCREEN_OVER) drawPanel('BUSTED', ['The Solmar Bay police caught up with Rio.', `Take so far: $${G.player.money} · Missions done: ${G.mission.index}`], 'Press Enter to try again');
    else if (screen === SCREEN_WON) drawPanel('SOLMAR BAY IS YOURS', [`Final take: $${G.player.money}`, 'Every mission done. The city never forgets a name.'], 'Press Enter to keep playing');
    resize._view = view;
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, drawPanel, text, view: () => view, vw: VIEW_W, vh: VIEW_H };
}
