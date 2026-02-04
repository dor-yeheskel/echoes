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
  // TODO: Add zoom here.
  accel: 2500,
  radarRangeOnMinimap: 4500,
  turnRate: 140,
  emojiRotationOffset: -45,
};
