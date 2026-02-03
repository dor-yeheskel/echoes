/* ========= LEVELS (single-file, Python-ish structure) ========= */
let levelOrder = [];
let levelToData = null;

/* ========= GAME STATE ========= */

let currentState = GAME_STATE.MENU;

let endScreenTimeout = null;

const state = {
  // dynamic per level
  base: null,
  hasBase: false,
  baseRadius: CONFIG_DEFAULTS.baseRadius,

  maxBombs: 10,
  maxStealth: 2,

  // plane
  lat: 31.5085,
  lng: 34.4538,
  heading: 0,
  speed: 3000,

  // input / flags
  keys: {},
  gameStarted: false,
  gameOver: false,

  // stealth
  stealthUses: 2,
  stealthActive: false,
  stealthTimer: 0,

  // resupply
  refueled: false,

  // scoring
  destroyedRadars: 0,

  // missiles config (defaults preserved unless overridden by level)
  rocketSpeed: 5000, // km/h
  rocketFreq: 1.0,    // seconds
  predictRocketsEvery: 0,        // 0 disables
  predictRocketsLead: 1,
  smartRocketsEvery: 0, // 0 disables
  smartRocketSpeedFactor: 0.5,
  
  // bookkeeping
  levelId: null,
  levelIndex: 0,
  missileCounter: 0,
  lastLockBeep: -999,
  gameTime: 0,

  paused: false
};

const entities = {
  targets: [],
  radars: [],
  bombs: [],
  missiles: [],
  remainingTargets: 0
};

/* ========= UI ELEMENTS ========= */

let hudLevelEl = null;
let spdEl = null;
let bombsEl = null;
let targetsEl = null;
let stealthEl = null;

let introEl = null;
let endScreenEl = null;

let endRankEl = null;
let endScoreEl = null;
let endStealthEl = null;
let endBombsEl = null;
let endRadarsEl = null;

let levelSelectEl = null;
let startBtn = null;

/* ========= PLANE + BASE MARKERS ========= */

let planeIcon = null;
let planeMarker = null;
let baseMarker = null;

let isNight = false;
const nightBursts = [];
const activeFires = [];
