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
