/* ========= MAP ========= */

const map = L.map("map", { zoomControl: false, inertia: false });
map.keyboard.disable();
map.dragging.disable();

const nightCanvas = document.getElementById("nightCanvas");
const nightCtx = nightCanvas.getContext("2d");
function resizeNightCanvas() {
  nightCanvas.width = window.innerWidth;
  nightCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeNightCanvas);
resizeNightCanvas();

let _levelCenterLatLng = null;
function setLevelCenterFromTargets(targets) {
  if (!targets || !targets.length) {
    _levelCenterLatLng = null;
    return;
  }

  let latSum = 0;
  let lngSum = 0;

  for (const t of targets) {
    latSum += t.lat;
    lngSum += t.lng;
  }

  _levelCenterLatLng = L.latLng(
    latSum / targets.length,
    lngSum / targets.length
  );
}

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles © Esri" }
).addTo(map);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { maxZoom: 19 }
)

let zoom = CONFIG_DEFAULTS.zoom;
map.setMinZoom(zoom);
map.setMaxZoom(zoom);
map.createPane("planePane");
map.getPane("planePane").style.zIndex = 7001;
map.createPane("fxPane");
map.getPane("fxPane").style.zIndex = 650;



const layerTargets  = L.layerGroup().addTo(map);
const layerFx       = L.layerGroup({ pane: "fxPane" }).addTo(map);
const layerUi       = L.layerGroup().addTo(map);
const layerCities = L.layerGroup().addTo(map);

/* ========= EXPLORE MINI MAP ========= */
let minimap = null;
let minimapPlaneMarker = null;
const _minimapCityDots = new Map();

