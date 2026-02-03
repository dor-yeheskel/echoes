/* ========= GAME OVER / VICTORY ========= */

function gameOverHandler() {
  currentState = GAME_STATE.GAMEOVER;
  const title = document.getElementById("endTitle");
  title.textContent = "MISSION FAILED";
  title.className = "end-fail";

  if (entities.targets.length === 0) {
    console.warn("Victory on level with no targets — skipping scoring");
  }

  const destroyed =
    (levelToData[state.levelId].targetLocations?.length || 0)
    - entities.remainingTargets;

  document.getElementById("endSubtitle").innerHTML = `
    Destroyed ${destroyed} targets — ${entities.remainingTargets} left 🤦‍♂️
  `;

  const btn = document.getElementById("primaryActionBtn");
  btn.textContent = "Retry";
  btn.onclick = () => restartLevel();

  endScreenEl.style.display = "flex";
  endScreenEl.focus();
}

function goToMenu() {
  if (state.levelId) localStorage.setItem("lastPlayedLevel", state.levelId);

  state.gameStarted = false;
  state.gameOver = false;
  currentState = GAME_STATE.MENU;

  endScreenEl.style.display = "none";
  introEl.style.display = "flex";

  // highlight selected level in progress table
  const rows = document.querySelectorAll(".progressRow:not(.header)");
  rows.forEach((row, i) => {
    row.classList.toggle("selected", levelOrder[i] === state.levelId);
  });

}

function victoryHandler() {
  state.gameOver = true;
  currentState = GAME_STATE.GAMEOVER;
  playSound("victory");
  const levelId = state.levelId;
  const nextIndex = state.levelIndex + 1;
  const nextLevel = levelOrder[nextIndex];

  // ===== SCORE =====
  const result = calculateScoreBreakdown();
  const score = result.score;
  const breakdown = result.breakdown;
  if (!breakdown) {
    console.error("Victory reached but score breakdown is null", {
      score,
      result
    });
    return;
  }

  const rank = getRank(score);

  // ===== SAVE PROGRESS =====
  const prev = progress.scores[levelId];

  const newScore = {
    score,
    rank,
    targets: breakdown.targets,
    bombsUsed: breakdown.bombsUsed,
    stealthUsed: breakdown.stealthUsed
  };


  let isNewRecord = false;

  if (!prev) {
    progress.scores[levelId] = newScore;
  } else if (newScore.score > prev.score) {
    progress.scores[levelId] = newScore;
    isNewRecord = true;
  }


  progress.unlockedLevels ||= [];
  if (nextLevel && !progress.unlockedLevels.includes(nextLevel)) {
    progress.unlockedLevels.push(nextLevel);
  }
  progress.unlockedCount = Math.max(
    progress.unlockedCount,
    progress.unlockedLevels.length + 1
  );


  saveProgress(progress);
  localStorage.setItem("lastPlayedLevel", state.levelId);
  renderProgressTable();

  // ===== UI =====
  const title = document.getElementById("endTitle");
  title.textContent = "MISSION COMPLETE 🎉";
  title.className = "end-win";


  document.getElementById("endSubtitle").innerHTML = `
    <div id="scoreBreakdown">
      <div class="scoreRow">
        <span>Targets</span>
        <span id="targetsCount">0</span>
      </div>

      <div class="scoreRow">
        <span>Bombs used</span>
        <span id="bombsUsedCount">0</span>
      </div>

      <div class="scoreRow" id="stealthRow">
        <span>Stealth used</span>
        <span id="stealthCount">0</span>
      </div>

      <hr class="scoreDivider">

      <div class="finalScore">
        <span>Final Score</span>
        <span id="finalScore">0</span>
      </div>

      <div id="rankDisplay"></div>

    </div>


  `;

  const targetsEl = document.getElementById("targetsCount");
  const bombsEl = document.getElementById("bombsUsedCount");

  const stealthEl = document.getElementById("stealthCount");
  const finalEl = document.getElementById("finalScore");
  const rankEl = document.getElementById("rankDisplay");

  const hintPrimary = document.getElementById("endHintPrimary");
  const hintSecondary = document.getElementById("endHintSecondary");

  // reset
  bombsEl.textContent = "0";
  stealthEl.textContent = "0";
  finalEl.textContent = "0";

  // hide stealth if 0
  if (breakdown.stealthUsed === 0) {
    document.getElementById("stealthRow").style.display = "none";
  }

  setTimeout(() => {
    animateNumber(
      targetsEl,
      0,
      breakdown.targets,
      600
    );
  }, 200);

  setTimeout(() => {
    animateNumber(
      bombsEl,
      0,
      breakdown.bombsUsed,
      600
    );
  }, 800);

  if (breakdown.stealthUsed > 0) {
    setTimeout(() => {
      animateNumber(
        stealthEl,
        0,
        breakdown.stealthUsed,
        600
      );
    }, 1200);
  }

  setTimeout(() => {
    animateNumber(finalEl, 0, score, 900);
  }, 1700);

  const isPerfect = score === 1000;
  setTimeout(() => {
    if (isPerfect) {
      finalEl.classList.add("score-perfect");
    }
  }, 1700 + 900);
  
  setTimeout(() => {
    rankEl.style.display = "block";
    rankEl.style.opacity = "1";
    rankEl.textContent = rank; 
    rankEl.classList.toggle("rank-gold", rank.includes('Gold'));
  }, 2600);

  if (isNewRecord) {
    setTimeout(() => {
      document.getElementById("endSubtitle").innerHTML += `
        <div style="margin-top:12px; color:#00ff88; font-weight:700;">
          🏆 NEW RECORD
        </div>
      `;
    }, 3000);
  }

  const btn = document.getElementById("primaryActionBtn");

  if (nextLevel) {
    // normal victory → next level
    btn.style.display = "inline-block";
    btn.textContent = "▶ NEXT LEVEL";
    btn.onclick = () => {
      loadLevel(nextLevel);
      stopAllSounds();
      startGame();
    };
    hintPrimary.textContent = "Press Enter to continue";
    hintSecondary.style.display = "block";
  } else {
    // final victory → no button, keyboard only
    btn.style.display = "none";
    btn.onclick = () => goToMenu();
    hintPrimary.textContent = "Press Enter to return to menu";
    hintSecondary.style.display = "none";
  }

  endScreenEl.style.display = "flex";
  endScreenEl.focus();
  if (!nextLevel) {
    showFinalCompletionOnce();
  }
}


function showFinalCompletionOnce() {
  const KEY = "flight_game_completed_once";

  // already shown before
  if (localStorage.getItem(KEY)) return;

  const el = document.createElement("div");
  el.className = "final-complete";
  el.textContent = "✈️ FINAL MISSION COMPLETE";

  endScreenEl.appendChild(el);

  // fade in
  requestAnimationFrame(() => {
    el.classList.add("show");
  });

  // fade out & cleanup
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 600);
  }, 2200);

  localStorage.setItem(KEY, "1");
}
