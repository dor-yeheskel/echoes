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


/* ======== City Markers Memory (preloaded) ======== */
function loadCityMarkersCache() {
  try {
    const raw = localStorage.getItem(CITY_MARKERS.CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (!parsed || parsed.v !== CITY_MARKERS.CACHE_SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.items)) return null;

    // items are stored as compact arrays:
    // [lat, lng, pop, cityName, countryName]
    return parsed.items;
  } catch (e) {
    return null;
  }
}

function saveCityMarkersCache(items) {
  try {
    const payload = {
      v: CITY_MARKERS.CACHE_SCHEMA_VERSION,
      t: Date.now(),
      items
    };
    localStorage.setItem(CITY_MARKERS.CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    // localStorage might be full; in that case we just won't cache.
  }
}
