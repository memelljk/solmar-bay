// Solmar Bay — every tuning number, colour and constant in one place.
// The city is a fixed 3600x2600 world; the renderer scales a 1280x720 view of it
// to the window, so no rule below depends on the screen size.

export const STEP = 1 / 60;

export const WORLD = { width: 3600, height: 2600 };

/** Vertical road centre lines (x) and horizontal road centre lines (y). */
export const ROADS_X = [320, 720, 1120, 1520, 1920, 2320, 2720, 3120];
export const ROADS_Y = [300, 640, 980, 1320, 1660, 2000, 2320];
export const ROAD_W = 96;
export const SIDEWALK_W = 26;

/** The marina bay on the west edge, and the beach strip along the south edge. */
export const WATER = { x: 0, y: 0, w: 190, h: 2600 };
export const BEACH = { x: 0, y: 2380, w: 3600, h: 220 };
export const PARK = { x: 1600, y: 1060, w: 320, h: 260 };

export const PLAYER = {
  radius: 13,
  walkSpeed: 170,
  runSpeed: 265,
  hp: 100,
  punchDamage: 34,
  punchRange: 34,
  punchArc: 1.1,
  punchCooldown: 0.42,
};

export const CAR = {
  accel: 420,
  brake: 620,
  reverseAccel: 260,
  maxSpeed: 520,
  maxReverse: 150,
  steer: 2.5,
  grip: 0.92,
  handbrakeGrip: 0.55,
  length: 46,
  width: 22,
  hp: 100,
};

export const TRAFFIC = { count: 22, speedMin: 130, speedMax: 210 };
export const PEDS = { count: 34, speedMin: 45, speedMax: 80 };

export const WANTED = {
  max: 5,
  /** Heat added by each crime; 100 heat = one star. */
  stealCar: 55,
  hitPed: 45,
  hitCar: 18,
  shoot: 70,
  kill: 90,
  /** Seconds with no cop in sight before one star fades. */
  decaySeconds: 14,
  copCarsPerStar: 1,
  maxCopCars: 6,
};

export const BULLET = { speed: 900, damage: 34, life: 0.9, range: 620 };

export const MONEY = { start: 120, package: 25, race: 200 };

export const SAVE_KEY = 'solmar-bay.save.v1';

export const PALETTE = {
  grass: '#5d8a4a',
  grassDark: '#527c41',
  sand: '#d9c08a',
  water: '#2e7fa8',
  waterDeep: '#1f5f84',
  asphalt: '#3a3d44',
  asphaltEdge: '#2c2f36',
  sidewalk: '#9aa0a8',
  lane: '#e8d44d',
  buildingRoof: ['#b0563f', '#7a6a8a', '#4f7d8a', '#8a6f4f', '#5f7d5a', '#94505f'],
  buildingDowntown: ['#5a6b80', '#6b7a8c', '#4a5a70', '#7c6a5a'],
  parkGreen: '#4c7a3e',
  tree: '#2f6b2a',
  treeLight: '#4c8a3a',
  player: '#f2c94c',
  playerShirt: '#e5534b',
  cop: '#2f6fd0',
  copCar: '#2f6fd0',
  taxi: '#f2c94c',
  text: '#f4f1e8',
  muted: '#c9c4b4',
  panel: 'rgba(12, 16, 24, 0.78)',
  gold: '#f2c94c',
  red: '#e5534b',
  green: '#58b368',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
