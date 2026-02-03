/* ========= GAME LOOP (logic preserved) ========= */
// ===== DEBUG =====
const DEBUG_COORDS = false;
const DEBUG_COORDS_INTERVAL = 0.1; // seconds
let _debugCoordsTimer = 0;
// =================


let last = performance.now();

function loop(t) {
  if (state.paused) {
    requestAnimationFrame(loop);
    return;
  }

  if (!state.gameStarted || state.gameOver) {
    requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min(0.05, (t - last) / 1000);
  state.gameTime += dt;
  last = t;

  // ===== NO BOMBS (AND NONE IN AIR) + NO BASE + TARGETS LEFT => FAIL =====
  if (
    !state.gameOver &&
    state.bombs <= 0 &&
    entities.bombs.length === 0 && // <-- CRITICAL FIX
    !state.hasBase &&
    entities.remainingTargets > 0
  ) {
    state.gameOver = true;

    endScreenTimeout = setTimeout(() => {
      gameOverHandler();
    }, 800);

    requestAnimationFrame(loop);
    return;
  }


  if (
    state.gameStarted &&
    !state.gameOver &&
    entities.remainingTargets === 0 &&
    entities.targets.length > 0
  ) {
    victoryHandler();
  }
  if (state.gameStarted && !state.gameOver) {
    if (isNight) {
      drawNight();
    }

    // steering
    if (state.keys["ArrowLeft"])  state.heading -= CONFIG_DEFAULTS.turnRate * dt;
    if (state.keys["ArrowRight"]) state.heading += CONFIG_DEFAULTS.turnRate * dt;
    if (state.keys["ArrowUp"])    state.speed += CONFIG_DEFAULTS.accel * dt;
    if (state.keys["ArrowDown"])  state.speed -= CONFIG_DEFAULTS.accel * dt;

    state.speed = Math.max(CONFIG_DEFAULTS.minSpeed, Math.min(CONFIG_DEFAULTS.maxSpeed, state.speed));

    const pos = move(state.lat, state.lng, state.heading, (state.speed / 3.6) * dt);
    state.lat = pos.lat;
    state.lng = pos.lng;
    if (DEBUG_COORDS) {
      _debugCoordsTimer += dt;
      if (_debugCoordsTimer >= DEBUG_COORDS_INTERVAL) {
        _debugCoordsTimer = 0;
        console.log(
          `[PLANE] lat=${state.lat.toFixed(6)}, lng=${state.lng.toFixed(6)}, heading=${state.heading.toFixed(1)}`
        );
      }
    }
    planeMarker.setLatLng(pos);
    map.setView(pos, map.getZoom(), { animate: false });

    const planeEl = document.getElementById("plane");
    if (planeEl) {
      planeEl.style.transform =
        `rotate(${state.heading + CONFIG_DEFAULTS.emojiRotationOffset}deg)`;

      planeEl.classList.toggle("stealth", state.stealthActive);
      planeEl.classList.toggle("night", isNight);
    }


    const impact = getBombImpactPoint();
    aimMarker.setLatLng([impact.lat, impact.lng]);

    // resupply at base
    if (state.hasBase && distance(state, state.base) < state.baseRadius) {
      if (!state.refueled) {
        state.bombs = state.maxBombs;
        state.stealthUses = state.maxStealth;
        state.refueled = true;
        playSound("fuel");
      }
    } else {
      state.refueled = false;
    }

    // stealth timer
    if (state.stealthActive) {
      state.stealthTimer -= dt;
      if (state.stealthTimer <= 0) state.stealthActive = false;
    }

// bombs movement
for (let i = entities.bombs.length - 1; i >= 0; i--) {
  const b = entities.bombs[i];

  const v0 = b.speed; // km/h
  const v1 = v0 - CONFIG_DEFAULTS.accel * dt; // km/h

  // if bomb "stops" during this frame, move it exactly until impact and explode
  if (v1 <= 0) {
    const timeToZero = v0 / CONFIG_DEFAULTS.accel; // seconds
    const dist = 0.5 * (v0 / 3.6) * timeToZero;   // meters

    const pImpact = move(b.lat, b.lng, b.heading, dist);
    b.lat = pImpact.lat;
    b.lng = pImpact.lng;
    b.marker.setLatLng(pImpact);

    explodeBomb(b);
    entities.bombs.splice(i, 1);
    continue;
  }

  // otherwise move by average speed over dt (more accurate than Euler)
  const vAvg = 0.5 * (v0 + v1); // km/h
  const dist = (vAvg / 3.6) * dt; // meters

  const p = move(b.lat, b.lng, b.heading, dist);
  b.lat = p.lat;
  b.lng = p.lng;
  b.marker.setLatLng(p);

  b.speed = v1;
}


    // radars firing
    let underThreat = false;
    for (const r of entities.radars) {
      if (!r.alive) continue;

      const d = distance(state, r);

      // --- THREAT:
      if (d < r.range) {
        underThreat = true;
      }

      // --- FIRING:
      if (!state.stealthActive && d < r.range && r.cooldown <= 0) {
        launchMissile(r);
        r.cooldown = Math.max(0.1, r.rocketFreq);
        continue; 
      }

      // --- cooldown stealth ---
      if (!state.stealthActive) {
        r.cooldown -= dt;
      }
    }

    setThreat(underThreat);

    // missiles movement
    for (let i = entities.missiles.length - 1; i >= 0; i--) {
      const m = entities.missiles[i];

      m.life -= dt;
      if (m.life <= 0) {
        explosionEffect(m.lat, m.lng);
        layerMissiles.removeLayer(m.marker);
        entities.missiles.splice(i, 1);
        continue;
      }

      const d = distance(m, state);

      if (m.smart && !m.lockBeeped && d < CONFIG_DEFAULTS.lockBeepDistance &&
          (state.gameTime - state.lastLockBeep) > CONFIG_DEFAULTS.lockBeepCooldown) {
        playSound("missile_lock");
        m.lockBeeped = true;
        state.lastLockBeep = state.gameTime;
      }

      if (d < CONFIG_DEFAULTS.missileHitRadius) {
        explosionEffect(m.lat, m.lng);
        if (isNight) {
          drawNight();
        }
        if (!state.gameOver) {
          state.gameOver = true;
          playSound("defeat");
          endScreenTimeout = setTimeout(() => {
            gameOverHandler();
          }, 800);
        }

        break;
      }


      if (m.smart && !m.lockLost) {
        m.heading = bearing(m.lat, m.lng, state.lat, state.lng);
      }
      const p = move(m.lat, m.lng, m.heading, (m.speed / 3.6) * dt);
      m.lat = p.lat;
      m.lng = p.lng;
      m.marker.setLatLng(p);

      const el = m.marker.getElement();
      if (el) {
        const inner = el.querySelector(".missile");
        if (inner) inner.style.transform = `rotate(${m.heading + CONFIG_DEFAULTS.missileRotationOffset}deg)`;
      }
    }

    updateHUD();
    drawRadar();
  }

  requestAnimationFrame(loop);
}
