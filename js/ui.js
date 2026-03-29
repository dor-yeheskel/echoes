/* ========= UI & PROGRESS ========= */
let currentCity = null;
let cityFadeTimer = null;
let cityHudLastUpdateMs = 0;

const CITY_HUD_UPDATE_INTERVAL_MS = 120;

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
              ? "✔"
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

      // Deselect explore button
      const exploreBtn = document.getElementById("exploreBtn");
      if (exploreBtn) exploreBtn.classList.remove("selected");

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
  const exploreBtn = document.getElementById("exploreBtn");
  if (!rows.length) return;

  const exploreSelected = exploreBtn && exploreBtn.classList.contains("selected");

  if (exploreSelected) {
    if (dir === 1) {
      // Move down from explore to first level
      exploreBtn.classList.remove("selected");
      rows[0].classList.add("selected");
      state.levelId = rows[0].dataset.levelId;
      playSound("key_arrow");
    }
    return;
  }

  let idx = rows.findIndex(r => r.classList.contains("selected"));
  if (idx === -1) idx = 0;

  const newIdx = idx + dir;

  if (newIdx < 0 && exploreBtn) {
    // Move up from first level to explore
    rows.forEach(r => r.classList.remove("selected"));
    exploreBtn.classList.add("selected");
    playSound("key_arrow");
    return;
  }

  if (newIdx < 0 || newIdx >= rows.length) return;

  if (newIdx !== idx) {
    playSound("key_arrow");
  }

  rows.forEach(r => r.classList.remove("selected"));
  rows[newIdx].classList.add("selected");

  state.levelId = rows[newIdx].dataset.levelId;
}

function renderRouteHUD() {
  const el = document.getElementById("routeHud");
  if (!el) return;
  // Build the HUD from the actual spawned targets so skipped entries
  // or unresolved cities are not shown. No inherent order.
  const targets = entities.targets || [];
  

  if (!targets.length) {
    el.innerHTML = "<div class=\"route-empty\">No route targets</div>";
    return;
  }

  // Use an unordered list (no numbering) for cleaner look
  let html = "<ul class=\"route-list\">";
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const name = t.name || t.city || t.id || `#${i + 1}`;
    const cls = t.completed ? "route-done" : "route-next";
    const markerCls = t.completed ? "marker marker-done" : "marker";
    html += `<li class="${cls}"><span class="${markerCls}">🏢</span><span class="name">${name}, ${t.country}</span></li>`;
  }
  html += "</ul>";

  el.innerHTML = html;
}

function updateCityHUD() {
  const now = performance.now();
  if (now - cityHudLastUpdateMs < CITY_HUD_UPDATE_INTERVAL_MS) {
    return;
  }
  cityHudLastUpdateMs = now;

  const el = document.getElementById("hud-city");
  if (!el) return;

  const radiusM = Number.isFinite(cityMarkersConfig?.CITY_HUD_RADIUS_M)
    ? cityMarkersConfig.CITY_HUD_RADIUS_M
    : CITY_MARKERS.CITY_HUD_RADIUS_M;

  const cities = typeof getNearbyCityEntities === "function"
    ? getNearbyCityEntities(state.lat, state.lng, radiusM)
    : getCityEntities();
  if (!cities || !cities.length) return;

  let bestCity = null;
  let bestPop = -1;
  let currentInRange = false;

  for (const city of cities) {
    const d = distance(state, city);
    if (d < radiusM) {
      if (city === currentCity) currentInRange = true;
      const pop = Number.isFinite(city.pop) ? city.pop : 0;
      if (!bestCity || pop > bestPop) {
        bestCity = city;
        bestPop = pop;
      }
    }
  }

  if (!bestCity) {
    currentCity = null;
    return;
  }

  const currentPop = Number.isFinite(currentCity?.pop) ? currentCity.pop : 0;
  const shouldSwitch = !currentCity || !currentInRange || currentPop < bestPop;

  if (shouldSwitch) {
    currentCity = bestCity;
    el.textContent = bestCity.name + (bestCity.country ? `, ${bestCity.country}` : "");
    el.classList.add("active");
    el.classList.remove("aged");
    if (cityFadeTimer) {
      clearTimeout(cityFadeTimer);
    }
    cityFadeTimer = setTimeout(() => {
      el.classList.add("aged");
    }, 2000);
  }
}

function updateFuelHUD() {
  const bar = document.getElementById("fuelBarFill");
  const indicator = document.getElementById("threatIndicator");
  if (!bar) return;

  const cap = Number.isFinite(TANK_CAPACITY) && TANK_CAPACITY > 0
    ? TANK_CAPACITY
    : 1;
  const fuel = Number.isFinite(state.fuel) ? state.fuel : 0;
  const pct = Math.max(0, Math.min(1, fuel / cap));

  bar.style.width = `${(pct * 100).toFixed(1)}%`;

  bar.classList.remove("warn", "critical");
  if (pct <= 0.15) {
    bar.classList.add("critical");
  } else if (pct <= 0.35) {
    bar.classList.add("warn");
  }

  if (indicator) {
    indicator.classList.toggle("active", fuel < 35);
  }
}

function renderExploreHUD() {
  const el = document.getElementById("routeHud");
  if (!el) return;

  const visited = state.exploreVisited || [];

  if (!visited.length) {
    const total = state.exploreMusicCities ? state.exploreMusicCities.length : 0;
    el.innerHTML = '<div class="explore-visited-title">Last visited:</div>' +
      '<div style="opacity:0.4; font-size:13px; padding:4px 2px;">No cities visited yet</div>' +
      `<div class="explore-counter">0 / ${total} locations discovered</div>`;
    return;
  }

  const total = state.exploreMusicCities ? state.exploreMusicCities.length : 0;
  const discovered = state.exploreDiscoveredSet ? state.exploreDiscoveredSet.size : 0;

  let html = '<div class="explore-visited-title">Last visited:</div><ul class="explore-visited-list">';
  for (const v of visited) {
    const safeCity = _escapeHtml(v.city);
    const safeCountry = _escapeHtml(v.country);
    html += `<li><span>🏢</span><span>${safeCity}, ${safeCountry}</span></li>`;
  }
  html += '</ul>';
  html += `<div class="explore-counter">${discovered} / ${total} locations discovered</div>`;
  el.innerHTML = html;
}