function initMinimap() {
  if (minimap) return;
  const el = document.getElementById("minimap");
  if (!el) return;
  const cfg = EXPLORE_MODE.MINIMAP;
  el.style.width = cfg.WIDTH + "px";
  el.style.height = cfg.HEIGHT + "px";

  minimap = L.map(el, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    tap: false,
  });
  minimap.setView([0, 0], cfg.ZOOM);

  const tileUrl = cfg.SATELLITE
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(minimap);

  minimapPlaneMarker = L.marker([0, 0], {
    interactive: false,
    keyboard: false,
    icon: L.divIcon({
      html: '<div class="minimap-plane" style="font-size:14px;line-height:1;">✈️</div>',
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
  }).addTo(minimap);
}

function showMinimap(lat, lng) {
  const el = document.getElementById("minimap");
  if (!el) return;
  initMinimap();
  el.style.display = "block";
  minimap.invalidateSize();
  minimapPlaneMarker.setLatLng([lat, lng]);
  minimap.setView([lat, lng], EXPLORE_MODE.MINIMAP.ZOOM, { animate: false });
}

function hideMinimap() {
  const el = document.getElementById("minimap");
  if (el) el.style.display = "none";
}

function updateMinimap(lat, lng, heading) {
  if (!minimap || !minimapPlaneMarker) return;
  minimapPlaneMarker.setLatLng([lat, lng]);
  minimap.setView([lat, lng], EXPLORE_MODE.MINIMAP.ZOOM, { animate: false });
  const el = minimapPlaneMarker.getElement()?.querySelector('.minimap-plane');
  if (el) {
    el.style.transform = `rotate(${(heading || 0) + CONFIG_DEFAULTS.emojiRotationOffset}deg)`;
  }
}

function spawnMinimapCityDots(musicCities, discoveredSet) {
  if (!minimap) return;
  // Clear old dots
  for (const dot of _minimapCityDots.values()) {
    try { minimap.removeLayer(dot); } catch {}
  }
  _minimapCityDots.clear();

  for (const mc of musicCities) {
    const key = `${mc.city}|${mc.country}`;
    const isDiscovered = discoveredSet && discoveredSet.has(key);
    const dot = L.circleMarker([mc.lat, mc.lng], {
      radius: 1.5,
      color: isDiscovered ? "#7CFFB2" : "#ff4444",
      fillColor: isDiscovered ? "#7CFFB2" : "#ff4444",
      fillOpacity: 0.9,
      weight: 0,
      interactive: false,
    }).addTo(minimap);
    _minimapCityDots.set(key, dot);
  }
}

function markMinimapCityDiscovered(city, country) {
  const key = `${city}|${country}`;
  const dot = _minimapCityDots.get(key);
  if (dot) {
    dot.setStyle({ color: "#7CFFB2", fillColor: "#7CFFB2" });
  }
}

/* ========= LEVEL MODE MINIMAP ========= */
function initMinimapForLevel() {
  if (!minimap) return;
  for (const dot of _minimapCityDots.values()) {
    try { minimap.removeLayer(dot); } catch {}
  }
  _minimapCityDots.clear();
}

function revealMinimapTarget(city, country, lat, lng) {
  if (!minimap) return;
  const key = `${city}|${country}`;
  if (_minimapCityDots.has(key)) return;

  // Pulse ring (temporary expanding glow)
  const pulse = L.marker([lat, lng], {
    interactive: false,
    keyboard: false,
    icon: L.divIcon({
      html: '<div class="minimap-dot-pulse"></div>',
      className: '',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    })
  }).addTo(minimap);
  setTimeout(() => {
    try { minimap.removeLayer(pulse); } catch {}
  }, 700);

  // Green dot
  const dot = L.circleMarker([lat, lng], {
    radius: 1.5,
    color: '#7CFFB2',
    fillColor: '#7CFFB2',
    fillOpacity: 0.9,
    weight: 0,
    interactive: false,
  }).addTo(minimap);
  _minimapCityDots.set(key, dot);
}

const cityEntities = [];
const cityHudGrid = new Map(); // key "latCell|lngCell" -> city[]
const CITY_HUD_GRID_DEG = 0.35;

/* ========= VIEWPORT CULLING (explore mode) ========= */
const _exploreCityPool = [];          // all qualifying cities (data only, no marker)
const _visibleCityMarkers = new Map(); // key -> Leaflet marker (currently on map)
let _lastCullBounds = null;
const _CULL_PAD = 0.3;                // pad viewport by 30% to avoid pop-in
const _CULL_INTERVAL_MS = 250;

function _cityHudCellKey(lat, lng) {
  const latCell = Math.floor(lat / CITY_HUD_GRID_DEG);
  const lngCell = Math.floor(lng / CITY_HUD_GRID_DEG);
  return `${latCell}|${lngCell}`;
}

function _cityHudGridInsert(city) {
  const key = _cityHudCellKey(city.lat, city.lng);
  let bucket = cityHudGrid.get(key);
  if (!bucket) {
    bucket = [];
    cityHudGrid.set(key, bucket);
  }
  bucket.push(city);
}

function getNearbyCityEntities(lat, lng, radiusM) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusM) || radiusM <= 0) {
    return cityEntities;
  }

  const metersPerDegLat = 111_320;
  const latRangeDeg = radiusM / metersPerDegLat;
  const cosLat = Math.cos(lat * Math.PI / 180);
  const safeCosLat = Math.max(0.15, Math.abs(cosLat));
  const lngRangeDeg = radiusM / (metersPerDegLat * safeCosLat);

  const minLatCell = Math.floor((lat - latRangeDeg) / CITY_HUD_GRID_DEG);
  const maxLatCell = Math.floor((lat + latRangeDeg) / CITY_HUD_GRID_DEG);
  const minLngCell = Math.floor((lng - lngRangeDeg) / CITY_HUD_GRID_DEG);
  const maxLngCell = Math.floor((lng + lngRangeDeg) / CITY_HUD_GRID_DEG);

  const out = [];
  for (let la = minLatCell; la <= maxLatCell; la++) {
    for (let ln = minLngCell; ln <= maxLngCell; ln++) {
      const bucket = cityHudGrid.get(`${la}|${ln}`);
      if (!bucket || !bucket.length) continue;
      out.push(...bucket);
    }
  }
  return out;
}

