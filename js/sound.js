/* ========= SOUND ========= */

const sounds = {
  missile_lock: new Audio("assets/sounds/missile_lock.wav"),
  release_bomb: new Audio("assets/sounds/release_bomb.wav"),
  explode: new Audio("assets/sounds/explode.wav"),
  stealth: new Audio("assets/sounds/stealth.wav"),
  fuel: new Audio("assets/sounds/fuel.wav"),
  rocket_launch: new Audio("assets/sounds/rocket_launch.wav"),
  victory: new Audio("assets/sounds/victory.wav"),
  defeat: new Audio("assets/sounds/defeat.wav"),
  hit: new Audio("assets/sounds/hit.wav"),
  destroyed: new Audio("assets/sounds/destroyed.wav"),
  key_arrow: new Audio("assets/sounds/key_arrow.wav"),
  clicked: new Audio("assets/sounds/clicked.wav"),
};

const V = {
  ui: 0.95,
  ui_clicked: 0.55,
  fx: 0.65,
  impact: 0.75,
  state: 0.5,
  end: 0.85,
};

sounds.key_arrow.volume = V.ui;
sounds.clicked.volume   = V.ui_clicked;

sounds.missile_lock.volume  = V.fx;
sounds.release_bomb.volume  = V.fx;
sounds.rocket_launch.volume = V.fx;
sounds.hit.volume           = V.fx;

sounds.explode.volume   = V.impact;
sounds.destroyed.volume = V.impact;

sounds.stealth.volume = V.state;
sounds.fuel.volume    = V.state;

sounds.victory.volume = V.end;
sounds.defeat.volume  = V.end;

function playSound(name) {
  if (!soundEnabled) return;

  const s = sounds[name];
  if (!s) return;

  try {
    s.pause();
    s.currentTime = 0;
    s.play().catch(() => {});
  } catch {}
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
    for (const s of Object.values(sounds)) {
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

  for (const s of Object.values(sounds)) {

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
