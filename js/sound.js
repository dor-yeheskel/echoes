/* ========= SOUND ========= */
const sounds = {
  clicked: new Audio("assets/sounds/clicked.wav"),
  key_arrow: new Audio("assets/sounds/key_arrow.wav"),
  reached: new Audio("assets/sounds/reached.wav"),
  defeat: new Audio("assets/sounds/defeat.wav"),
};

const V = {
  ui: 0.95,
  ui_clicked: 0.55,
  fx: 0.65,
  impact: 0.75,
  state: 0.5,
  end: 0.85,
  city: 0.6,
};

const CITY_TRACK_PLAY_MS = 3500;

sounds.key_arrow.volume = V.ui;
sounds.clicked.volume   = V.ui_clicked;

sounds.defeat.volume  = V.end;

// ===== CITY TRACKS (city,country -> Audio) =====
// Keys are normalized as "city|country" in lowercase.
// You can extend or override this map per your assets.
const CITY_TRACKS = {
  // Level 1: Euro Trip
  "london|united kingdom": new Audio("assets/sounds/cities/london.wav"),
  "paris|france": new Audio("assets/sounds/cities/paris.wav"),
  "berlin|germany": new Audio("assets/sounds/cities/berlin.wav"),
  "barcelona|spain": new Audio("assets/sounds/cities/barcelona.wav"),

  // Level 2: Mediterranean Sea
  "rome|italy": new Audio("assets/sounds/cities/rome.wav"),
  "athens|greece": new Audio("assets/sounds/cities/athens.wav"),
  "istanbul|turkey": new Audio("assets/sounds/cities/istanbul.wav"),
  "cairo|egypt": new Audio("assets/sounds/cities/cairo.wav"),

  // Level 3: Middle East
  "mecca|saudi arabia": new Audio("assets/sounds/cities/mecca.wav"),
  "baghdad|iraq": new Audio("assets/sounds/cities/baghdad.wav"),
  "tehran|iran": new Audio("assets/sounds/cities/tehran.wav"),
  "dubai|united arab emirates": new Audio("assets/sounds/cities/dubai.wav"),

  // Level 4: South Asia
  "karachi|pakistan": new Audio("assets/sounds/cities/karachi.wav"),
  "kathmandu|nepal": new Audio("assets/sounds/cities/kathmandu.wav"),
  "mumbai|india": new Audio("assets/sounds/cities/mumbai.wav"),
  "delhi|india": new Audio("assets/sounds/cities/delhi.wav"),
  "kolkāta|india": new Audio("assets/sounds/cities/kolkata.wav"),

  // Level 5: South East Asia
  "rangoon|myanmar": new Audio("assets/sounds/cities/rangoon.wav"),
  "bangkok|thailand": new Audio("assets/sounds/cities/bangkok.wav"),
  "manila|philippines": new Audio("assets/sounds/cities/manila.wav"),
  "ho chi minh city|vietnam": new Audio("assets/sounds/cities/ho-chi-minh-city.wav"),
  "hanoi|vietnam": new Audio("assets/sounds/cities/hanoi.wav"),

  // Level 6: The East
  "hong kong|china": new Audio("assets/sounds/cities/hong-kong.wav"),
  "shenzhen|china": new Audio("assets/sounds/cities/shenzhen.wav"),
  "shanghai|china": new Audio("assets/sounds/cities/shanghai.wav"),
  "beijing|china": new Audio("assets/sounds/cities/beijing.wav"),
  "chengdu|china": new Audio("assets/sounds/cities/chengdu.wav"),
  "seoul|south korea": new Audio("assets/sounds/cities/seoul.wav"),
  "tokyo|japan": new Audio("assets/sounds/cities/tokyo.wav"),

  // Level 7: Africa Crossing
  "addis ababa|ethiopia": new Audio("assets/sounds/cities/addis-ababa.wav"),
  "nairobi|kenya": new Audio("assets/sounds/cities/nairobi.wav"),
  "dar es salaam|tanzania": new Audio("assets/sounds/cities/dar-es-salaam.wav"),
  "cape town|south africa": new Audio("assets/sounds/cities/cape-town.wav"),

  // Level 8: The New World
  "new york|united states": new Audio("assets/sounds/cities/new-york.wav"),

  // Level 9: America Crossing
  "miami|united states": new Audio("assets/sounds/cities/miami.wav"),
  "havana|cuba": new Audio("assets/sounds/cities/havana.wav"),
  "mexico city|mexico": new Audio("assets/sounds/cities/mexico-city.wav"),
  "panama city|panama": new Audio("assets/sounds/cities/panama-city.wav"),
  "lima|peru": new Audio("assets/sounds/cities/lima.wav"),
  "rio de janeiro|brazil": new Audio("assets/sounds/cities/rio-de-janeiro.wav"),
  "buenos aires|argentina": new Audio("assets/sounds/cities/buenos-aires.wav"),
};


