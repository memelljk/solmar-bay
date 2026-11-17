// Solmar Bay — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused, busted, won. ?seed=N fixes the city;
// ?shot=start|drive|chase|mission stages that scene, paints it twice and
// sets window.__shotReady for a screenshot.

import { MONEY, STEP } from './config.js';
import { createRandom, hashSeed } from './random.js';
import { createCity } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_MAP, ACTION_MUTE, ACTION_PAUSE, ACTION_RELOAD, ACTION_STEAL, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { createHud } from './hud.js';
import { makeCar, spawnTraffic, stepPlayerCar, stepTraffic } from './vehicles.js';
import { addOnePed, spawnPeds, stepPeds } from './traffic.js';
import { stepParticles } from './particles.js';
import { addHeat, stepPolice, stars } from './police.js';
import { initMissions, updateMissions } from './missions.js';
import { fireBullet, punch, stepCombat } from './combat.js';
import { exitCar, stepPlayerOnFoot, tryEnterCar } from './player.js';
import { clearSave, hasSave, loadSave, saveGame } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : hashSeed(Date.now() % 100000);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

/** Build a fresh game state for a seed. */
export function createGame(gameSeed) {
  const rng = createRandom(gameSeed);
  const G = {
    seed: gameSeed,
    rng,
    city: null,
    time: 0,
    clockMin: 16 * 60 + 20,
    screen: SCREEN_TITLE,
    player: {
      x: 760, y: 700, angle: -Math.PI / 2,
      hp: 100, money: MONEY.start, heat: 0, wanted: 0, hiddenTimer: 0,
      onFoot: true, ammo: 12, reserve: 48, pistol: true,
      shootCd: 0, punchCd: 0, punchAnim: 0, invuln: 0, moving: false,
      aiming: false, aimAngle: 0, reloading: false, reloadTimer: 0,
    },
    playerCar: null,
    traffic: [],
    parked: [],
    peds: [],
    cops: [],
    copCars: [],
    enemies: [],
    bullets: [],
    particles: [],
    skids: [],
    camera: { x: 760, y: 700 },
    message: null,
    dialog: null,
    showMap: false,
    spawnTimer: 0,
    saveTimer: 0,
    crimeCooldown: 0,
    aimScreenX: 640,
    aimScreenY: 360,
    won: false,
    audio: null,
    titleMode: 'menu',
  };
  G.city = createCity(rng);
  // Spawn on a quiet spot inside a block: not on a road, not in a building.
  // Fixed candidate order, so the spawn is the same for a given seed.
  let spawn = { x: 900, y: 800 };
  outer: for (let cy = 760; cy <= 900; cy += 20) {
    for (let cx = 820; cx <= 1000; cx += 20) {
      if (!G.city.blocked(cx, cy, 14) && !G.city.onRoad(cx, cy)) {
        spawn = { x: cx, y: cy };
        break outer;
      }
    }
  }
  G.player.x = spawn.x;
  G.player.y = spawn.y;
  G.camera.x = spawn.x;
  G.camera.y = spawn.y;
  initMissions(G);
  spawnTraffic(G);
  spawnPeds(G);
  // A few parked cars near the spawn, free for the taking.
  const spots = [[820, 640, 0], [720, 760, Math.PI / 2], [1120, 700, 0], [660, 980, 0], [1520, 760, Math.PI]];
  for (const [x, y, angle] of spots) {
    const car = makeCar(rng, x, y, angle, null, { npc: false });
    G.parked.push(car);
  }
  return G;
}

const audio = createAudio();
const renderer = createRenderer(canvas);
const hud = createHud(canvas);
let G = createGame(seed);
G.audio = audio;
window.__solmar = G;

/** Convert a mouse position (CSS pixels on the canvas) to world coordinates. */
function screenToWorld(mx, my) {
  const view = renderer.view();
  const dpr = window.devicePixelRatio || 1;
  const logicalX = (mx * dpr - view.x) / view.scale;
  const logicalY = (my * dpr - view.y) / view.scale;
  return {
    x: logicalX + G.camera.x - 640,
    y: logicalY + G.camera.y - 360,
  };
}

