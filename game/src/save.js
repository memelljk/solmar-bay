// Save and load: the player's position, money, health, mission progress and
// collected packages, kept in localStorage under one key. Loading a save is
// best-effort — a corrupt or missing save just starts a new game.

import { SAVE_KEY } from './config.js';

export function saveGame(G) {
  try {
    const data = {
      x: Math.round(G.player.x),
      y: Math.round(G.player.y),
      money: G.player.money,
      hp: Math.round(G.player.hp),
      missionIndex: G.mission.index,
      packages: G.city.packages.map((p) => (p.taken ? 1 : 0)).join(''),
      time: Math.round(G.time),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.x !== 'number' || typeof data.money !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch { /* storage can be off */ }
}
