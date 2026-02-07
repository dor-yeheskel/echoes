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

  const route = state.route || [];
  const idx = state.routeIndex ?? 0;

  let html = "";

  for (let i = 0; i < route.length; i++) {
    const name = route[i].name || route[i].id || `#${i + 1}`;

    if (i < idx) {
      html += `<div class="route-done">● ${name}</div>`;
    } else if (i === idx) {
      html += `<div class="route-current">● ${name}</div>`;
    } else {
      html += `<div class="route-next">○ ${name}</div>`;
    }
  }

  el.innerHTML = html;
}