/** One fixed simulation step. Pure game logic; the loop calls it. */
export function stepGame(G, input, dt) {
  G.time += dt;
  G.clockMin += dt * 0.25;
  if (G.dialog) return; // Briefings pause the world.
  if (G.crimeCooldown > 0) G.crimeCooldown -= dt;

  updateMissions(G, dt);
  stepTraffic(G, dt);
  stepPeds(G, dt);
  stepPolice(G, dt);
  stepCombat(G, dt);
  stepParticles(G, dt);

  const p = G.player;
  if (p.onFoot) {
    stepPlayerOnFoot(G, input, dt);
    // Aim follows the mouse; click fires or punches.
    const world = screenToWorld(input.mouse.x, input.mouse.y);
    p.aiming = true;
    p.aimAngle = Math.atan2(world.y - p.y, world.x - p.x);
    G.aimScreenX = input.mouse.x;
    G.aimScreenY = input.mouse.y;
    if (input.mouse.down && p.shootCd <= 0 && !p.reloading) {
      const dist = Math.hypot(world.x - p.x, world.y - p.y);
      const nearFoe = [...G.enemies, ...G.cops].some((t) => t.hp > 0 && Math.hypot(t.x - p.x, t.y - p.y) < 52);
      if (nearFoe || dist < 60) {
        p.angle = p.aimAngle;
        punch(G);
      } else if (p.ammo > 0) {
        p.ammo -= 1;
        p.shootCd = 0.26;
        p.angle = p.aimAngle;
        fireBullet(G, p.x, p.y, p.aimAngle, true);
        audio.shot();
      } else {
        p.angle = p.aimAngle;
        punch(G);
      }
    }
    if (p.reloading) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) {
        p.reloading = false;
        const need = 12 - p.ammo;
        const take = Math.min(need, p.reserve);
        p.ammo += take;
        p.reserve -= take;
      }
    }
    // Bonus packages.
    for (const pkg of G.city.packages) {
      if (!pkg.taken && Math.hypot(pkg.x - p.x, pkg.y - p.y) < 34) {
        pkg.taken = true;
        p.money += MONEY.package;
        audio.coin();
        G.message = { text: `Bonus package! +$${MONEY.package}`, until: G.time + 2.5 };
      }
    }
    // Traffic cars can run the player down — but only out on the road,
    // never while standing on a sidewalk or inside a block.
    for (const car of G.traffic) {
      if (G.city.onRoad(p.x, p.y) && Math.hypot(car.x - p.x, car.y - p.y) < 34 && p.invuln <= 0) {
        p.hp -= 14;
        p.invuln = 0.6;
        p.x += (p.x - car.x) * 0.4;
        p.y += (p.y - car.y) * 0.4;
        audio.crash();
      }
    }
  } else if (G.playerCar) {
    const event = stepPlayerCar(G, G.playerCar, input, dt);
    if (event) {
      audio.crash();
      if (event === 'hard-crash' && G.crimeCooldown <= 0) {
        G.crimeCooldown = 2;
      }
    }
    p.x = G.playerCar.x;
    p.y = G.playerCar.y;
    p.angle = G.playerCar.angle;
    // Running over a pedestrian is a crime.
    for (let i = G.peds.length - 1; i >= 0; i -= 1) {
      const ped = G.peds[i];
      if (Math.hypot(ped.x - p.x, ped.y - p.y) < 30 && Math.abs(G.playerCar.speed) > 60) {
        G.peds.splice(i, 1);
        audio.crash();
        if (G.crimeCooldown <= 0) {
          G.crimeCooldown = 2;
          addHeat(G, 45, 'hit and run');
        }
        // A fresh pedestrian wanders in later.
        addOnePed(G);
        break;
      }
    }
    // Bumping traffic cars.
    for (const car of G.traffic) {
      const dx = car.x - G.playerCar.x;
      const dy = car.y - G.playerCar.y;
      const d = Math.hypot(dx, dy);
      if (d < 44 && d > 0.01) {
        const push = (44 - d) / 2;
        car.x += (dx / d) * push;
        car.y += (dy / d) * push;
        G.playerCar.speed *= 0.94;
        if (Math.abs(G.playerCar.speed) > 150 && G.crimeCooldown <= 0) {
          G.crimeCooldown = 2;
          addHeat(G, 18, 'traffic collision');
          audio.crash();
        }
      }
    }
    // A wrecked car strands the player on foot.
    if (G.playerCar.hp <= 0) {
      const wreck = G.playerCar;
      G.playerCar = null;
      p.onFoot = true;
      p.x = wreck.x + 40;
      p.y = wreck.y + 40;
      audio.crash();
      G.message = { text: 'Your car is wrecked!', until: G.time + 3 };
    }
  }

  // Camera follows the player smoothly, clamped inside the city.
  const targetX = Math.max(640, Math.min(3600 - 640, p.x));
  const targetY = Math.max(360, Math.min(2600 - 360, p.y));
  G.camera.x += (targetX - G.camera.x) * Math.min(1, 5 * dt);
  G.camera.y += (targetY - G.camera.y) * Math.min(1, 5 * dt);

  audio.update(dt, G.playerCar ? Math.abs(G.playerCar.speed) : 0, stars(G));

  // Autosave while playing.
  G.saveTimer += dt;
  if (G.saveTimer > 20) {
    G.saveTimer = 0;
    saveGame(G);
  }

  if (p.hp <= 0 && G.screen === SCREEN_PLAY) {
    p.hp = 0;
    G.screen = SCREEN_OVER;
    audio.busted();
    clearSave();
  }
  if (G.won && G.screen === SCREEN_PLAY && !G.dialog) {
    G.screen = SCREEN_WON;
  }
}

