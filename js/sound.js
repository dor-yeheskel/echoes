/* ========= SOUND ========= */

const sounds = {
  clicked: new Audio("assets/sounds/clicked.wav"),
  victory: new Audio("assets/sounds/victory.wav"),
  defeat: new Audio("assets/sounds/defeat.wav"),
  destroyed: new Audio("assets/sounds/destroyed.wav"),
  key_arrow: new Audio("assets/sounds/key_arrow.wav"),
  fuel: new Audio("assets/sounds/fuel.wav"),
  erase: new Audio("assets/sounds/erase.wav"),
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

sounds.key_arrow.volume = V.ui;
sounds.clicked.volume   = V.ui_clicked;

sounds.fuel.volume    = V.state;

sounds.victory.volume = V.end;
sounds.defeat.volume  = V.end;

// ===== CITY TRACKS (city,country -> Audio) =====
// Keys are normalized as "city|country" in lowercase.
// You can extend or override this map per your assets.
const CITY_TRACKS = {
  // TEST_LEVEL
  // "london|united kingdom": new Audio("assets/sounds/cities/london.wav"),
  "paris|france": new Audio("assets/sounds/victory.wav"),
  "berlin|germany": new Audio("assets/sounds/victory.wav"),
  "barcelona|spain": new Audio("assets/sounds/victory.wav"),
  // TEST_LEVEL_2
  // "tel aviv-yafo|israel": new Audio("assets/sounds/cities/tel-aviv-yafo.wav"),
  // "dubai|united arab emirates": new Audio("assets/sounds/cities/dubai.wav"),
  // "cairo|egypt": new Audio("assets/sounds/cities/cairo.wav"),
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
