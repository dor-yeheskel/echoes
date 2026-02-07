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
  console.log("Resolving city ref:", ref);
  const key = `${ref.city}|${ref.country}`;
  const city = window.cityIndex.get(key);
  console.log("Resolved city:", city);
  if (!city) {
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

  state.heading = startLatLng.heading ?? 0;
  state.speed = 3000;

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

    entities.targets.push({ ...t });
    entities.remainingTargets++;
  }
  state.currentTarget = entities.targets[0] || null;

  if (hudLevelEl) {
    hudLevelEl.textContent = lvl.displayName;
  }
  renderRouteHUD();
}


function loadLevel(levelId) {
  resetLayersAndEntities();
  applyLevelConfig(levelId);
  setLevelCenterFromTargets(entities.targets);
  preloadCityMarkers();

  planeMarker.setLatLng([state.lat, state.lng]);
  map.setView([state.lat, state.lng], 13, { animate: false });

  introEl.style.display = "flex";
  endScreenEl.style.display = "none";

  state.gameStarted = false;
  state.gameOver = false;

}
