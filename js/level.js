/* ========= LEVEL LOADING ========= */
async function loadLevels() {
    const index = await fetch("assets/levels/index.json").then(r => r.json());

    window.LEVELS = {};

    for (const id of index.levels) {
      const level = await fetch(`assets/levels/${id}.json`).then(r => r.json());
      window.LEVELS[id] = level;
    }
}


function resolveCityRef(ref) {
  if (window.cityIndex.size === 0) {
    throw new Error("cityIndex is empty");
  }
  const key = `${ref.city}|${ref.country}`;
  const city = window.cityIndex.get(key);
  if (!city) {
    console.log(`Candidate cities in ${ref.country}:`);
    for (const [k, v] of window.cityIndex.entries()) {
      if (k.endsWith(`|${ref.country}`)) {
        console.log(`  - ${k}`);
      }
    }
    throw new Error(`City not found: ${key}`);
  }
  return city;
}


function resetLayersAndEntities() {
  layerTargets.clearLayers();
  layerFx.clearLayers();

  entities.targets = [];
  entities.remainingTargets = 0;
  state.keys = {};
}


function applyLevelConfig(levelId) {
  const lvl = levelToData[levelId];

  resetRuntimeConfig();
  const cfg = lvl?.config;
  if (cfg?.cityMarkers) {
    const cm = cfg.cityMarkers;
    if (Number.isFinite(cm.LEVEL_RADIUS_M)) {
      cityMarkersConfig.LEVEL_RADIUS_M = cm.LEVEL_RADIUS_M;
    }
    if (Number.isFinite(cm.MIN_POPULATION)) {
      cityMarkersConfig.MIN_POPULATION = cm.MIN_POPULATION;
    }
  }
  if (Number.isFinite(cfg?.FUEL_PER_KM)) {
    fuelPerKm = cfg.FUEL_PER_KM;
  }

  state.levelId = levelId;
  state.levelIndex = levelOrder.indexOf(levelId);

  let startLatLng;

  if (lvl.start.city) {
    const city = resolveCityRef(lvl.start);
    startLatLng = city;
  } else {
    startLatLng = lvl.start;
  }
  state.lat = startLatLng.lat;
  state.lng = startLatLng.lng;

  state.heading = lvl.start.heading;

  state.speed = CONFIG_DEFAULTS.minSpeed;

  // ===== Echoes route =====
  state.route = lvl.route || [];
  state.routeIndex = 0;
  state.currentTarget = null;

  // clear targets
  entities.targets = [];
  entities.remainingTargets = 0;

  // spawn ALL route targets ONCE — normalize city refs to lat/lng
  for (const rt of state.route) {
    let t = rt;
    if (!Number.isFinite(t?.lat) || !Number.isFinite(t?.lng)) {
      if (t?.city) {
        try {
          const city = resolveCityRef(t);
          t = { ...t, lat: city.lat, lng: city.lng };
        } catch (e) {
          console.warn("Skipping route entry, cannot resolve city:", t, e);
          continue; // skip unresolved entry
        }
      } else {
        console.warn("Skipping route entry without coordinates:", t);
        continue;
      }
    }

    // Ensure defaults so gameplay logic works
    const arrivalRadius = Number.isFinite(t.arrivalRadius)
      ? t.arrivalRadius
      : CONFIG_DEFAULTS.arrivalRadius;

    entities.targets.push({
      ...t,
      arrivalRadius,
      completed: false,
      name: t.name || t.city || t.id
    });
    entities.remainingTargets++;
  }
  // In free-order mode we don't force a current target
  state.currentTarget = null;

  if (hudLevelEl) {
    hudLevelEl.textContent = lvl.displayName;
  }
  renderRouteHUD();
}


function loadLevel(levelId) {
  resetLayersAndEntities();
  applyLevelConfig(levelId);
  state.fuel = TANK_CAPACITY;
  state.gameTime = 0;
  state.fuelPrevLat = state.lat;
  state.fuelPrevLng = state.lng;
  setLevelCenterFromTargets(entities.targets);
  preloadCityMarkers();

  planeMarker.setLatLng([state.lat, state.lng]);
  map.setView([state.lat, state.lng], 13, { animate: false });

  introEl.style.display = "flex";
  endScreenEl.style.display = "none";

  state.gameStarted = false;
  state.gameOver = false;

}
