/* ========= GEO ========= */

const R = 6371000;
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;

/** Wrap longitude to [-180, 180] */
function wrapLng(lng) {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

/** Return the equivalent of `lng` (mod 360) closest to `ref` */
function nearestLng(lng, ref) {
  let d = lng - ref;
  d = ((d + 180) % 360 + 360) % 360 - 180;
  return ref + d;
}

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
  let dlng = b.lng - a.lng;
  dlng = ((dlng + 180) % 360 + 360) % 360 - 180;
  const dy = rad(dlng);
  return Math.sqrt(dx * dx + dy * dy) * R;
}
