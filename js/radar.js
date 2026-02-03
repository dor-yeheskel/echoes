/* ========= HUD + MINIMAP ========= */

const radarCanvas = document.getElementById("radarCanvas");
const radarCtx = radarCanvas.getContext("2d");

function getTargetsCenter() {
  let lat = 0, lng = 0;
  for (const t of entities.targets) { lat += t.lat; lng += t.lng; }
  const n = Math.max(1, entities.targets.length);
  return { lat: lat / n, lng: lng / n };
}

function drawRadar() {
  const ctx = radarCtx;
  const w = radarCanvas.width;
  const h = radarCanvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // ======================
  // Radar frame
  // ======================
  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,255,0,0.25)";
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
  ctx.moveTo(0, cy); ctx.lineTo(w, cy);
  ctx.stroke();

  // ======================
  // TARGET DOTS (IN RANGE)
  // ======================
  entities.targets.forEach(t => {
    const d = distance(state, t);
    if (d > CONFIG_DEFAULTS.radarRangeOnMinimap) return;

    const angle = Math.atan2(t.lng - state.lng, t.lat - state.lat);
    const r = (d / CONFIG_DEFAULTS.radarRangeOnMinimap) * (cx - 10);

    const x = cx + Math.sin(angle) * r;
    const y = cy - Math.cos(angle) * r;

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

	// ======================
  // RADARS (YELLOW DOTS)
  // ======================
  entities.radars.forEach(r => {
    if (!r.alive) return;

    const d = distance(state, r);
    if (d > CONFIG_DEFAULTS.radarRangeOnMinimap) return;

    const angle = Math.atan2(r.lng - state.lng, r.lat - state.lat);
    const rPos = (d / CONFIG_DEFAULTS.radarRangeOnMinimap) * (cx - 10);

    const x = cx + Math.sin(angle) * rPos;
    const y = cy - Math.cos(angle) * rPos;

    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

	// ======================
  // BASE (CYAN DOT)
  // ======================

  if (state.hasBase) {
    const d = distance(state, state.base);
    if (d <= CONFIG_DEFAULTS.radarRangeOnMinimap) {
      const angle = Math.atan2(
        state.base.lng - state.lng,
        state.base.lat - state.lat
      );

      const rPos = (d / CONFIG_DEFAULTS.radarRangeOnMinimap) * (cx - 10);

      const x = cx + Math.sin(angle) * rPos;
      const y = cy - Math.cos(angle) * rPos;

      ctx.fillStyle = "#66cccc";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ===== BASE ARROW WHEN NO BOMBS (OUT OF RANGE) =====
  if (
    state.hasBase &&
    state.bombs <= 0 &&
    entities.bombs.length === 0
  ) {
    const d = distance(state, state.base);
    if (d > CONFIG_DEFAULTS.radarRangeOnMinimap) {
      const angle = Math.atan2(
        state.base.lng - state.lng,
        state.base.lat - state.lat
      );

      const r = cx - 12;
      const x = cx + Math.sin(angle) * r;
      const y = cy - Math.cos(angle) * r;

      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#66cccc";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.setLineDash([]);

      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.fillStyle = "#66cccc";
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  // ======================
  // OUT OF RANGE ARROWS
  // ======================
  entities.targets.forEach(t => {
    const d = distance(state, t);
    if (d <= CONFIG_DEFAULTS.radarRangeOnMinimap) return;

    const angle = Math.atan2(t.lng - state.lng, t.lat - state.lat);
    const r = cx - 12;

    const x = cx + Math.sin(angle) * r;
    const y = cy - Math.cos(angle) * r;

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = "#ff3333";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });

  // ======================
  // PLANE ARROW (LAST!)
  // ======================
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad(state.heading));

  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -cx + 10);
  ctx.stroke();

  ctx.fillStyle = "#00ff00";
  ctx.beginPath();
  ctx.moveTo(0, -cx + 6);
  ctx.lineTo(4, -cx + 14);
  ctx.lineTo(-4, -cx + 14);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}


function drawNight() {
  const ctx = nightCtx;

  // SAFETY
  ctx.globalCompositeOperation = "source-over";

  if (!isNight) {
    nightCtx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
    return;
  }

  ctx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.82)";
  ctx.fillRect(0, 0, nightCanvas.width, nightCanvas.height);

  const p = map.latLngToContainerPoint([state.lat, state.lng]);
  const angle = (state.heading - 90) * Math.PI / 180;


  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  const grad = ctx.createRadialGradient(0, 0, 60, 0, 0, 420);

  grad.addColorStop(0.0, "rgba(0,0,0,0)");
  grad.addColorStop(0.25, "rgba(0,0,0,0.15)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.45)");
  grad.addColorStop(0.85, "rgba(0,0,0,0.8)");
  grad.addColorStop(1.0, "rgba(0,0,0,1)");

  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 350, -0.45, 0.45);
  //ctx.arc(0, 0, 420, -0.65, 0.65);

  ctx.closePath();
  ctx.fill();
  ctx.restore();


  // 💥 Explosion light halos
  const now = performance.now();
  for (let i = nightBursts.length - 1; i >= 0; i--) {
    const b = nightBursts[i];
    const age = (now - b.t) / 600;

    if (age > 1) {
      nightBursts.splice(i, 1);
      continue;
    }

    const r = 220 + age * 180;
    const p = map.latLngToContainerPoint([b.lat, b.lng]);

    const grad = ctx.createRadialGradient(
      p.x, p.y, 0,
      p.x, p.y, r
    );
    grad.addColorStop(0, `rgba(255,200,120,${0.7 * (1 - age)})`);
    grad.addColorStop(0.5, `rgba(255,140,0,${0.35 * (1 - age)})`);

    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }  
  // 🔥 Fire glow (persistent, world-locked)
  for (let i = activeFires.length - 1; i >= 0; i--) {
    const f = activeFires[i];
    const p = map.latLngToContainerPoint([f.lat, f.lng]);
    const r = 280;
    const grad = ctx.createRadialGradient(
      p.x, p.y, 0,
      p.x, p.y, r
    );

    grad.addColorStop(0.0, "rgba(0,0,0,0.65)");
    grad.addColorStop(0.4, "rgba(0,0,0,0.35)");
    grad.addColorStop(0.75, "rgba(0,0,0,0.15)");
    grad.addColorStop(1.0, "rgba(0,0,0,0)");

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  // === AIM DOT (ALWAYS VISIBLE) ===
  const impact = getBombImpactPoint();
  const pAim = map.latLngToContainerPoint([impact.lat, impact.lng]);

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(pAim.x, pAim.y, 3, 0, Math.PI * 2);
  ctx.fill();


}

function setThreat(active) {
  const el = document.getElementById("threatIndicator");
  if (!el) return;

  el.classList.toggle("active", active);
  el.classList.toggle("stealth", active && state.stealthActive);
}

