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
  if (state.currentTarget) {
    const t = state.currentTarget;
    const d = distance(state, t);

    const angle = Math.atan2(t.lng - state.lng, t.lat - state.lat);
    const r = Math.min(
      (d / CONFIG_DEFAULTS.radarRangeOnMinimap) * (cx - 10),
      cx - 12
    );

    const x = cx + Math.sin(angle) * r;
    const y = cy - Math.cos(angle) * r;

    ctx.fillStyle = "#ff3333";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

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
  if (state.currentTarget) {
    const t = state.currentTarget;
    const d = distance(state, t);

    if (d > CONFIG_DEFAULTS.radarRangeOnMinimap) {
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
    }
  }

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

