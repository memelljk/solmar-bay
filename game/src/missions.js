// Missions and side activities: five story missions in order, each a chain of
// simple steps (go somewhere, pick something up, steal a marked car, clear out
// armed thugs, hold a spot, escape to the safehouse), plus a checkpoint race
// and the scattered bonus packages.

import { addHeat } from './police.js';

export const MISSIONS = [
  {
    title: '1 · First Parcel',
    giver: 'Lina — your dispatcher',
    brief: [
      'Welcome to Solmar Bay, Rio. Lina here — I run jobs for the crew.',
      'First one is easy: grab my parcel from the Marina dock,',
      'then drop it at the Old Town cafe. No cops, no trouble. Yet.',
    ],
    reward: 150,
    steps: [
      { type: 'goto', x: 300, y: 640, label: 'Pick up the parcel at the Marina dock' },
      { type: 'goto', x: 900, y: 980, label: 'Deliver the parcel to the Old Town cafe' },
    ],
  },
  {
    title: '2 · The Pickup',
    giver: 'Lina — your dispatcher',
    brief: [
      'A client needs a quiet ride across town. Pick him up downtown',
      'and take him to the beach house. He pays well and hates waiting —',
      'get there in under 100 seconds and there is a bonus in it.',
    ],
    reward: 250,
    steps: [
      { type: 'goto', x: 2320, y: 980, label: 'Pick up the client downtown' },
      { type: 'goto', x: 2720, y: 2000, label: 'Drive the client to the beach house (100s)' },
    ],
  },
  {
    title: '3 · Hot Wheels',
    giver: 'Marco — the fixer',
    brief: [
      'Marco here. A cherry-red sports car is parked downtown,',
      'owner nowhere in sight. Take it. The cops will notice —',
      'they always do — then bring it to my garage at the Port.',
    ],
    reward: 400,
    steps: [
      { type: 'steal', x: 2320, y: 1320, label: 'Steal the red sports car downtown (press F)' },
      { type: 'goto', x: 720, y: 2000, label: 'Deliver the sports car to the Port garage' },
    ],
  },
  {
    title: '4 · Dockside Trouble',
    giver: 'Lina — your dispatcher',
    brief: [
      'The dock crew turned on us. Four of their boys are holding',
      'our crate at the docks. Go sort it out — fists or pistol,',
      'your call — then bring the crate home.',
    ],
    reward: 600,
    steps: [
      { type: 'combat', x: 420, y: 1660, count: 4, label: 'Clear the dock thugs (0/4)' },
      { type: 'goto', x: 300, y: 2000, label: 'Collect the crate at the far dock' },
    ],
  },
  {
    title: '5 · The Big Score',
    giver: 'Marco — the fixer',
    brief: [
      'The big one, Rio. The downtown bank vault. Stand at the vault',
      'door and hold it open while I work — six seconds.',
      'Then run. Every cop in Solmar Bay will be on you.',
      'Lose them and reach the safehouse. Do this and we are set.',
    ],
    reward: 1500,
    steps: [
      { type: 'hold', x: 1920, y: 980, seconds: 6, label: 'Hold the vault door open (stay in the circle)' },
      { type: 'escape', x: 1120, y: 2320, label: 'ESCAPE — reach the safehouse in the Old Town' },
    ],
  },
];

export function initMissions(G) {
  G.mission = {
    index: 0,
    step: 0,
    active: false,
    offered: false,
    marker: null,
    timer: 0,
    holdTimer: 0,
    kills: 0,
    targetCar: null,
    done: false,
  };
  G.race = { active: false, checkpoint: 0, timer: 0, beacon: { x: 1520, y: 300 } };
  G.won = false;
}

function currentDef(G) {
  return MISSIONS[G.mission.index];
}

function setupStep(G) {
  const m = G.mission;
  const def = currentDef(G);
  if (!def || m.step >= def.steps.length) return;
  const step = def.steps[m.step];
  m.marker = { x: step.x, y: step.y };
  m.holdTimer = 0;
  m.kills = 0;
  if (step.type === 'steal') {
    // Park the marked sports car at the spot.
    const car = { x: step.x, y: step.y, angle: 0.4, speed: 0, kind: 'sport', color: '#c0392b', npc: false, hp: 100, cruise: 0, target: null, stopped: false, honk: 0, skid: 0, missionCar: true };
    G.parked.push(car);
    m.targetCar = car;
  }
  if (step.type === 'combat') {
    G.enemies = [];
    for (let i = 0; i < step.count; i += 1) {
      const a = (i / step.count) * Math.PI * 2;
      G.enemies.push({
        x: step.x + Math.cos(a) * 90,
        y: step.y + Math.sin(a) * 90,
        angle: 0, hp: 60, shootCd: 1 + i * 0.4, speed: 120, armed: true,
      });
    }
  }
  if (step.type === 'escape') {
    addHeat(G, 400, 'the vault job');
  }
}

/** Show the next mission's briefing dialog; the mission starts on dismiss. */
export function offerMission(G) {
  const def = currentDef(G);
  if (!def) return;
  G.mission.offered = true;
  G.dialog = {
    title: def.title,
    lines: [...def.brief, '', `Reward: $${def.reward}`],
    onDone() {
      G.mission.active = true;
      G.mission.step = 0;
      G.mission.timer = def.title.startsWith('2') ? 100 : 0;
      setupStep(G);
      G.message = { text: def.steps[0].label, until: G.time + 5 };
      G.audio.missionDone();
    },
  };
}

