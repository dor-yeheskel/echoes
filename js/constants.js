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
