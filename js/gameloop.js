/* ========= GAME LOOP (logic preserved) ========= */
// ===== DEBUG =====
const DEBUG_COORDS = false;
const DEBUG_COORDS_INTERVAL = 0.1; // seconds
let _debugCoordsTimer = 0;
// =================

let last = performance.now();

function loop(t) {
  updateJetSound();
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
    !state.isExploreMode &&
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

    // Polar boundary: clamp latitude and reflect heading away from pole
    if (state.lat > POLAR_LAT_LIMIT) {
      state.lat = POLAR_LAT_LIMIT;
      pos.lat = POLAR_LAT_LIMIT;
      const normH = ((state.heading % 360) + 360) % 360;
      if (normH < 90 || normH > 270) {
        state.heading = 180 - state.heading;
      }
    } else if (state.lat < -POLAR_LAT_LIMIT) {
      state.lat = -POLAR_LAT_LIMIT;
      pos.lat = -POLAR_LAT_LIMIT;
      const normH = ((state.heading % 360) + 360) % 360;
      if (normH > 90 && normH < 270) {
        state.heading = 180 - state.heading;
      }
    }

    state.fuelPrevLat = state.lat;
    state.fuelPrevLng = state.lng;

    if (!state.isExploreMode) {
      const movedKm = distance(prevPos, state) / 1000;
      const inFuelGracePeriod = state.gameTime < FUEL_GRACE_SECONDS;
      if (!inFuelGracePeriod && Number.isFinite(movedKm) && movedKm > 0) {
        state.fuel = Math.max(0, state.fuel - movedKm * fuelPerKm);
      }

      if (state.fuel <= 0) {
        crash();
        requestAnimationFrame(loop);
        return;
      }
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
    updateMinimap(pos.lat, pos.lng, state.heading);
    

    // Free-order: check proximity against any unfinished target
    if (!state.gameOver && entities.targets && entities.targets.length) {
      for (const t of entities.targets) {
        if (t.completed) {
          // Replay sound when re-entering a completed target's radius
          const dc = distance(state, t);
          const rc = Number.isFinite(t.arrivalRadius)
            ? t.arrivalRadius
            : CONFIG_DEFAULTS.arrivalRadius;
          const inRadius = dc <= rc;
          if (inRadius && !t.inRadius) {
            t.inRadius = true;
            if (t.city && t.country && typeof playCityTrack === 'function') {
              playSound("reached");
              playCityTrack(t.city, t.country);
            }
          } else if (!inRadius && t.inRadius) {
            t.inRadius = false;
          }
          continue;
        }
        const d = distance(state, t);
        const radius = Number.isFinite(t.arrivalRadius)
          ? t.arrivalRadius
          : CONFIG_DEFAULTS.arrivalRadius;
        if (d <= radius) {
          t.completed = true;
          t.inRadius = true;
          if (typeof entities.remainingTargets === 'number' && entities.remainingTargets > 0) {
            entities.remainingTargets--;
          }

          const isFinalTarget = entities.remainingTargets === 0;
          onCityArrival(t, { isFinalTarget });

          if (typeof markDestinationCityReached === "function") {
            try { markDestinationCityReached(t); } catch {}
          }

          if (!state.isExploreMode && t.city && t.country) {
            revealMinimapTarget(t.city, t.country, t.lat, t.lng);
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

    // Explore mode: check music city proximity
    if (state.isExploreMode && state.exploreMusicCities && state.exploreMusicCities.length) {
      for (const mc of state.exploreMusicCities) {
        const d = distance(state, mc);
        const inRadius = d <= EXPLORE_MODE.MUSIC_ARRIVAL_RADIUS;

        if (inRadius && !mc.inRadius) {
          mc.inRadius = true;

          // Track consecutive visits to the same city (easter egg)
          const mcKey = `${mc.city}|${mc.country}`;
          if (state._exploreLastVisitKey === mcKey) {
            state._exploreStrikeCount = (state._exploreStrikeCount || 0) + 1;
          } else {
            state._exploreLastVisitKey = mcKey;
            state._exploreStrikeCount = 1;
          }
          const isStrike = state._exploreStrikeCount === 4;
          if (isStrike) {
            spawnStrikeEcho(mc.lat, nearestLng(mc.lng, state.lng));
            state._exploreStrikeCount = 0;
          }

          // Always play music on every encounter
          playSound("reached");
          playCityTrack(mc.city, mc.country, isStrike ? { playbackRate: 2 } : undefined);

          if (!mc.discovered) {
            mc.discovered = true;
            spawnArrivalPulse(mc.lat, nearestLng(mc.lng, state.lng));
            markExploreMusicVisited(mc.city, mc.country);
            markMinimapCityDiscovered(mc.city, mc.country);
            state.exploreDiscoveredSet.add(`${mc.city}|${mc.country}`);
          }

          // Always update visited list on every entry
          const idx = state.exploreVisited.findIndex(
            v => v.city === mc.city && v.country === mc.country
          );
          if (idx !== -1) state.exploreVisited.splice(idx, 1);
          state.exploreVisited.unshift({ city: mc.city, country: mc.country });
          if (state.exploreVisited.length > EXPLORE_MODE.MAX_VISITED_DISPLAY) {
            state.exploreVisited.length = EXPLORE_MODE.MAX_VISITED_DISPLAY;
          }

          renderExploreHUD();
        } else if (!inRadius && mc.inRadius) {
          mc.inRadius = false;
        }
      }
    }

    const planeEl = document.getElementById("plane");
    if (planeEl) {
      planeEl.style.transform =
        `rotate(${state.heading + CONFIG_DEFAULTS.emojiRotationOffset}deg)`;

    }

    updateCityHUD();
    if (!state.isExploreMode) {
      updateFuelHUD();
    }
    if (state.isExploreMode) {
      cullCityMarkersToViewport();
      repositionExploreMusicMarkers();
    }
  }

  requestAnimationFrame(loop);
}


function onCityArrival(cityTarget, opts = {}) {
  if (!cityTarget) return;
  if (opts.isFinalTarget) return;
  const base = Math.max(state.fuel, REFUEL_FLOOR);
  state.fuel = Math.min(TANK_CAPACITY, base + REFUEL_BONUS);
}

