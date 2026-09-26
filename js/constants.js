/* ========= GAME STATES ========= */
const GAME_STATE = {
  MENU: "menu",
  PLAYING: "playing",
  GAMEOVER: "gameover"
};

/* ========= POLAR BOUNDARY ========= */
const POLAR_LAT_LIMIT = 75; // keep viewport away from tile edge (~85°)

/* ========= CONSTANTS (defaults preserved) ========= */
const CONFIG_DEFAULTS = {
  minSpeed: 600_000,
  maxSpeed: 600_000,
  accel: 0, // no acceleration, only instant speed changes

  turnRate: 140, // optimal
  emojiRotationOffset: -45,  // optimal

  // Default radius for counting a destination as reached (meters)
  arrivalRadius: 35_000,

  zoom: 7
};

/* ========= FUEL SYSTEM ========= */
// Units: fuel points and km. Tune values together.
const TANK_CAPACITY = 100;
const FUEL_PER_KM = 0.02;
const FUEL_GRACE_SECONDS = 1;
const REFUEL_FLOOR = 50;
const REFUEL_BONUS = 12;

/* ========= CITY MARKERS (CONFIG) ========= */
const CITY_MARKERS = {
  DATA_URL: "https://cdn.jsdelivr.net/npm/world-cities-json@1.0.1/data/cities.json",

  // population rules
  MIN_POPULATION: 400_000,
  INCLUDE_CAPITALS: true,

  // radius rule (meters)
  LEVEL_RADIUS_M: 4_000_000,  // 4_500_000 not enoght for Africa cross

  CITY_HUD_RADIUS_M: 30_000,  // radius for showing city name on hover (meters)

  BIG_CITY_POPULATION: 1_000_000_000,// 3_000_000,
  MEDIUM_CITY_POPULATION: 1_000_000_000,// 1_000_000,
  
  // emoji sizes by population
  SIZE_PX: {
    small: 18,   // < 1M
    medium: 24,  // 1M – 3M
    big: 32      // 3M+
  },
  
  // emoji visual offset per size (px)
  OFFSET_PX: {
    small:  { x: -10,  y: -20 },
    medium: { x: -8,  y: -12 },
    big:    { x: -30, y: -30 }
  },


  CACHE_KEY: "echoes_city_markers_v4",
  CACHE_SCHEMA_VERSION: 4
};

/* ========= RUNTIME OVERRIDES (PER LEVEL) ========= */
let fuelPerKm = FUEL_PER_KM;

function _cloneCityMarkersConfig() {
  return {
    ...CITY_MARKERS,
    SIZE_PX: { ...CITY_MARKERS.SIZE_PX },
    OFFSET_PX: {
      small: { ...CITY_MARKERS.OFFSET_PX.small },
      medium: { ...CITY_MARKERS.OFFSET_PX.medium },
      big: { ...CITY_MARKERS.OFFSET_PX.big }
    }
  };
}

let cityMarkersConfig = _cloneCityMarkersConfig();

function resetRuntimeConfig() {
  fuelPerKm = FUEL_PER_KM;
  cityMarkersConfig = _cloneCityMarkersConfig();
}

/* ========= EXPLORE MODE ========= */
const EXPLORE_MODE = {
  MIN_POPULATION: 400_000,
  MAX_VISITED_DISPLAY: 3,
  START: {
    lat: 43.2965,   // Marseille, France
    lng: 5.3698,
    heading: 95      // towards Rome
  },
  MUSIC_ARRIVAL_RADIUS: 35_000,

  MINIMAP: {
    WIDTH: 260,        // px
    HEIGHT: 180,       // px
    ZOOM: 2,           // world overview zoom
  },
};
