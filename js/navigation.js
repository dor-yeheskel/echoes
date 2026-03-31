/* ========= START / NAV ========= */
function startGame() {
  document.activeElement.blur();
  introEl.style.display = "none";
  endScreenEl.style.display = "none";

  // Hide theme button during gameplay
  const themeBtn = document.getElementById("themeBtn");
  if (themeBtn) themeBtn.style.display = "none";

  whiteFlash();

  setTimeout(() => {
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
  await loadCityIndex();

  // Hide loader, reveal content
  const introLoader = document.getElementById("introLoader");
  const introContent = document.getElementById("introContent");
  if (introLoader) introLoader.style.display = "none";
  if (introContent) introContent.style.display = "";

  // Show top-right buttons now that loading is done
  document.getElementById("themeBtn").style.display = "";
  document.getElementById("muteBtn").style.display = "";

  levelToData = window.LEVELS;
  levelOrder = Object.keys(window.LEVELS);

  // Initialize all UI element references
  hudLevelEl = document.getElementById("levelTitle");
  spdEl = document.getElementById("spd");
  targetsEl = document.getElementById("targets");
  
  introEl = document.getElementById("intro");
  endScreenEl = document.getElementById("endScreen");

  startBtn = document.getElementById("startBtn");

  muteBtn = document.getElementById("muteBtn");
  updateMuteUI();
  muteBtn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    toggleMute();
    muteBtn.blur();
  });

  // Theme toggle
  const themeBtn = document.getElementById("themeBtn");
  initTheme();
  if (themeBtn) {
    themeBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      toggleTheme();
      themeBtn.blur();
    });
  }

  
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

  // Restore last played selection
  const lastPlayed = localStorage.getItem("lastPlayedLevel");
  const exploreBtn = document.getElementById("exploreBtn");

  if (lastPlayed === "__explore__" && exploreBtn) {
    // Last session was explore mode
    exploreBtn.classList.add("selected");
  } else if (lastPlayed && levelOrder.includes(lastPlayed)) {
    // Last session was a specific level
    state.levelId = lastPlayed;
    const rows = document.querySelectorAll(".progressRow:not(.header)");
    rows.forEach((row, i) => {
      row.classList.toggle("selected", levelOrder[i] === lastPlayed);
    });
  } else {
    // Default: first level
    state.levelId = levelOrder[0];
    document.querySelector(".progressRow:not(.header)")?.classList.add("selected");
  }
  if (exploreBtn) {
    exploreBtn.addEventListener("click", () => {
      document.querySelectorAll(".progressRow.selected")
        .forEach(r => r.classList.remove("selected"));
      playSound("clicked");
      loadExploreMode();
      startGame();
    });
  }

  progress.unlockedCount = Math.max(
    1,
    Math.min(progress.unlockedCount || 1, levelOrder.length)
  );
  
  requestAnimationFrame(loop);
});