/* aim marker */
const aimMarker = L.marker([0, 0], {
  icon: L.divIcon({
    html: `<div style="
      width:6px;height:6px;background:red;border-radius:50%;
      box-shadow:0 0 6px red;
    "></div>`,
    className: "",
    iconSize: [6, 6],
    iconAnchor: [3, 3]
  })
}).addTo(layerUi);

let targetMarker = null;

// Track spawned city markers so we can update them when a destination is reached.
window.cityMarkerIndex = new Map(); // key: "Name|Country" -> Leaflet marker

function _escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function addCityMarker(lat, lng, pop, name = "", country = "") {
  let sizeKey;

  if (pop >= cityMarkersConfig.BIG_CITY_POPULATION) {
    sizeKey = "big";
  } else if (pop >= cityMarkersConfig.MEDIUM_CITY_POPULATION) {
    sizeKey = "medium";
  } else {
    sizeKey = "small";
  }

  const size = cityMarkersConfig.SIZE_PX[sizeKey];
  const offset = cityMarkersConfig.OFFSET_PX[sizeKey];

  const safeName = _escapeHtml(name);
  const safeCountry = _escapeHtml(country);

  const marker = L.marker([lat, lng], {
    interactive: false,
    keyboard: false,
    icon: L.divIcon({
      html: `<div style="
        font-size:${size}px;
        opacity:0.9;
        transform: translate(${offset.x}px, ${offset.y}px);
        filter: drop-shadow(0 0 6px rgba(0,0,0,0.6));
      " class="city-marker" data-city="${safeName}" data-country="${safeCountry}">🏢</div>`,
      className: "",
      iconSize: [0, 0]
    })
  }).addTo(layerCities);

  if (name && country) {
    window.cityMarkerIndex.set(`${name}|${country}`, marker);
  }
}

// global
window.cityIndex = new Map(); // key: "Haifa|Israel" → {lat,lng,name,country,pop}
const cityItems = [];

