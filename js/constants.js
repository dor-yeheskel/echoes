/* ========= GAME STATES ========= */
const GAME_STATE = {
  MENU: "menu",
  PLAYING: "playing",
  GAMEOVER: "gameover"
};

/* ========= CONSTANTS (defaults preserved) ========= */

const CONFIG_DEFAULTS = {
  baseRadius: 400, // meters
  minSpeed: 1900,
  maxSpeed: 4500,  // 5000?
  accel: 2500,
  turnRate: 140,
  emojiRotationOffset: -45,

  missileLifetime: 3,     // seconds
  missileHitRadius: 85,    // meters

  missileRotationOffset: -45,

  lockBeepDistance: 5000,
  lockBeepCooldown: 0.7,

  radarRangeOnMinimap: 4500,
};

const BASE_SIZE = 45;

/* radar types (ranges doubled as in your current code) */
const RADAR_TYPES = [
  { size: "small",  range: 1300,  emoji: "📡", scale: 1 },  //old 3500
  { size: "medium", range: 3400,  emoji: "📡", scale: 1.5 }, // 5000
  { size: "big",  range: 6000, emoji: "📡", scale: 2 } // 7500
];

const SIZE_STATS = {
  small:  { hp: 1, scale: 1.5 },
  medium: { hp: 2, scale: 2 },
  big:    { hp: 3, scale: 2.5 }
};

const FIRE_SCALE_BY_SIZE = {
  small: 1.5,
  medium: 2,
  big: 2.5
};

const FIRE_X_OFFSET_PX = {
  small:  6,
  medium: 25,
  big:    20
};

const FIRE_Y_OFFSET_PX = {
  small:  10,
  medium: 40,
  big:    40
};


// ===== FIRE BASE SIZE PER ENTITY SIZE =====
const FIRE_BASE_SIZE_PX = {
  small:  24,
  medium: 15,
  big:    20
};

// ===== FIRE INTENSITY TUNING =====
// scale by remaining HP ratio
const FIRE_SCALE_BY_HP_RATIO = [
  { min: 0.66, scale: 1.0 },  // light fire
  { min: 0.33, scale: 1.4 },  // medium fire
  { min: 0.0,  scale: 1.9 }   // heavy fire
];


// ===== HIT RADIUS (BOMB DAMAGE) BY ENTITY SIZE =====

const TARGET_HIT_RADIUS_BY_SIZE = {
  small: 250,
  medium: 290,
  big: 370
};

const RADAR_HIT_RADIUS_BY_SIZE = {
  small: 250,
  medium: 290,
  big: 370
};

function getTargetHitRadius(size) {
  if (!TARGET_HIT_RADIUS_BY_SIZE[size]) {
    throw new Error(`Unknown target size for hit radius: ${size}`);
  }
  return TARGET_HIT_RADIUS_BY_SIZE[size];
}

function getRadarHitRadius(size) {
  if (!RADAR_HIT_RADIUS_BY_SIZE[size]) {
    throw new Error(`Unknown radar size for hit radius: ${size}`);
  }
  return RADAR_HIT_RADIUS_BY_SIZE[size];
}