function applySave(G, data) {
  G.player.x = data.x;
  G.player.y = data.y;
  G.player.money = data.money;
  G.player.hp = data.hp;
  G.camera.x = data.x;
  G.camera.y = data.y;
  G.time = data.time || 0;
  if (data.missionIndex > 0) {
    G.mission.index = Math.min(data.missionIndex, 4);
  }
  if (typeof data.packages === 'string') {
    for (let i = 0; i < data.packages.length && i < G.city.packages.length; i += 1) {
      G.city.packages[i].taken = data.packages[i] === '1';
    }
  }
}

function startNewGame() {
  G = createGame(seed);
  G.audio = audio;
  window.__solmar = G;
  G.screen = SCREEN_PLAY;
  announce('Playing. Follow the yellow marker.');
}

function continueGame() {
  const data = loadSave();
  if (!data) return startNewGame();
  G = createGame(seed);
  G.audio = audio;
  window.__solmar = G;
  applySave(G, data);
  G.screen = SCREEN_PLAY;
  announce('Welcome back to Solmar Bay.');
}

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, G, stepGame);
  let painted = 0;
  function paint() {
    renderer.draw(G, scene.screen, hasSave());
    if (scene.screen === SCREEN_PLAY) hud.draw(G, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  const CONTROLS_LINES = [
    'WASD / arrows — move or drive · Shift — run',
    'E — enter / exit car · F — steal the nearest car',
    'Mouse — aim · Click — punch close, shoot far',
    'Space — handbrake · R — reload · M — mute',
    'Esc — pause · P — big map · 1/2/3 — menu choices',
    '',
    'Steal cars, finish Lina and Marco\u2019s five missions,',
    'grab bonus packages, win the street race — and stay',
    'out of sight when the wanted stars climb.',
  ];

  function handleTitleKey(code) {
    if (code === 'Digit1') startNewGame();
    else if (code === 'Digit2' && hasSave()) continueGame();
    else if (code === 'Digit3') {
      G.dialog = { title: 'HOW TO PLAY', lines: CONTROLS_LINES, onDone() {} };
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (G.dialog) {
      if (actions & ACTION_CONFIRM || input.takeClick()) {
        const done = G.dialog.onDone;
        G.dialog = null;
        if (done) done();
      }
      return;
    }
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      G.message = { text: muted ? 'Sound muted (M to unmute)' : 'Sound on', until: G.time + 2 };
    }
    if (G.screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startNewGame();
      return;
    }
    if (G.screen === SCREEN_OVER || G.screen === SCREEN_WON) {
      if (actions & ACTION_CONFIRM) startNewGame();
      return;
    }
    if (actions & ACTION_PAUSE) {
      G.screen = G.screen === SCREEN_PAUSED ? SCREEN_PLAY : SCREEN_PAUSED;
      announce(G.screen === SCREEN_PAUSED ? 'Paused.' : 'Playing.');
      return;
    }
    if (G.screen !== SCREEN_PLAY) return;
    if (actions & ACTION_MAP) G.showMap = !G.showMap;
    if (G.showMap) return;
    if (actions & ACTION_RELOAD && G.player.onFoot && !G.player.reloading && G.player.reserve > 0 && G.player.ammo < 12) {
      G.player.reloading = true;
      G.player.reloadTimer = 0.9;
      audio.reload();
    }
    if (actions & ACTION_ENTER_CAR) {
      if (G.player.onFoot) tryEnterCar(G, false);
      else exitCar(G);
    } else if (actions & ACTION_STEAL) {
      if (G.player.onFoot) tryEnterCar(G, true);
    }
  }

  window.addEventListener('keydown', (event) => {
    if (G.screen === SCREEN_TITLE && !G.dialog) handleTitleKey(event.code);
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (G.screen === SCREEN_PLAY && !G.dialog) {
      while (accumulator >= STEP) {
        stepGame(G, input, STEP);
        accumulator -= STEP;
        if (G.screen !== SCREEN_PLAY) break;
      }
    } else if (G.screen === SCREEN_TITLE) {
      // The title screen lives over a city that keeps moving.
      while (accumulator >= STEP) {
        stepTraffic(G, STEP);
        stepPeds(G, STEP);
        stepParticles(G, STEP);
        G.time += STEP;
        G.clockMin += STEP * 0.25;
        const targetX = Math.max(640, Math.min(3600 - 640, G.player.x));
        const targetY = Math.max(360, Math.min(2600 - 360, G.player.y));
        G.camera.x += (targetX - G.camera.x) * Math.min(1, 2 * STEP);
        G.camera.y += (targetY - G.camera.y) * Math.min(1, 2 * STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(G, G.screen, hasSave());
    if (G.screen !== SCREEN_TITLE) hud.draw(G, G.screen);
    else if (G.dialog) hud.draw(G, G.screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === SCREEN_PLAY) {
      G.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solmar Bay. Press 1 for a new game, 2 to continue, 3 for controls.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
