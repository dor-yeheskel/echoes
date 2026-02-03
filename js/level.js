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

  // === START POSITION ===
  const start = lvl.start || lvl.base || { lat: 31.5085, lng: 34.4538 };

  state.lat = start.lat;
  state.lng = start.lng;
  state.heading = start.heading ?? 0;

  // === BASE (OPTIONAL) ===
  if (lvl.base) {
    state.base = { ...lvl.base };
    state.hasBase = true;
  } else {
    state.base = null;
    state.hasBase = false;
  }


  state.baseRadius = CONFIG_DEFAULTS.baseRadius;

  state.maxBombs = (lvl.limits?.maxBombs ?? 10);
  state.maxStealth = (lvl.limits?.maxStealth ?? 2);

  // defaults preserved if not overridden
  const rockets = lvl.rocketsConfig || {};
  state.rocketSpeed = (rockets.rocketSpeed ?? 5000);
  state.rocketFreq = (rockets.rocketFreq ?? 1.0);
  state.smartRocketsEvery = (rockets.smartRocketsEvery ?? 0);
  state.smartRocketSpeedFactor = (rockets.smartRocketSpeedFactor ?? 0.45);
  state.predictRocketsEvery = (rockets.predictRocketsEvery ?? 0);
  state.predictRocketsLead  = (rockets.predictRocketsLead  ?? 1);

  state.lat = start.lat;
  state.lng = start.lng;
  state.heading = start.heading ?? 0;

  state.speed = CONFIG_DEFAULTS.minSpeed + 500;

  state.bombs = state.maxBombs;
  state.stealthUses = state.maxStealth;

  if (hudLevelEl) {
    const missionNumber = state.levelIndex + 1;
    hudLevelEl.textContent = `Mission ${missionNumber}: ${lvl.displayName}`;
  }
}

function spawnBase() {
  if (baseMarker) {
    map.removeLayer(baseMarker);
    baseMarker = null;
  }
  if (!state.hasBase) return;
  const rot = state.base.rotation ?? 0;
  baseMarker = L.marker([state.base.lat, state.base.lng], {
  icon: L.divIcon({
      html: `
        <div style="
          width:${BASE_SIZE}px;
          height:${BASE_SIZE}px;
          display:flex;
          align-items:center;
          justify-content:center;
          transform: translate(-50%, -50%);
          pointer-events:none;
        ">
        <div style="
          font-size:${BASE_SIZE}px;
          line-height:1;
          transform: rotate(${rot}deg);
          transform-origin: 50% 50%;
        ">
          🛬
        </div>
        </div>
      `,
      className: "",
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    })
  }).addTo(layerUi);
  // ===== DEBUG: BASE REFUEL RADIUS (TEMP) =====
  const DEBUG_SHOW_BASE_RADIUS = false;

  if (DEBUG_SHOW_BASE_RADIUS) {
    L.circle([state.base.lat, state.base.lng], {
      radius: state.baseRadius,
      color: "cyan",
      weight: 1,
      fill: false,
      dashArray: "4 8",
      interactive: false
    }).addTo(layerUi);
  }
  // ===== END DEBUG =====

}


function spawnTargetsForLevel(levelId) {
  const lvl = levelToData[levelId];

  if (!Array.isArray(lvl.targetLocations)) {
    entities.remainingTargets = 0;
    return;
  }

  for (const p of lvl.targetLocations) {
    addTarget(p);
  }

  entities.remainingTargets = entities.targets.length;
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



function spawnRadarsForLevel(levelId) {
  const lvl = levelToData[levelId];
  entities.radars.length = 0;

  // explicit radar locations
  if (Array.isArray(lvl.radarLocations)) {
    for (const r of lvl.radarLocations)
      addRadar({
        lat: r.lat,
        lng: r.lng,
        size: r.size,
        rocketSpeed: r.rocketSpeed,
        rocketFreq: r.rocketFreq,
        smartRocketsEvery: r.smartRocketsEvery,
        smartRocketSpeedFactor: r.smartRocketSpeedFactor,
        predictRocketsEvery: r.predictRocketsEvery,
        predictRocketsLead: r.predictRocketsLead
      });
    return;
  }

  // current behavior: radars near each target, random type
  for (const t of entities.targets) {
    const type = RADAR_TYPES[Math.floor(Math.random() * RADAR_TYPES.length)];
    const offset = (type.range * 0.4) / 111000;
    const lat = t.lat + (Math.random() - 0.5) * offset;
    const lng = t.lng + (Math.random() - 0.5) * offset;
    addRadar(lat, lng, type);
  }

}

function applyDamage(entity, dmg) {
  entity.hp -= dmg;

  // ===== ensure fire exists =====
  if (!entity.fire) {
    fireEffect(entity);
  }

  if (entity.hp <= 0) {
    // destroyed → keep last fire size, do nothing
    return true;
  }

  // ===== scale fire by remaining HP =====
  if (entity.fire) {
    const root = entity.fire.getElement();
    const flame = root?.querySelector(".fire-emoji");

    if (flame) {
      const effectiveHp = Math.max(entity.hp, 0);
      const hpRatio = effectiveHp / entity.maxHp;

      let scale = 1.0;
      for (const step of FIRE_SCALE_BY_HP_RATIO) {
        if (hpRatio > step.min) {
          scale = step.scale;
          break;
        }
      }

      flame.style.transformOrigin = "50% 50%";
      flame.style.transform = `scale(${scale})`;
    }
  }


  // ===== destroyed =====
  if (entity.hp <= 0) {
    return true;
  }

  return false;
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
  isNight = on;

  document.body.classList.toggle("night", on);
  if (!on) {
    nightCtx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
  }
}


function loadLevel(levelId) {
  activeFires.length = 0;
  nightBursts.length = 0;

  if (nightCtx) {
    nightCtx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
  }
  setNightMode(!!levelToData[levelId].night);
  resetLayersAndEntities();
  nightBursts.length = 0;
  nightCtx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
  applyLevelConfig(levelId);
  spawnBase();
  spawnTargetsForLevel(levelId);
  spawnRadarsForLevel(levelId);

  // place plane
  planeMarker.setLatLng([state.lat, state.lng]);
  aimMarker.setLatLng([state.lat, state.lng]);

  // map view
  map.setView([state.lat, state.lng], 13, { animate: false });

  // UI state
  endScreenEl.style.display = "none";
  introEl.style.display = "flex";
  state.gameStarted = false;
  state.gameOver = false;

  updateHUD();
}
