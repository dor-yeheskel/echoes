/* ========= FX ========= */

function fireEffect(target) {
  if (!target) return;

  const baseLatLng = target.marker
    ? target.marker.getLatLng()
    : { lat: target.lat, lng: target.lng };

  const scale =
    FIRE_SCALE_BY_SIZE[target.size || "medium"] || 1.2;

  const offsetY = FIRE_Y_OFFSET_PX[target.size || "medium"];
  const offsetX = FIRE_X_OFFSET_PX[target.size || "medium"];

  const p = map.latLngToContainerPoint(baseLatLng);

  const p2 = L.point(
    p.x + offsetX,
    p.y + offsetY
  );
  const pos = map.containerPointToLatLng(p2);

  if (target.fire) {
    const el = target.fire.getElement();
    if (el) {
      el.style.fontSize = `${28 * scale}px`;
    }
    return;
  }
  if (target.fire) return;
  const baseSize =
    FIRE_BASE_SIZE_PX[target.size || "medium"] ?? 20;

  const fireMarker = L.marker(pos, {
    icon: L.divIcon({
      html: `<div class="fire-emoji" style="
        font-size:${baseSize * scale}px;
      ">🔥</div>`,
      className: "",
      iconSize: [32 * scale, 32 * scale],
      iconAnchor: [16 * scale, 16 * scale]
    }),
    zIndexOffset: 1000,
  }).addTo(layerFx);

  target.fire = fireMarker;

  activeFires.push({
    lat: pos.lat,
    lng: pos.lng,
    created: performance.now(),
    ttl: 4000
  });

}

function explosionEffect(lat, lng) {
  const boom = L.marker([lat, lng], {
    zIndexOffset: 1000,
    icon: L.divIcon({ html: "💥", className: "explosion" })
  }).addTo(layerFx);


  if (levelToData[state.levelId]?.night) {
    const p = map.latLngToContainerPoint([lat, lng]);
    nightBursts.push({
      lat,
      lng,
      t: performance.now()
    });
  }

  setTimeout(() => layerFx.removeLayer(boom), 800);
}


function whiteFlash(duration = 160) {
  const el = document.getElementById("flashOverlay");
  if (!el) return;

  el.classList.add("active");
  
  setTimeout(() => {
    el.classList.remove("active");
  }, duration);
}
