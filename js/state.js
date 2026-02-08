/* ========= LEVELS (single-file, Python-ish structure) ========= */
let levelOrder = [];
let levelToData = null;

/* ========= GAME STATE ========= */

let currentState = GAME_STATE.MENU;

let endScreenTimeout = null;

const state = {
  lat: 0,
  lng: 0,
  heading: 0,
  speed: 3000,

  fuel: TANK_CAPACITY,
  fuelPrevLat: 0,
  fuelPrevLng: 0,

  keys: {},

  gameStarted: false,
  gameOver: false,
  paused: false,

  levelId: null,
  levelIndex: 0,

  route: [],
  routeIndex: 0,
  currentTarget: null
};

const entities = {
  targets: []
};

/* ========= UI ELEMENTS ========= */

let hudLevelEl = null;
let spdEl = null;
let targetsEl = null;

let introEl = null;
let endScreenEl = null;

let endRankEl = null;
let endScoreEl = null;

let levelSelectEl = null;
let startBtn = null;

/* ========= PLANE + BASE MARKERS ========= */

let planeIcon = null;
let planeMarker = null;
let baseMarker = null;

