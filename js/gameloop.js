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


  if (
    state.gameStarted &&
    !state.gameOver &&
    entities.remainingTargets === 0 &&
    entities.targets.length > 0
  ) {
    endLevel();
  }

  if (state.gameStarted && !state.gameOver) {

    const prevPos = {
      lat: Number.isFinite(state.fuelPrevLat) ? state.fuelPrevLat : state.lat,
      lng: Number.isFinite(state.fuelPrevLng) ? state.fuelPrevLng : state.lng
    };

    // steering
    if (state.keys["ArrowLeft"])  state.heading -= CONFIG_DEFAULTS.turnRate * dt;
    if (state.keys["ArrowRight"]) state.heading += CONFIG_DEFAULTS.turnRate * dt;
    if (state.keys["ArrowUp"])    state.speed += CONFIG_DEFAULTS.accel * dt;
    if (state.keys["ArrowDown"])  state.speed -= CONFIG_DEFAULTS.accel * dt;

    state.speed = Math.max(CONFIG_DEFAULTS.minSpeed, Math.min(CONFIG_DEFAULTS.maxSpeed, state.speed));

    const pos = move(state.lat, state.lng, state.heading, (state.speed / 3.6) * dt);
    state.lat = pos.lat;
    state.lng = pos.lng;

    const movedKm = distance(prevPos, state) / 1000;
    if (Number.isFinite(movedKm) && movedKm > 0) {
      state.fuel = Math.max(0, state.fuel - movedKm * FUEL_PER_KM);
    }
    state.fuelPrevLat = state.lat;
    state.fuelPrevLng = state.lng;

    if (state.fuel <= 0) {
      crash();
      requestAnimationFrame(loop);
      return;
    }
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
    

    // Free-order: check proximity against any unfinished target
    if (!state.gameOver && entities.targets && entities.targets.length) {
      for (const t of entities.targets) {
        if (t.completed) continue;
        const d = distance(state, t);
        const radius = Number.isFinite(t.arrivalRadius)
          ? t.arrivalRadius
          : CONFIG_DEFAULTS.arrivalRadius;
        if (d <= radius) {
          t.completed = true;
          if (typeof entities.remainingTargets === 'number' && entities.remainingTargets > 0) {
            entities.remainingTargets--;
          }

          onCityArrival(t);

          if (typeof markDestinationCityReached === "function") {
            try { markDestinationCityReached(t); } catch {}
          }

          if (t.city && t.country && typeof playCityTrack === 'function') {
            Promise.resolve(playSound("reached")).then(() => {
              playCityTrack(t.city, t.country);
            });
          }
          renderRouteHUD();
        }
      }
    }

    const planeEl = document.getElementById("plane");
    if (planeEl) {
      planeEl.style.transform =
        `rotate(${state.heading + CONFIG_DEFAULTS.emojiRotationOffset}deg)`;

    }

    updateCityHUD();
    updateFuelHUD();
  }

  requestAnimationFrame(loop);
}


function onCityArrival(cityTarget) {
  if (!cityTarget) return;
  const base = Math.max(state.fuel, REFUEL_FLOOR);
  state.fuel = Math.min(TANK_CAPACITY, base + REFUEL_BONUS);
}