for (const a of Object.values(CITY_TRACKS)) {
  try { a.volume = V.city; a.loop = false; } catch {}
}


function _cityKey(city, country) {
  const c1 = (city || "").trim().toLowerCase();
  const c2 = (country || "").trim().toLowerCase();
  return `${c1}|${c2}`;
}

let currentCityAudio = null;
let currentCityKey = null;
let cityTrackTimeoutId = null;

function _clearCityTrackTimeout() {
  if (cityTrackTimeoutId !== null) {
    clearTimeout(cityTrackTimeoutId);
    cityTrackTimeoutId = null;
  }
}

function _ensureBaseVolume(a) {
  if (typeof a._baseVolume !== "number" || !isFinite(a._baseVolume)) {
    a._baseVolume = isFinite(a.volume) ? a.volume : 1;
  }
}

function _fadeOutAudio(a, { duration = 700 } = {}) {
  if (!a) return;
  _ensureBaseVolume(a);
  if (a._fading) return;
  a._fading = true;
  const start = performance.now();
  const base = a._baseVolume;
  function step(t) {
    const p = Math.min(1, (t - start) / duration);
    a.volume = base * (1 - p);
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      try { a.pause(); } catch {}
      a.currentTime = 0;
      a.volume = base;
      a._fading = false;
    }
  }
  requestAnimationFrame(step);
}

function playCityTrack(city, country) {
  if (!soundEnabled) return;
  const key = _cityKey(city, country);
  const a = CITY_TRACKS[key];
  if (!a) return;

  try {
    _clearCityTrackTimeout();
    _ensureBaseVolume(a);
    if (currentCityAudio && currentCityAudio !== a) {
      _fadeOutAudio(currentCityAudio, { duration: 600 });
    }
    currentCityAudio = a;
    currentCityKey = key;
    a.pause();
    a.currentTime = 0;
    a.volume = a._baseVolume;
    a.play().catch(() => {});
    cityTrackTimeoutId = setTimeout(() => {
      if (currentCityAudio === a && currentCityKey === key) {
        _fadeOutAudio(a, { duration: 600 });
      }
    }, CITY_TRACK_PLAY_MS);
  } catch {}
}

function getAllAudios() {
  return [
    ...Object.values(sounds),
    ...Object.values(CITY_TRACKS)
  ];
}

function playSound(name) {
  if (!soundEnabled) return Promise.resolve(false);

  const s = sounds[name];
  if (!s) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      try { s.removeEventListener('ended', onEnded); } catch {}
      try { s.removeEventListener('error', onError); } catch {}
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const settle = (ok) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(!!ok);
    };

    const onEnded = () => settle(true);
    const onError = () => settle(false);

    try {
      s.addEventListener('ended', onEnded);
      s.addEventListener('error', onError);

      // Fallback: if audio is interrupted (pause/stop) we still want to unblock.
      const dur = Number.isFinite(s.duration) && s.duration > 0 ? s.duration : 1.2;
      timeoutId = setTimeout(() => settle(true), Math.ceil(dur * 1000) + 50);

      s.pause();
      s.currentTime = 0;
      const p = s.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => settle(false));
      }
    } catch {
      settle(false);
    }
  });
}

let muteBtn = null;

function updateMuteUI() {
  if (!muteBtn) return;
  muteBtn.textContent = soundEnabled ? "🔊" : "🔇";
}

function toggleMute() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
  if (!soundEnabled) {
    for (const s of getAllAudios()) {
      s.pause();
      s.currentTime = 0;
    }
  }
  updateMuteUI();
}


function togglePause() {
  if (currentState !== GAME_STATE.PLAYING) return;
  state.paused = !state.paused;
  const overlay = document.getElementById("pauseOverlay");
  if (overlay) {
    overlay.innerHTML = "⏸ PAUSED";
    overlay.style.display = state.paused ? "flex" : "none";
  }
}

function stopAllSounds({ fade = false, duration = 1200 } = {}) {
  const now = performance.now();

  for (const s of getAllAudios()) {

    // ensure base volume
    if (typeof s._baseVolume !== "number" || !isFinite(s._baseVolume)) {
      s._baseVolume = isFinite(s.volume) ? s.volume : 1;
    }

    // not playing → just reset
    if (s.paused || s.ended || s.currentTime === 0) {
      s.pause();
      s.currentTime = 0;
      s.volume = s._baseVolume;
      s._fading = false;
      continue;
    }

    if (!fade) {
      s.pause();
      s.currentTime = 0;
      s.volume = s._baseVolume;
      s._fading = false;
      continue;
    }

    if (s._fading) continue;
    s._fading = true;

    const start = now;
    const base = s._baseVolume;

    function step(t) {
      const p = Math.min(1, (t - start) / duration);
      s.volume = base * (1 - p);

      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        s.pause();
        s.currentTime = 0;
        s.volume = base;
        s._fading = false;
      }
    }

    requestAnimationFrame(step);
  }
}
