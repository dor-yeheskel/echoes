/* ========= GEO ========= */

const R = 6371000;
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;

function move(lat, lng, hdg, dist) {
  const d = dist / R;
  const h = rad(hdg);
  const phi1 = rad(lat), lam1 = rad(lng);

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(d) +
    Math.cos(phi1) * Math.sin(d) * Math.cos(h)
  );

  const lam2 = lam1 + Math.atan2(
    Math.sin(h) * Math.sin(d) * Math.cos(phi1),
    Math.cos(d) - Math.sin(phi1) * Math.sin(phi2)
  );

  return { lat: deg(phi2), lng: deg(lam2) };
}

function distance(a, b) {
  const dx = rad(b.lat - a.lat);
  const dy = rad(b.lng - a.lng);
  return Math.sqrt(dx * dx + dy * dy) * R;
}

function bearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

function radarSizeToType(size) {
  if (size === "small") return RADAR_TYPES[0];
  if (size === "medium") return RADAR_TYPES[1];
  if (size === "big") return RADAR_TYPES[2];
  return RADAR_TYPES[1];
}
