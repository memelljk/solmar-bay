// Solmar Bay: the city itself. A seeded generator lays out the road grid, the
// marina bay, the beach, the park and the buildings of each block, plus trees,
// lamps and the scattered bonus packages. It also answers the questions the
// simulation asks every step: is this point on a road, does it hit a building,
// where is the nearest road.

import { BEACH, PALETTE, PARK, ROADS_X, ROADS_Y, ROAD_W, SIDEWALK_W, WATER, WORLD } from './config.js';

export function createCity(rng) {
  const buildings = [];
  const trees = [];
  const lamps = [];
  const packages = [];

  const roadHalf = ROAD_W / 2;
  const blockXs = [WATER.w + 40, ...ROADS_X, WORLD.width - 40];
  const blockYs = [40, ...ROADS_Y, WORLD.height - 40];

  function inPark(x, y, w, h) {
    return x < PARK.x + PARK.w && x + w > PARK.x && y < PARK.y + PARK.h && y + h > PARK.y;
  }
  function inBeach(x, y) {
    return y >= BEACH.y;
  }

  // One or two buildings per block, skipped for the park and the beach.
  for (let bx = 0; bx < blockXs.length - 1; bx += 1) {
    for (let by = 0; by < blockYs.length - 1; by += 1) {
      const x0 = blockXs[bx] + roadHalf + SIDEWALK_W + 14;
      const x1 = blockXs[bx + 1] - roadHalf - SIDEWALK_W - 14;
      const y0 = blockYs[by] + roadHalf + SIDEWALK_W + 14;
      const y1 = blockYs[by + 1] - roadHalf - SIDEWALK_W - 14;
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 90 || h < 90) continue;
      if (inPark(x0, y0, w, h)) {
        for (let t = 0; t < 14; t += 1) {
          trees.push({ x: PARK.x + 20 + rng.next() * (PARK.w - 40), y: PARK.y + 20 + rng.next() * (PARK.h - 40), r: 12 + rng.next() * 8 });
        }
        continue;
      }
      if (inBeach(x0, y0)) continue;
      const downtown = x0 > 1900 && y0 > 900 && y0 < 1800;
      const count = w > 240 && h > 200 && rng.chance(0.5) ? 2 : 1;
      for (let n = 0; n < count; n += 1) {
        const bw = count === 2 ? w / 2 - 16 : w - rng.range(0, 40);
        const bh = count === 2 ? h - rng.range(0, 30) : h - rng.range(0, 40);
        const bx0 = count === 2 ? x0 + n * (w / 2 + 8) : x0;
        const by0 = y0 + rng.range(0, 12);
        const roof = downtown ? rng.pick(PALETTE.buildingDowntown) : rng.pick(PALETTE.buildingRoof);
        buildings.push({
          x: bx0, y: by0, w: bw, h: bh,
          tall: downtown && rng.chance(0.6),
          roof,
          windows: rng.int(2, 5),
        });
      }
      // A tree or two on the block's corners.
      if (rng.chance(0.7)) trees.push({ x: x0 + rng.range(10, w - 10), y: y0 + rng.range(6, 26), r: 10 + rng.next() * 6 });
    }
  }

  // Street lamps along every road, alternating sides.
  for (const x of ROADS_X) {
    for (const y of ROADS_Y) {
      lamps.push({ x: x - roadHalf - 8, y: y - roadHalf - 8 });
      lamps.push({ x: x + roadHalf + 8, y: y + roadHalf + 8 });
    }
  }
  // Trees along the beach promenade and the marina walk.
  for (let i = 0; i < 16; i += 1) trees.push({ x: 260 + i * 210 + rng.range(-30, 30), y: 2420 + rng.range(0, 60), r: 11 + rng.next() * 7 });
  for (let i = 0; i < 10; i += 1) trees.push({ x: 220 + rng.range(0, 40), y: 200 + i * 230 + rng.range(-20, 20), r: 10 + rng.next() * 6 });

  // Ten bonus packages tucked near roads all over the city.
  const spots = [
    [720, 300], [1520, 640], [2720, 980], [1120, 1660], [3120, 2000],
    [2320, 300], [720, 2000], [1920, 1320], [3120, 640], [1120, 2320],
  ];
  for (const [sx, sy] of spots) {
    packages.push({ x: sx + rng.range(-90, 90), y: sy + rng.range(-90, 90), taken: false });
  }

  // District label points, for the map and the minimap.
  const districts = [
    { name: 'MARINA', x: 330, y: 130 },
    { name: 'OLD TOWN', x: 900, y: 480 },
    { name: 'DOWNTOWN', x: 2350, y: 1150 },
    { name: 'NORTH HILLS', x: 2900, y: 480 },
    { name: 'PORT', x: 700, y: 2150 },
    { name: 'SOUTH BEACH', x: 1900, y: 2470 },
  ];

  function onRoad(x, y) {
    if (x < WATER.w) return false;
    for (const rx of ROADS_X) if (Math.abs(x - rx) <= roadHalf) return true;
    for (const ry of ROADS_Y) if (Math.abs(y - ry) <= roadHalf) return true;
    return false;
  }

  function nearestRoadPoint(x, y) {
    let bestX = ROADS_X[0];
    let bestD = Infinity;
    for (const rx of ROADS_X) {
      const d = Math.abs(x - rx);
      if (d < bestD) { bestD = d; bestX = rx; }
    }
    let bestY = ROADS_Y[0];
    bestD = Infinity;
    for (const ry of ROADS_Y) {
      const d = Math.abs(y - ry);
      if (d < bestD) { bestD = d; bestY = ry; }
    }
    return Math.abs(x - bestX) < Math.abs(y - bestY) ? { x: bestX, y } : { x, y: bestY };
  }

  function hitsBuilding(x, y, r) {
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }

  function inWater(x, y) {
    return x >= WATER.x && x < WATER.x + WATER.w && y >= WATER.y && y < WATER.y + WATER.h;
  }

  function blocked(x, y, r) {
    if (x - r < 0 || x + r > WORLD.width || y - r < 0 || y + r > WORLD.height) return true;
    if (inWater(x, y)) return true;
    return hitsBuilding(x, y, r) !== null;
  }

  /** Slide a circle along obstacles: try full move, then each axis alone. */
  function moveCircle(pos, dx, dy, r) {
    if (!blocked(pos.x + dx, pos.y + dy, r)) {
      pos.x += dx;
      pos.y += dy;
      return true;
    }
    if (!blocked(pos.x + dx, pos.y, r)) {
      pos.x += dx;
      return true;
    }
    if (!blocked(pos.x, pos.y + dy, r)) {
      pos.y += dy;
      return true;
    }
    return false;
  }

  return {
    buildings, trees, lamps, packages, districts,
    onRoad, nearestRoadPoint, hitsBuilding, inWater, blocked, moveCircle,
  };
}
