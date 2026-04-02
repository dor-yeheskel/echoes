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
  state.isExploreMode = false;
  document.body.classList.remove("explore-mode");
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

  showMinimap(state.lat, state.lng);
  initMinimapForLevel();

  introEl.style.display = "flex";
  endScreenEl.style.display = "none";

  state.gameStarted = false;
  state.gameOver = false;

}


function getMusicCities() {
  const result = [];
  for (const trackKey of Object.keys(CITY_TRACKS)) {
    let found = null;
    for (const [key, value] of window.cityIndex.entries()) {
      if (key.toLowerCase() === trackKey) {
        found = value;
        break;
      }
    }
    if (found) {
      result.push({
        city: found.name,
        country: found.country,
        lat: found.lat,
        lng: found.lng,
        trackKey: trackKey,
        inRadius: false
      });
    }
  }
  return result;
}


function loadExploreMode() {
  state.isExploreMode = true;
  state.levelId = null;
  document.body.classList.add("explore-mode");

  resetLayersAndEntities();
  resetRuntimeConfig();

  // Start position: Marseille, France
  state.lat = EXPLORE_MODE.START.lat;
  state.lng = EXPLORE_MODE.START.lng;
  state.heading = EXPLORE_MODE.START.heading;
  state.speed = CONFIG_DEFAULTS.minSpeed;

  state.fuel = TANK_CAPACITY;
  state.gameTime = 0;
  state.fuelPrevLat = state.lat;
  state.fuelPrevLng = state.lng;

  state.route = [];
  state.routeIndex = 0;
  state.currentTarget = null;
  state.exploreVisited = [];
  state.exploreMusicCities = [];
  state.exploreDiscoveredSet = new Set();

  // Configure city markers for explore (show all cities globally)
  cityMarkersConfig.MIN_POPULATION = EXPLORE_MODE.MIN_POPULATION;

  setLevelCenterFromTargets([]);
  preloadCityMarkers();

  // Spawn music city markers with blue pulse
  state.exploreMusicCities = getMusicCities();
  spawnExploreMusicMarkers(state.exploreMusicCities);

  // Restore saved explore progress
  const saved = loadExploreState();
  if (saved) {
    state.exploreVisited = saved.visited;
    state.exploreDiscoveredSet = saved.discovered;

    // Mark previously discovered music cities
    for (const mc of state.exploreMusicCities) {
      const key = `${mc.city}|${mc.country}`;
      if (saved.discovered.has(key)) {
        mc.discovered = true;
        markExploreMusicVisited(mc.city, mc.country);
      }
    }

    // Start at last visited city if available
    if (saved.visited.length > 0) {
      const last = saved.visited[0];
      const mc = state.exploreMusicCities.find(
        m => m.city === last.city && m.country === last.country
      );
      if (mc) {
        state.lat = mc.lat;
        state.lng = mc.lng;
        state.fuelPrevLat = mc.lat;
        state.fuelPrevLng = mc.lng;
        // Suppress music trigger at spawn — player must leave and re-enter
        mc.inRadius = true;
      }
    }
  }

  // If all cities already discovered from saved progress, suppress victory sound on first render
  const allAlreadyFound = state.exploreMusicCities.length > 0 &&
    state.exploreDiscoveredSet.size >= state.exploreMusicCities.length;
  state._exploreVictoryPlayed = allAlreadyFound;

  // Reset easter egg strike counter (per session only)
  state._exploreStrikeCount = 0;
  state._exploreLastVisitKey = null;

  if (hudLevelEl) {
    hudLevelEl.textContent = "Explore";
  }

  renderExploreHUD();

  planeMarker.setLatLng([state.lat, state.lng]);
  map.setView([state.lat, state.lng], CONFIG_DEFAULTS.zoom, { animate: false });

  // Pre-cull city markers so they're visible immediately (no empty-map flash)
  cullCityMarkersToViewport();

  showMinimap(state.lat, state.lng);
  spawnMinimapCityDots(state.exploreMusicCities, state.exploreDiscoveredSet);

  introEl.style.display = "flex";
  endScreenEl.style.display = "none";

  state.gameStarted = false;
  state.gameOver = false;
}
