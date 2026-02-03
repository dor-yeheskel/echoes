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


L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles © Esri" }
).addTo(map);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { maxZoom: 19 }
)


let zoom = 15;
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