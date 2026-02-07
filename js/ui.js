/* ========= UI & PROGRESS ========= */

function renderProgressTable() {
  const el = document.getElementById("progressTable");

  let html = `
    <div class="progressRow header">
      <div>#</div>
      <div>Route</div>
      <div>Status</div>
      <div></div>
    </div>
  `;

  for (let i = 0; i < levelOrder.length; i++) {
    const id = levelOrder[i];
    const lvl = levelToData[id];
    const completed = progress.completedLevels?.includes(id);
    const unlocked = i < progress.unlockedCount;

    html += `
      <div class="progressRow
        ${unlocked ? "" : "locked"}
        ${unlocked && !completed ? "unplayed" : ""}
        "
        data-level-id="${id}">
        <div class="mission-index">${i + 1}</div>
        <div>${lvl.displayName}</div>
        <div>
          ${!unlocked
            ? "🔒"
            : completed
              ? "✔ Completed"
              : "—"}
        </div>

        <div></div>
      </div>
    `;
  }

  el.innerHTML = html;
  el.querySelectorAll(".progressRow:not(.header):not(.locked)")
  .forEach(row => {
    row.addEventListener("click", () => {
      const levelId = row.dataset.levelId;

      // UI
      el.querySelectorAll(".progressRow.selected")
        .forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");

      state.levelId = levelId;
      state.levelIndex = levelOrder.indexOf(levelId);

      playSound("clicked");
    });
  });

}


function moveMenuSelection(dir) {
  const rows = Array.from(
    document.querySelectorAll(".progressRow:not(.header):not(.locked)")
  );
  if (!rows.length) return;

  let idx = rows.findIndex(r => r.classList.contains("selected"));

  if (idx === -1) idx = 0;
  
  const prevIdx = idx;
  const newIdx = (idx + dir + rows.length) % rows.length;

  if (newIdx !== prevIdx) {
    playSound("key_arrow");
  }

  rows.forEach(r => r.classList.remove("selected"));
  rows[newIdx].classList.add("selected");

  state.levelId = levelOrder[newIdx];
}


function renderRouteHUD() {
  const el = document.getElementById("routeHud");
  if (!el) return;
  // Build the HUD from the actual spawned targets so skipped entries
  // or unresolved cities are not shown.
  const targets = entities.targets || [];
  const idx = state.routeIndex ?? 0;

  if (!targets.length) {
    el.innerHTML = "<div class=\"route-empty\">No route targets</div>";
    return;
  }

  let html = "<ol class=\"route-list\">";
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const name = t.name || t.city || t.id || `#${i + 1}`;
    const cls = i < idx ? "route-done" : i === idx ? "route-current" : "route-next";
    html += `<li class="${cls}"><span class="marker">${i < idx ? '✓' : i === idx ? '●' : '○'}</span><span class="name">${name}</span></li>`;
  }
  html += "</ol>";

  el.innerHTML = html;
}


let currentCity = null;

function updateCityHUD() {
  const el = document.getElementById("hud-city");
  if (!el) return;

  const cities = getCityEntities();
  if (!cities || !cities.length) return;

  if (currentCity) {
    const d = distance(state, currentCity);
    if (d > CITY_MARKERS.CITY_HUD_RADIUS_M) {
      currentCity = null;
    }
    return;
  }

  for (const city of cities) {
    const d = distance(state, city);
    if (d < CITY_MARKERS.CITY_HUD_RADIUS_M) {
      currentCity = city;
      el.textContent = city.name + (city.country ? `, ${city.country}` : "");
      el.classList.add("active");
      return;
    }
  }
}