function completeMission(G) {
  const def = currentDef(G);
  G.player.money += def.reward;
  G.mission.active = false;
  G.mission.marker = null;
  G.mission.index += 1;
  G.audio.missionDone();
  if (G.mission.index >= MISSIONS.length) {
    G.won = true;
    G.dialog = {
      title: 'THE BIG SCORE — COMPLETE',
      lines: [
        'You made it, Rio. The vault, the chase, the safehouse —',
        'all of it. Solmar Bay is yours now.',
        '',
        `Final take: $${G.player.money}. Keep driving.`,
      ],
      onDone() {},
    };
    return;
  }
  G.message = { text: `Mission complete! +$${def.reward}`, until: G.time + 4 };
  offerMission(G);
}

function failMission(G, reason) {
  const m = G.mission;
  m.active = false;
  m.marker = null;
  m.timer = 0;
  G.audio.missionFail();
  G.dialog = {
    title: 'MISSION FAILED',
    lines: [reason, '', 'Lina will call again. The job is still open.'],
    onDone() {
      // Offer the same mission again.
      G.mission.offered = false;
      offerMission(G);
    },
  };
}

const RACE_POINTS = [
  { x: 1520, y: 640 }, { x: 2320, y: 640 }, { x: 2320, y: 1660 },
  { x: 1120, y: 1660 }, { x: 1120, y: 300 },
];

export function updateMissions(G, dt) {
  const m = G.mission;
  // Offer the first mission shortly after the game starts.
  if (!m.offered && !m.active && !m.done && G.time > 2 && G.screen === 'play') {
    offerMission(G);
  }
  if (!m.active) return;
  const def = currentDef(G);
  const step = def.steps[m.step];
  if (!step) return;

  if (step.type === 'goto' || step.type === 'pickup') {
    const d = Math.hypot(G.player.x - step.x, G.player.y - step.y);
    if (d < 70) {
      G.audio.pickup();
      advanceStep(G);
    }
  } else if (step.type === 'steal') {
    if (G.playerCar === m.targetCar) {
      addHeat(G, 55, 'grand theft auto');
      G.message = { text: 'Stolen! Get it to the Port garage.', until: G.time + 4 };
      advanceStep(G);
    }
  } else if (step.type === 'combat') {
    step.label = `Clear the dock thugs (${m.kills}/${step.count})`;
    if (m.kills >= step.count) advanceStep(G);
  } else if (step.type === 'hold') {
    const d = Math.hypot(G.player.x - step.x, G.player.y - step.y);
    if (d < 80) {
      m.holdTimer += dt;
      if (m.holdTimer >= step.seconds) advanceStep(G);
    } else {
      m.holdTimer = Math.max(0, m.holdTimer - dt * 2);
    }
  } else if (step.type === 'escape') {
    const d = Math.hypot(G.player.x - step.x, G.player.y - step.y);
    if (d < 80) {
      completeMission(G);
      return;
    }
  }

  // Mission 2's time limit.
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission(G, 'Too slow — the client walked away.');
      return;
    }
  }

  // The checkpoint race (side activity, available after mission 2).
  const race = G.race;
  if (!race.active && G.mission.index >= 2 && !race.done) {
    const d = Math.hypot(G.player.x - race.beacon.x, G.player.y - race.beacon.y);
    if (d < 70 && G.playerCar) {
      race.active = true;
      race.checkpoint = 0;
      race.timer = 75;
      G.message = { text: 'STREET RACE! Hit all 5 checkpoints in 75s.', until: G.time + 4 };
      G.audio.missionDone();
    }
  }
  if (race.active) {
    race.timer -= dt;
    const cp = RACE_POINTS[race.checkpoint];
    if (cp) {
      const d = Math.hypot(G.player.x - cp.x, G.player.y - cp.y);
      if (d < 70) {
        race.checkpoint += 1;
        G.audio.coin();
        if (race.checkpoint >= RACE_POINTS.length) {
          race.active = false;
          race.done = true;
          G.player.money += 200;
          G.message = { text: 'Race won! +$200', until: G.time + 4 };
          G.audio.missionDone();
        }
      }
    }
    if (race.timer <= 0) {
      race.active = false;
      G.message = { text: 'Race failed — the clock ran out.', until: G.time + 3 };
    }
  }
}

function advanceStep(G) {
  const m = G.mission;
  m.step += 1;
  const def = currentDef(G);
  if (m.step >= def.steps.length) {
    completeMission(G);
    return;
  }
  setupStep(G);
  G.message = { text: def.steps[m.step].label, until: G.time + 5 };
}

export function missionObjective(G) {
  const m = G.mission;
  if (!m.active) return m.index >= MISSIONS.length ? 'All missions complete!' : 'Wait for Lina\u2019s call…';
  const def = currentDef(G);
  const step = def.steps[m.step];
  return step ? step.label : '';
}

export function raceCheckpoint(G) {
  if (!G.race.active) return null;
  return RACE_POINTS[G.race.checkpoint];
}
