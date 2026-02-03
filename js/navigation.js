/* ========= START / NAV ========= */

function startGame() {
  document.activeElement.blur();
  introEl.style.display = "none";
  endScreenEl.style.display = "none";

  whiteFlash();
  
  setTimeout(() => {
    state.bombsUsed = 0;
    state.stealthUsed = 0;
    state.gameStarted = true;
    state.gameOver = false;
    currentState = GAME_STATE.PLAYING;
  }, 70);
}

function restartLevel() {
  stopAllSounds();
  document.activeElement.blur();
  loadLevel(state.levelId);
  startGame();
}


function nextLevel() {
  const nextIndex = Math.min(levelOrder.length - 1, state.levelIndex + 1);
  loadLevel(levelOrder[nextIndex]);
}

/* ========= BOOT ========= */

window.addEventListener('DOMContentLoaded', async function() {
  const isMobile = window.matchMedia(
    "(hover: none) and (pointer: coarse)"
  ).matches;

  if (isMobile) {
    document.getElementById("mobileBlocker")?.classList.add("active");
    return;
  }

  await loadLevels();
  levelToData = window.LEVELS;
  levelOrder = Object.keys(window.LEVELS);

  // Initialize all UI element references
  hudLevelEl = document.getElementById("levelTitle");
  spdEl = document.getElementById("spd");
  bombsEl = document.getElementById("bombs");
  targetsEl = document.getElementById("targets");
  stealthEl = document.getElementById("stealth");
  
  introEl = document.getElementById("intro");
  endScreenEl = document.getElementById("endScreen");
  
  endRankEl = document.getElementById("endRank");
  endScoreEl = document.getElementById("endScore");
  endStealthEl = document.getElementById("endStealth");
  endBombsEl = document.getElementById("endBombs");
  endRadarsEl = document.getElementById("endRadars");

  startBtn = document.getElementById("startBtn");

  muteBtn = document.getElementById("muteBtn");
  updateMuteUI();
  muteBtn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    toggleMute();
    muteBtn.blur();
  });

  
  // Create plane marker now that map exists
  planeIcon = L.divIcon({
    html: `<div id="plane" class="plane">✈️</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    className: ""
  });

  planeMarker = L.marker([state.lat, state.lng], {
    icon: planeIcon,
    pane: "planePane"
  }).addTo(map);
  
  renderProgressTable();
  state.levelId = levelOrder[0];
  document.querySelector(".progressRow:not(.header)")?.classList.add("selected");

  progress.unlockedCount = Math.max(
    1,
    Math.min(progress.unlockedCount || 1, levelOrder.length)
  );
  
  window.addEventListener("beforeunload", () => {
    if (state.levelId) {
      localStorage.setItem("lastPlayedLevel", state.levelId);
    }
  });
  
  requestAnimationFrame(loop);
});