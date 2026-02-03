/* ========= UI & PROGRESS ========= */

function renderProgressTable() {
  const el = document.getElementById("progressTable");

  let html = `
    <div class="progressRow header">
      <div>#</div>
      <div>Mission</div>
      <div>Rank</div>
      <div>Score</div>
    </div>
  `;

  for (let i = 0; i < levelOrder.length; i++) {
    const id = levelOrder[i];
    const lvl = levelToData[id];
    const data = progress.scores[id];
    const unlocked = i < progress.unlockedCount;

    html += `
      <div class="progressRow
        ${unlocked ? "" : "locked"}
        ${unlocked && !data ? "unplayed" : ""}
        "
        data-level-id="${id}">
        <div class="mission-index">${i + 1}</div>
        <div>${lvl.displayName}</div>
        <div class="${data?.rank?.includes('Gold') ? 'rank-gold' : ''}">
          ${!unlocked ? "🔒" : (data ? data.rank : "—")}
        </div>
          <div class="${data?.score === 1000 ? 'score-max' : ''}">
            ${!unlocked ? "🔒" : (data ? data.score : "—")}
          </div>
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

function updateHUD() {
  setHUDValue("hud-bombs", state.bombs);
  setHUDValue("hud-stealth", state.stealthUses);
  setHUDValue("hud-targets", entities.remainingTargets);

  const rtbEl = document.getElementById("returnToBaseIndicator");
  if (rtbEl) {
    const needReturnToBase =
      state.hasBase &&
      state.bombs === 0 &&
      entities.bombs.length === 0 &&
      !state.gameOver &&
      state.gameStarted;

    rtbEl.classList.toggle("active", needReturnToBase);
  }
}

function setHUDValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === "hud-stealth" && value === 0) {
    el.textContent = "—";
    el.classList.remove("hud-zero");
    return;
  }
  el.textContent = value;
  el.style.color = "";
  if (id === "hud-targets" && value === 0) {
    el.style.color = "#7CFFB2";
  }
  if (
    value === 0 &&
    (id === "hud-bombs" || id === "hud-stealth")
  ) {
    el.classList.add("hud-zero");
  } else {
    el.classList.remove("hud-zero");
  }


  el.classList.remove("bump");
  void el.offsetWidth; // force reflow
  el.classList.add("bump");

}

function animateNumber(el, from, to, duration = 600) {
  const start = performance.now();

  function step(t) {
    const p = Math.min(1, (t - start) / duration);
    const value = Math.floor(from + (to - from) * p);
    el.textContent = value;
    if (p < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
