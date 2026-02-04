/* ========= LEVEL LOADING ========= */

async function loadLevels() {
    const index = await fetch("assets/levels/index.json").then(r => r.json());

    window.LEVELS = {};

    for (const id of index.levels) {
      const level = await fetch(`assets/levels/${id}.json`).then(r => r.json());
      window.LEVELS[id] = level;
    }
}

  
function resetLayersAndEntities() {
  layerTargets.clearLayers();
  layerRadars.clearLayers();
  layerBombs.clearLayers();
  layerMissiles.clearLayers();
  layerFx.clearLayers();

  entities.targets = [];
  entities.radars = [];
  entities.bombs = [];
  entities.missiles = [];
  entities.remainingTargets = 0;

  state.missileCounter = 0;
  state.lastLockBeep = -999;
  state.destroyedRadars = 0;
  state.refueled = false;

  state.stealthActive = false;
  state.stealthTimer = 0;

  state.keys = {};
}

function applyLevelConfig(levelId) {
  const lvl = levelToData[levelId];

  state.levelId = levelId;
  state.levelIndex = levelOrder.indexOf(levelId);

  const start = lvl.start;
  state.lat = start.lat;
  state.lng = start.lng;
  state.heading = start.heading ?? 0;
  state.speed = 3000;

  // ===== Echoes route =====
  state.route = lvl.route || [];
  state.routeIndex = 0;
  state.currentTarget = null;

  // clear targets
  entities.targets = [];
  entities.remainingTargets = state.route.length;

  // spawn ALL route targets ONCE
  for (const t of state.route) {
    addEchoTarget(t);
  }

  state.currentTarget = entities.targets[0] || null;

  if (hudLevelEl) {
    hudLevelEl.textContent = lvl.displayName;
  }
  renderRouteHUD();

}


function addTarget(target) {
  const size = target.size || "small";
  const stats = SIZE_STATS[size] || SIZE_STATS.medium;

  const visualSize = Math.round(32 * stats.scale);

  const marker = L.marker([target.lat, target.lng], {
    icon: L.divIcon({
      html: `
        <div style="
          width:${visualSize}px;
          height:${visualSize}px;
          display:flex;
          align-items:center;
          justify-content:center;
          transform: translate(-50%, -50%);
        ">
          <div style="font-size:${visualSize}px; line-height:1;">
            ${target.emoji || "🏭"}
          </div>
        </div>
      `,
      className: "",
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    })
  }).addTo(layerTargets);


  // ===== DEBUG: TARGET HIT RADIUS (TEMP) =====
  const DEBUG_SHOW_TARGET_RADIUS = false;

  if (DEBUG_SHOW_TARGET_RADIUS) {
    L.circle([target.lat, target.lng], {
      radius: getTargetHitRadius(size), // actual hit radius (by size)
      color: "red",
      weight: 1,
      fill: false,
      dashArray: "6 6",
      interactive: false
    }).addTo(layerUi);
  }
  // ===== END DEBUG =====
  entities.targets.push({
    ...target,
    hp: stats.hp,
    maxHp: stats.hp,
    size,
    marker,
    fire: null
  });
}


function addRadar(cfg) {
  const type = radarSizeToType(cfg.size);
  const stats = SIZE_STATS[cfg.size || "medium"] || SIZE_STATS.medium;
  const visualSize = Math.round(36 * stats.scale);

  const marker = L.marker([cfg.lat, cfg.lng], {
    icon: L.divIcon({
      html: `
        <div style="
          width:${visualSize}px;
          height:${visualSize}px;
          display:flex;
          align-items:center;
          justify-content:center;
          transform: translate(-50%, -50%);
          pointer-events:none;
        ">
          <div style="
            font-size:${visualSize}px;
            line-height:1;
          ">
            📡
          </div>
        </div>
      `,
      className: "",
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    })
  }).addTo(layerRadars);


  const circle = L.circle([cfg.lat, cfg.lng], {
    radius: type.range,
    color: "red",
    fillOpacity: 0.05
  }).addTo(layerRadars);

  // ===== DEBUG: RADAR HIT RADIUS (BOMB) =====
  const DEBUG_SHOW_RADAR_HIT_RADIUS = false;
  let hitCircle = null;

  if (DEBUG_SHOW_RADAR_HIT_RADIUS) {
    hitCircle = L.circle([cfg.lat, cfg.lng], {
      radius: getRadarHitRadius(cfg.size), // bomb hit radius (by size)
      color: "white",
      weight: 1,
      fill: false,
      dashArray: "6 6",
      interactive: false
    }).addTo(layerRadars);
  }


  entities.radars.push({
    lat: cfg.lat,
    lng: cfg.lng,
    size: cfg.size,
    hp: stats.hp,
    maxHp: stats.hp,
    fire: null,

    range: type.range,
    marker,
    circle,
    alive: true,

    rocketSpeed: cfg.rocketSpeed ?? state.rocketSpeed,
    rocketFreq: cfg.rocketFreq ?? state.rocketFreq,
    smartRocketsEvery: cfg.smartRocketsEvery ?? state.smartRocketsEvery,
    smartRocketSpeedFactor: cfg.smartRocketSpeedFactor ?? state.smartRocketSpeedFactor,
    predictRocketsEvery: cfg.predictRocketsEvery ?? state.predictRocketsEvery,
    predictRocketsLead:  cfg.predictRocketsLead  ?? state.predictRocketsLead,

    cooldown: cfg.rocketFreq ?? state.rocketFreq
  });
}


function setNightMode(on) {
  document.body.classList.toggle("night", on);
  if (!on) {
    nightCtx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
  }
}


function loadLevel(levelId) {
  resetLayersAndEntities();
  applyLevelConfig(levelId);

  planeMarker.setLatLng([state.lat, state.lng]);
  map.setView([state.lat, state.lng], 13, { animate: false });


  introEl.style.display = "flex";
  endScreenEl.style.display = "none";

  state.gameStarted = false;
  state.gameOver = false;

}
