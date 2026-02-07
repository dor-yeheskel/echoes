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


let zoom = 7;
map.setMinZoom(zoom);
map.setMaxZoom(zoom);
map.createPane("planePane");
map.getPane("planePane").style.zIndex = 7001;
map.createPane("fxPane");
map.getPane("fxPane").style.zIndex = 650;



const layerTargets  = L.layerGroup().addTo(map);
const layerRadars   = L.layerGroup().addTo(map);
const layerBombs    = L.layerGroup().addTo(map);
const layerMissiles = L.layerGroup().addTo(map);
const layerFx       = L.layerGroup({ pane: "fxPane" }).addTo(map);
const layerUi       = L.layerGroup().addTo(map);
const layerCities = L.layerGroup().addTo(map);


const cityEntities = [];


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

function addEchoTarget(target) {
  const marker = L.marker([target.lat, target.lng], {
    icon: L.divIcon({
      html: `<div style="
        font-size:28px;
        opacity:0.9;
        filter: drop-shadow(0 0 6px rgba(0,255,150,0.6));
      ">📍</div>`,
      className: "",
      iconSize: [0, 0]
    })
  }).addTo(layerTargets);

  entities.targets.push({
    ...target,
    marker,
    echo: true
  });
}


function addCityMarker(lat, lng, pop) {
  let sizeKey;

  if (pop >= CITY_MARKERS.BIG_CITY_POPULATION) {
    sizeKey = "big";
  } else if (pop >= CITY_MARKERS.MEDIUM_CITY_POPULATION) {
    sizeKey = "medium";
  } else {
    sizeKey = "small";
  }

  const size = CITY_MARKERS.SIZE_PX[sizeKey];
  const offset = CITY_MARKERS.OFFSET_PX[sizeKey];

  L.marker([lat, lng], {
    interactive: false,
    keyboard: false,
    icon: L.divIcon({
      html: `<div style="
        font-size:${size}px;
        opacity:0.9;
        transform: translate(${offset.x}px, ${offset.y}px);
        filter: drop-shadow(0 0 6px rgba(0,0,0,0.6));
      ">🏢</div>`,
      className: "",
      iconSize: [0, 0]
    })
  }).addTo(layerCities);
}



async function preloadCityMarkers() {
  cityEntities.length = 0;
  layerCities.clearLayers();

  let items = loadCityMarkersCache();

  if (!items) {
    const res = await fetch(CITY_MARKERS.DATA_URL, { cache: "force-cache" });
    const data = await res.json();
    console.log(data[0]);

    items = [];

    for (const row of data) {
      const lat = Number(row.lat ?? row.latitude);
      const lng = Number(row.lng ?? row.lon ?? row.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const pop = Number(row.population);
      const isCapital = row.capital === "primary";

      items.push({
        lat,
        lng,
        pop,
        isCapital,
        name: row.city,
        country: row.country
      });
    }

    saveCityMarkersCache(items);
  }
  for (const c of items) {

    // 1. radius is mandatory
    if (!_levelCenterLatLng) continue;

    const d = _levelCenterLatLng.distanceTo([c.lat, c.lng]);
    if (d > CITY_MARKERS.LEVEL_RADIUS_M) continue;

    // 2. significance rule
    const isBigCity =
      Number.isFinite(c.pop) &&
      c.pop >= CITY_MARKERS.MIN_POPULATION;

    const isCapital =
      CITY_MARKERS.INCLUDE_CAPITALS &&
      c.isCapital === true;

    if (!isCapital && !isBigCity) continue;

    // ✅ passed all rules
    addCityMarker(c.lat, c.lng, c.pop);
    
    cityEntities.push({
      lat: c.lat,
      lng: c.lng,
      name: c.name,
      country: c.country
    });

  }

  console.log("Cities drawn:", layerCities.getLayers().length);
  for (const c of cityEntities) {
    console.log(`- ${c.name}, ${c.country} (${c.lat.toFixed(2)}, ${c.lng.toFixed(2)})`);
  }

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
