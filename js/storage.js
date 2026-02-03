/* ======== Levels Memory ======== */
const STORAGE_KEY = "flight_game_progress_v1";
const SOUND_KEY = "flight_game_sound";
let soundEnabled = localStorage.getItem(SOUND_KEY) !== "off";

function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.removeItem("lastPlayedLevel");
    return {
      unlockedCount: 1,
      scores: {}
    };
  }
  return JSON.parse(raw);
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

let progress = loadProgress();
