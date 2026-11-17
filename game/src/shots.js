// The deterministic screenshot scenes behind ?shot=start|drive|chase|mission.
// Each one plays the real rules forward from a fresh world for a fixed number
// of steps, steered by a small autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { addHeat } from './police.js';
import { carAhead } from './vehicles.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const DRIVE_SECONDS = 18;
const CHASE_SECONDS = 14;
const MISSION_SECONDS = 15;

/** A fake input the autopilot drives with: the same shape as createInput. */
function fakeInput() {
  return {
    held: { up: false, down: false, left: false, right: false, run: false, brake: false },
    mouse: { x: 0, y: 0, down: false, clicked: false },
    takeActions() { return 0; },
    takeClick() { return false; },
  };
}

/** Steer the player's car toward a point: throttle on, turn toward the target. */
function driveToward(G, input, tx, ty) {
  const car = G.playerCar || G.player;
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // Brake for the car ahead instead of ramming it.
  const ahead = G.playerCar ? carAhead(G, G.playerCar, 100) : Infinity;
  input.held.up = ahead > 70;
  input.held.down = ahead <= 70;
  input.held.left = diff < -0.12;
  input.held.right = diff > 0.12;
  input.held.brake = Math.abs(diff) > 1.1 && Math.abs(car.speed || 0) > 200;
}

/** Put the player in a fresh car at a spot, facing an angle. */
function putInCar(G, x, y, angle) {
  const car = {
    x, y, angle, speed: 0, kind: 'sedan', color: '#c0392b',
    npc: false, hp: 100, cruise: 0, target: null, stopped: false, honk: 0, skid: 0,
  };
  G.playerCar = car;
  G.player.onFoot = false;
  G.player.x = x;
  G.player.y = y;
  G.player.angle = angle;
  return car;
}

function runSteps(G, step, seconds, steer) {
  const input = fakeInput();
  const count = Math.floor(seconds / STEP);
  for (let i = 0; i < count; i += 1) {
    // A briefing dialog pauses the world; the autopilot dismisses it at once,
    // the way a player pressing Enter would, so the scene keeps moving.
    if (G.dialog) {
      const done = G.dialog.onDone;
      G.dialog = null;
      if (done) done();
    }
    if (steer) steer(G, input);
    step(G, input, STEP);
  }
}

/** Steer along a loop of road waypoints, advancing when each one is reached. */
function makeRoute(points) {
  let i = 0;
  return (g, input) => {
    const car = g.playerCar || g.player;
    const t = points[i];
    if (Math.hypot(t.x - car.x, t.y - car.y) < 90) i = (i + 1) % points.length;
    driveToward(g, input, points[i].x, points[i].y);
  };
}

/**
 * Stage the named scene on a fresh game and return the screen to draw.
 * `step` is the game's fixed-step function (G, input, dt).
 */
export function stageShot(name, G, step) {
  // The mission briefing must not pop up mid-scene and freeze the world.
  G.mission.offered = true;
  if (name === 'drive') {
    G.screen = 'play';
    putInCar(G, 1520, 980, 0);
    runSteps(G, step, DRIVE_SECONDS, makeRoute([
      { x: 1920, y: 980 }, { x: 2320, y: 980 }, { x: 2720, y: 980 }, { x: 3120, y: 980 },
      { x: 2720, y: 980 }, { x: 2320, y: 980 }, { x: 1920, y: 980 }, { x: 1520, y: 980 },
    ]));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    G.screen = 'play';
    putInCar(G, 1920, 1320, 0);
    addHeat(G, 320, 'police chase');
    G.spawnTimer = 0;
    runSteps(G, step, CHASE_SECONDS, makeRoute([
      { x: 2320, y: 1320 }, { x: 2720, y: 1320 }, { x: 2720, y: 980 }, { x: 2320, y: 980 },
      { x: 1920, y: 980 }, { x: 1520, y: 980 }, { x: 1520, y: 1320 }, { x: 1920, y: 1320 },
    ]));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    G.screen = 'play';
    putInCar(G, 1120, 640, Math.PI);
    // Mission 1, step 0, straight from the mission table: marker on the Marina.
    G.mission.active = true;
    G.mission.step = 0;
    G.mission.marker = { x: 300, y: 640 };
    G.message = { text: 'Pick up the parcel at the Marina dock', until: G.time + 30 };
    runSteps(G, step, MISSION_SECONDS, (g, input) => {
      const m = g.mission.marker || { x: 300, y: 640 };
      driveToward(g, input, m.x, m.y);
    });
    return { screen: SCREEN_PLAY };
  }
  // Default: the title screen over a living city.
  runSteps(G, step, START_SECONDS, null);
  return { screen: SCREEN_TITLE };
}
