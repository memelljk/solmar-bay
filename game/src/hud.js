// HUD, minimap, the big map, mission dialogs and toasts. Drawn in the same
// 1280x720 logical space as the renderer, after the world.

import { FONT, PALETTE, WORLD } from './config.js';
import { missionObjective, MISSIONS } from './missions.js';
import { stars } from './police.js';

const VIEW_W = 1280;
const VIEW_H = 720;

export function createHud(canvas) {
  const context = canvas.getContext('2d');
  const fonts = new Map();

  function text(value, x, y, size, color, align, bold) {
    const key = `${size}|${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function panel(x, y, w, h) {
    context.fillStyle = PALETTE.panel;
    context.beginPath();
    context.roundRect(x, y, w, h, 8);
    context.fill();
  }

  function drawMinimap(G, big) {
    const size = big ? 560 : 190;
    const x = big ? (VIEW_W - size) / 2 : 16;
    const y = big ? (VIEW_H - size) / 2 - 10 : VIEW_H - size - 16;
    const scale = size / WORLD.width;
    const toX = (wx) => x + wx * scale;
    const toY = (wy) => y + wy * scale;
    panel(x - 6, y - 6, size + 12, size + 12);
    // Water and beach.
    context.fillStyle = '#2e7fa8';
    context.fillRect(toX(0), toY(0), 190 * scale, WORLD.height * scale);
    context.fillStyle = '#d9c08a';
    context.fillRect(toX(0), toY(2380), WORLD.width * scale, 220 * scale);
    // Roads.
    context.fillStyle = '#5a5e68';
    const roadsX = [320, 720, 1120, 1520, 1920, 2320, 2720, 3120];
    const roadsY = [300, 640, 980, 1320, 1660, 2000, 2320];
    for (const rx of roadsX) context.fillRect(toX(rx - 40), toY(0), 80 * scale, size);
    for (const ry of roadsY) context.fillRect(toX(0), toY(ry - 40), size, 80 * scale);
    // Buildings.
    context.fillStyle = 'rgba(255,255,255,0.35)';
    for (const b of G.city.buildings) {
      context.fillRect(toX(b.x), toY(b.y), Math.max(1, b.w * scale), Math.max(1, b.h * scale));
    }
    // Mission marker.
    const marker = G.mission && G.mission.marker;
    if (marker) {
      context.fillStyle = '#f2c94c';
      context.beginPath();
      context.arc(toX(marker.x), toY(marker.y), big ? 10 : 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#f2c94c';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(toX(marker.x), toY(marker.y), big ? 16 : 10, 0, Math.PI * 2);
      context.stroke();
    }
    // Cop cars.
    context.fillStyle = '#4488ff';
    for (const car of G.copCars) {
      context.beginPath();
      context.arc(toX(car.x), toY(car.y), big ? 5 : 3, 0, Math.PI * 2);
      context.fill();
    }
    // Player.
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(toX(G.player.x), toY(G.player.y), big ? 7 : 4.5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#f2c94c';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(toX(G.player.x), toY(G.player.y), big ? 11 : 7.5, 0, Math.PI * 2);
    context.stroke();
    if (big) {
      text('SOLMAR BAY — press P to close', VIEW_W / 2, y + size + 34, 18, PALETTE.text, 'center');
      text('Yellow = mission · Blue = police · White = you', VIEW_W / 2, y + size + 58, 15, PALETTE.muted, 'center');
    }
  }

  function draw(G, screen) {
    const p = G.player;
    const want = stars(G);
    // Top-left: money and health.
    panel(16, 14, 250, 64);
    text(`$${p.money.toLocaleString('en-US')}`, 30, 42, 26, PALETTE.gold, 'left', true);
    context.fillStyle = '#333';
    context.fillRect(30, 52, 180, 12);
    context.fillStyle = p.hp > 40 ? PALETTE.green : PALETTE.red;
    context.fillRect(30, 52, 180 * Math.max(0, p.hp / 100), 12);
    text(`${Math.max(0, Math.ceil(p.hp))}`, 218, 64, 14, PALETTE.text, 'left', true);
    // Top-right: wanted stars and the game clock.
    const hour = Math.floor(G.clockMin / 60) % 24;
    const min = Math.floor(G.clockMin % 60);
    const clock = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    panel(VIEW_W - 266, 14, 250, 64);
    text(clock, VIEW_W - 30, 42, 24, PALETTE.text, 'right', true);
    for (let i = 0; i < 5; i += 1) {
      text('★', VIEW_W - 30 - i * 26, 68, 22, i < want ? PALETTE.gold : 'rgba(255,255,255,0.25)', 'right', true);
    }
    if (want > 0) text('WANTED', VIEW_W - 176, 68, 14, PALETTE.red, 'right', true);
    // Mission objective, top centre.
    const objective = missionObjective(G);
    const objW = Math.min(560, 40 + objective.length * 8.5);
    panel((VIEW_W - objW) / 2, 14, objW, 40);
    text(objective, VIEW_W / 2, 41, 17, PALETTE.text, 'center', true);
    if (G.mission.timer > 0) {
      text(`${Math.ceil(G.mission.timer)}s`, VIEW_W / 2, 76, 18, PALETTE.red, 'center', true);
    }
    // Bottom-right: speed and ammo when relevant.
    if (!p.onFoot && G.playerCar) {
      const kmh = Math.round(Math.abs(G.playerCar.speed) * 0.22);
      panel(VIEW_W - 166, VIEW_H - 92, 150, 76);
      text(`${kmh}`, VIEW_W - 30, VIEW_H - 42, 34, PALETTE.text, 'right', true);
      text('km/h', VIEW_W - 30, VIEW_H - 24, 13, PALETTE.muted, 'right');
      text(`CAR ${Math.max(0, Math.ceil(G.playerCar.hp))}%`, VIEW_W - 150, VIEW_H - 42, 14, G.playerCar.hp < 40 ? PALETTE.red : PALETTE.text, 'left', true);
    }
    if (p.onFoot) {
      panel(VIEW_W - 166, VIEW_H - 92, 150, 76);
      text('PISTOL', VIEW_W - 150, VIEW_H - 58, 14, PALETTE.text, 'left', true);
      text(`${p.ammo} / ${p.reserve}`, VIEW_W - 30, VIEW_H - 30, 26, PALETTE.text, 'right', true);
      if (p.reloading) text('RELOADING…', VIEW_W - 150, VIEW_H - 30, 13, PALETTE.gold, 'left');
    }
    // Toast message.
    if (G.message && G.time < G.message.until) {
      const m = G.message.text;
      const w = 40 + m.length * 8;
      panel((VIEW_W - w) / 2, VIEW_H - 150, w, 34);
      text(m, VIEW_W / 2, VIEW_H - 127, 16, PALETTE.gold, 'center', true);
    }
    // Mission progress (missions done / 5), just above the minimap.
    text(`Missions ${G.mission.index}/5`, 16, VIEW_H - 224, 15, PALETTE.muted, 'left', true);
    // Minimap.
    if (G.showMap) drawMinimap(G, true);
    else drawMinimap(G, false);
    // Crosshair when aiming on foot.
    if (p.onFoot && p.aiming && screen === 'play') {
      const mx = G.aimScreenX;
      const my = G.aimScreenY;
      context.strokeStyle = 'rgba(255,255,255,0.9)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(mx, my, 11, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(mx - 16, my);
      context.lineTo(mx - 6, my);
      context.moveTo(mx + 6, my);
      context.lineTo(mx + 16, my);
      context.moveTo(mx, my - 16);
      context.lineTo(mx, my - 6);
      context.moveTo(mx, my + 6);
      context.lineTo(mx, my + 16);
      context.stroke();
    }
    // Dialog box (mission briefings).
    if (G.dialog) {
      const lines = G.dialog.lines;
      const w = 680;
      const h = 130 + lines.length * 28;
      const x = (VIEW_W - w) / 2;
      const y = (VIEW_H - h) / 2;
      panel(x, y, w, h);
      context.strokeStyle = 'rgba(242,201,76,0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(x, y, w, h, 10);
      context.stroke();
      text(G.dialog.title, VIEW_W / 2, y + 52, 28, PALETTE.gold, 'center', true);
      for (let i = 0; i < lines.length; i += 1) {
        text(lines[i], VIEW_W / 2, y + 92 + i * 28, 18, PALETTE.text, 'center');
      }
      text('Press Enter / click to continue', VIEW_W / 2, y + h - 22, 15, PALETTE.muted, 'center');
    }
    // Controls hint, bottom centre, fades after a while.
    if (G.time < 14 && screen === 'play' && !G.dialog) {
      text('WASD move · E enter car · F steal · Click punch / shoot · Esc pause', VIEW_W / 2, VIEW_H - 16, 14, 'rgba(255,255,255,0.55)', 'center');
    }
  }

  return { draw };
}
