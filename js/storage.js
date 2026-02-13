/* ======== Levels Memory ======== */
const STORAGE_KEY = "flight_game_progress_v1";
const SOUND_KEY = "flight_game_sound";
let soundEnabled = localStorage.getItem(SOUND_KEY) !== "off";
let progress = loadProgress();


function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.removeItem("lastPlayedLevel");
    return {
      unlockedCount: 1,
      completedLevels: []
    };
  }
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.completedLevels)) {
    parsed.completedLevels = [];
    parsed.unlockedCount = 1;
  }
  return parsed;
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function resetAllStorage({ reload = true } = {}) {
  localStorage.clear();
  sessionStorage.clear();

  soundEnabled = true;
  progress = {
    unlockedCount: 1,
    completedLevels: []
  };

  if (reload) location.reload();
}

function resetGameStorage({ reload = true } = {}) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SOUND_KEY);
  localStorage.removeItem("lastPlayedLevel");
  localStorage.removeItem(CITY_MARKERS.CACHE_KEY);
  sessionStorage.clear();

  soundEnabled = true;
  progress = {
    unlockedCount: 1,
    completedLevels: []
  };

  if (reload) location.reload();
}

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
    // Normalize to compact arrays for compatibility with older versions:
    const compact = items.map(it => {
      if (Array.isArray(it)) return it;
      const name = it.name ?? it.city ?? "";
      return [Number(it.lat), Number(it.lng), Number(it.pop ?? 0), name, it.country ?? ""];
    });

    const payload = {
      v: CITY_MARKERS.CACHE_SCHEMA_VERSION,
      t: Date.now(),
      items: compact
    };
    localStorage.setItem(CITY_MARKERS.CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    // localStorage might be full; in that case we just won't cache.
  }
}
