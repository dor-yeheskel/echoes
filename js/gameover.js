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


function showFinalCompletionOnce() {
  const KEY = "flight_game_completed_once";

  // already shown before
  if (localStorage.getItem(KEY)) return;

  const el = document.createElement("div");
  el.className = "final-complete";
  el.textContent = "✈️ ALL ROUTES COMPLETED";

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


function endLevel() {
  if (state.gameOver) return;

  state.gameOver = true;
  state.gameStarted = false;

  const currentIndex = state.levelIndex;
  const nextIndex = currentIndex + 1;

  // ---- unlock next level ----
  if (progress.unlockedCount < nextIndex + 1) {
    progress.unlockedCount = nextIndex + 1;
  }

  progress.completedLevels ||= [];
  if (!progress.completedLevels.includes(state.levelId)) {
    progress.completedLevels.push(state.levelId);
  }

  saveProgress(progress);
  localStorage.setItem("lastPlayedLevel", state.levelId);

  renderProgressTable();

  // ---- use existing game over screen ----
  endLevelHandler();
}


function crash() {
  if (state.gameOver) return;

  state.gameOver = true;
  state.gameStarted = false;
  currentState = GAME_STATE.GAMEOVER;

  stopAllSounds({ fade: true, duration: 600 });
  playSound("defeat");

  endCrashHandler();
}


/* ========= GAME OVER UI ========= */
function endLevelHandler() {
  currentState = GAME_STATE.GAMEOVER;

  const title = document.getElementById("endTitle");
  title.textContent = "LEVEL COMPLETE";
  title.className = "end-win";

  document.getElementById("endSubtitle").innerHTML = `
    Route completed ✈️
  `;

  const btn = document.getElementById("primaryActionBtn");

  const hasNext = state.levelIndex < levelOrder.length - 1;

  if (hasNext) {
    btn.style.display = "inline-block";
    btn.textContent = "Next Level";
    btn.onclick = () => {
      loadLevel(levelOrder[state.levelIndex + 1]);
      startGame();
    };
  } else {
    btn.style.display = "inline-block";
    btn.textContent = "Back to Menu";
    btn.onclick = () => goToMenu();
    showFinalCompletionOnce();
  }

  endScreenEl.style.display = "flex";
  endScreenEl.focus();
}


function endCrashHandler() {
  const title = document.getElementById("endTitle");
  title.textContent = "CRASHED";
  title.className = "end-fail";

  document.getElementById("endSubtitle").innerHTML = `
    Out of fuel ✈️
  `;

  const btn = document.getElementById("primaryActionBtn");
  btn.style.display = "inline-block";
  btn.textContent = "Retry";
  btn.onclick = () => {
    loadLevel(state.levelId);
    startGame();
  };

  endScreenEl.style.display = "flex";
  endScreenEl.focus();
}