async function loadCityIndex() {
  cityEntities.length = 0;
  cityHudGrid.clear();
  layerCities.clearLayers();

  cityItems.length = 0;
  function upsertCityIndex(name, country, lat, lng, pop) {
    const key = `${name}|${country}`;
    const existing = window.cityIndex.get(key);
    if (!existing) {
      window.cityIndex.set(key, { lat, lng, name, country, pop });
      return;
    }

    const existingPop = Number.isFinite(existing.pop) ? existing.pop : null;
    const nextPop = Number.isFinite(pop) ? pop : null;

    if (existingPop === null && nextPop !== null) {
      window.cityIndex.set(key, { lat, lng, name, country, pop });
      return;
    }

    if (existingPop !== null && nextPop !== null && nextPop > existingPop) {
      window.cityIndex.set(key, { lat, lng, name, country, pop });
    }
  }

  const cached = loadCityMarkersCache();
  if (cached && cached.length > 0) {
    // cached may be in compact-array format ([lat,lng,pop,name,country])
    for (const row of cached) {
      if (Array.isArray(row)) {
        const [lat, lng, pop, name, country] = row;
        cityItems.push({ lat, lng, pop, isCapital: false, name, country });
        upsertCityIndex(name, country, lat, lng, pop);
      } else {
        const name = row.city ?? row.name;
        cityItems.push({
          lat: row.lat,
          lng: row.lng,
          pop: row.pop,
          isCapital: row.isCapital ?? false,
          name,
          country: row.country
        });
        upsertCityIndex(name, row.country, row.lat, row.lng, row.pop);
      }
    }
  }

  // If cache didn't yield any items, fetch the city data source.
  if (cityItems.length === 0) {
    const res = await fetch(CITY_MARKERS.DATA_URL, { cache: "force-cache" });
    const data = await res.json();

    for (const row of data) {      
      const lat = Number(row.lat ?? row.latitude);
      const lng = Number(row.lng ?? row.lon ?? row.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const pop = Number(row.population);
      const isCapital = row.capital === "primary";

      const name = row.city ?? row.name;

      cityItems.push({
        lat,
        lng,
        pop,
        isCapital,
        name,
        country: row.country
      });
      upsertCityIndex(name, row.country, lat, lng, pop);
    }

    saveCityMarkersCache(cityItems);
  }
}

async function preloadCityMarkers() {
  // Reset per-level city markers so restarts do not stack duplicates.
  layerCities.clearLayers();
  cityEntities.length = 0;
  cityHudGrid.clear();
  window.cityMarkerIndex?.clear?.();
  _exploreCityPool.length = 0;
  _visibleCityMarkers.clear();
  _lastCullBounds = null;

  const forcedCityKeys = new Set();
  if (entities?.targets?.length) {
    for (const t of entities.targets) {
      if (t?.city && t?.country) {
        forcedCityKeys.add(`${t.city}|${t.country}`);
      }
    }
  }

  for (const c of cityItems) {
    const key = `${c.name}|${c.country}`;
    const isForced = forcedCityKeys.has(key);

    // 1. radius check (skip in explore mode)
    if (!state.isExploreMode) {
      if (!_levelCenterLatLng && !isForced) continue;

      if (!isForced) {
        const d = _levelCenterLatLng.distanceTo([c.lat, c.lng]);
        if (d > cityMarkersConfig.LEVEL_RADIUS_M) continue;
      }
    }

    // 2. significance rule
    const isBigCity =
      Number.isFinite(c.pop) &&
      c.pop >= cityMarkersConfig.MIN_POPULATION;

    const isCapital =
      cityMarkersConfig.INCLUDE_CAPITALS &&
      c.isCapital === true;

    if (!isForced && !isCapital && !isBigCity) continue;

    // ✅ passed all rules — register for HUD grid always
    cityEntities.push({
      lat: c.lat,
      lng: c.lng,
      name: c.name,
      country: c.country,
      pop: c.pop
    });
    _cityHudGridInsert(cityEntities[cityEntities.length - 1]);

    if (state.isExploreMode) {
      // Defer marker creation to viewport culling
      _exploreCityPool.push({
        lat: c.lat,
        lng: c.lng,
        pop: c.pop,
        name: c.name,
        country: c.country,
        key
      });
    } else {
      addCityMarker(c.lat, c.lng, c.pop, c.name, c.country);
    }
  }

  // If explore mode, do an initial viewport cull
  if (state.isExploreMode) {
    cullCityMarkersToViewport();
  }
}

function spawnArrivalPulse(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const pulse = L.marker([lat, lng], {
    interactive: false,
    keyboard: false,
    icon: L.divIcon({
      html: `<div class="arrival-pulse"></div>`,
      className: "",
      iconSize: [56, 56],
      iconAnchor: [28, 28]
    }),
    pane: "fxPane"
  }).addTo(layerFx);

  setTimeout(() => {
    try { layerFx.removeLayer(pulse); } catch {}
  }, 950);
}

function spawnStrikeEcho(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const echo = L.marker([lat, lng], {
    interactive: false,
    keyboard: false,
    icon: L.divIcon({
      html: '<div class="strike-echo"></div>',
      className: "",
      iconSize: [120, 120],
      iconAnchor: [60, 60]
    }),
    pane: "fxPane"
  }).addTo(layerFx);

  setTimeout(() => {
    try { layerFx.removeLayer(echo); } catch {}
  }, 2200);
}

function _pulseElement(el) {
  if (!el) return;
  el.classList.remove("city-pulse");
  // force reflow so animation restarts
  void el.offsetWidth;
  el.classList.add("city-pulse");
  setTimeout(() => el.classList.remove("city-pulse"), 900);
}

function markCityMarkerCompleted(city, country) {
  if (!city || !country) return false;
  const key = `${city}|${country}`;
  const m = window.cityMarkerIndex?.get(key);
  if (!m) return false;

  const root = m.getElement?.();
  const el = root?.querySelector?.(".city-marker") || root;
  if (!el) return false;

  el.classList.add("city-done");
  _pulseElement(el);
  return true;
}

// Called when a route destination is reached.
function markDestinationCityReached(target) {
  if (!target) return;
  if (target.city && target.country) {
    markCityMarkerCompleted(target.city, target.country);
  }
  spawnArrivalPulse(target.lat, target.lng);
}


function computeLevelCenterFromTargets(targets) {
  if (!targets || !targets.length) return null;

  let latSum = 0;
  let lngSum = 0;

  for (const t of targets) {
    latSum += t.lat;
    lngSum += t.lng;
  }

  return {
    lat: latSum / targets.length,
    lng: lngSum / targets.length
  };
}

function getCityEntities() {
  return cityEntities;
}


let _lastCullTime = 0;

function cullCityMarkersToViewport() {
  if (!state.isExploreMode || !_exploreCityPool.length) return;

  const now = performance.now();
  if (now - _lastCullTime < _CULL_INTERVAL_MS) return;
  _lastCullTime = now;

  const bounds = map.getBounds();
  if (!bounds) return;

  const latPad = (bounds.getNorth() - bounds.getSouth()) * _CULL_PAD;
  const lngPad = (bounds.getEast() - bounds.getWest()) * _CULL_PAD;

  const south = bounds.getSouth() - latPad;
  const north = bounds.getNorth() + latPad;
  const west = bounds.getWest() - lngPad;
  const east = bounds.getEast() + lngPad;

  const shouldBeVisible = new Set();

  for (const c of _exploreCityPool) {
    if (c.lat >= south && c.lat <= north && c.lng >= west && c.lng <= east) {
      shouldBeVisible.add(c.key);

      if (!_visibleCityMarkers.has(c.key)) {
        addCityMarker(c.lat, c.lng, c.pop, c.name, c.country);
        _visibleCityMarkers.set(c.key, true);
      }
    }
  }

  // Remove markers that went off-screen
  for (const [key] of _visibleCityMarkers) {
    if (!shouldBeVisible.has(key)) {
      const m = window.cityMarkerIndex?.get(key);
      if (m) {
        layerCities.removeLayer(m);
        window.cityMarkerIndex.delete(key);
      }
      _visibleCityMarkers.delete(key);
    }
  }
}


const _exploreMusicMarkers = new Map();

function spawnExploreMusicMarkers(musicCities) {
  _exploreMusicMarkers.clear();
  for (const mc of musicCities) {
    const key = `${mc.city}|${mc.country}`;
    const marker = L.marker([mc.lat, mc.lng], {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        html: '<div class="music-pulse"></div>',
        className: "",
        iconSize: [80, 80],
        iconAnchor: [40, 40]
      }),
      pane: "fxPane"
    }).addTo(layerFx);
    _exploreMusicMarkers.set(key, marker);
  }
}

function markExploreMusicVisited(city, country) {
  const key = `${city}|${country}`;
  // Remove the blue pulse marker
  const marker = _exploreMusicMarkers.get(key);
  if (marker) {
    try { layerFx.removeLayer(marker); } catch {}
    _exploreMusicMarkers.delete(key);
  }
  // Add green glow to the city's 🏢 emoji marker
  const cityMarker = window.cityMarkerIndex?.get(`${city}|${country}`);
  if (cityMarker) {
    const root = cityMarker.getElement?.();
    const el = root?.querySelector?.(".city-marker") || root;
    if (el) {
      el.classList.add("explore-visited-glow");
    }
  }
  // Add small repeating green pulse
  const latlng = marker ? marker.getLatLng() : (cityMarker ? cityMarker.getLatLng() : null);
  if (latlng) {
    const pulse = L.marker(latlng, {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        html: '<div class="music-visited-pulse"></div>',
        className: "",
        iconSize: [56, 56],
        iconAnchor: [28, 28]
      }),
      pane: "fxPane"
    }).addTo(layerFx);
    _exploreMusicMarkers.set(key, pulse);
  }
}
