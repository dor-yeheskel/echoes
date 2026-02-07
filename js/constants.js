/* ========= GAME STATES ========= */
const GAME_STATE = {
  MENU: "menu",
  PLAYING: "playing",
  GAMEOVER: "gameover"
};

/* ========= CONSTANTS (defaults preserved) ========= */
const CONFIG_DEFAULTS = {
  baseRadius: 400, // meters
  minSpeed: 600000,
  maxSpeed: 900000,  // 5000?
  // TODO: Add zoom here.
  accel: 10000,
  radarRangeOnMinimap: 4500,
  turnRate: 140,
  emojiRotationOffset: -45,
};

/* ========= CITY MARKERS (CONFIG) ========= */
const CITY_MARKERS = {
  DATA_URL: "https://cdn.jsdelivr.net/npm/world-cities-json@1.0.1/data/cities.json",

 // population rules
  MIN_POPULATION: 800_000,
  INCLUDE_CAPITALS: true,

  // radius rule (meters)
  LEVEL_RADIUS_M: 2_000_000,

  CITY_HUD_RADIUS_M: 25_000,  // radius for showing city name on hover (meters)

  BIG_CITY_POPULATION: 3_000_000,
  MEDIUM_CITY_POPULATION: 1_000_000,
  
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
  CACHE_SCHEMA_VERSION: 2
};
