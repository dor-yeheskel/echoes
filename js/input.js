/* ========= INPUT ========= */

const keyMap = {
  KeyW: "ArrowUp",
  KeyA: "ArrowLeft",
  KeyS: "ArrowDown",
  KeyD: "ArrowRight"
};

function normCode(e) {
  return keyMap[e.code] || e.code;
}

window.addEventListener("keydown", e => {
  if (e.repeat) return;
  const code = normCode(e);
  const isEnter = (code === "Enter" || code === "NumpadEnter");
  if (e.code === "KeyP") {
    if (e.key === "MediaTrackNext") return;
    togglePause();
    return;
  }

  
  if (code === "KeyM") {
    toggleMute();
    return;
  }

  if (state.paused) return;


  if (currentState === GAME_STATE.MENU) {
    if (code === "ArrowUp") {
      e.preventDefault();
      moveMenuSelection(-1);
      return;
    }

    if (code === "ArrowDown") {
      e.preventDefault();
      moveMenuSelection(+1);
      return;
    }
  }

  if (code === "Escape") {
    goToMenu();
    return;
  }

  if (isEnter) {
    e.preventDefault();

    // ✅ GAME OVER
    if (currentState === GAME_STATE.GAMEOVER) {
      document.getElementById("primaryActionBtn")?.click();
      return;
    }

    // ✅ MENU → Start
    if (currentState === GAME_STATE.MENU) {

      if (code === "ArrowUp" || code === "ArrowDown") {
        e.preventDefault();

        const options = [...levelSelectEl.options];
        let idx = levelSelectEl.selectedIndex;

        const dir = (code === "ArrowUp") ? -1 : 1;

        while (true) {
          idx += dir;
          if (idx < 0 || idx >= options.length) break;
          if (!options[idx].disabled) {
            levelSelectEl.selectedIndex = idx;
            break;
          }
        }

        return;
      }

      if (isEnter || code === "Space") {
        if (!state.levelId) return;
        playSound("clicked");
        loadLevel(state.levelId);
        startGame();
        return;
      }

    }
  }

  // ===== movement only during play =====
  if (currentState !== GAME_STATE.PLAYING) return;

  state.keys[code] = true;
});


window.addEventListener("blur", () => {  // must to prevent endless movement
  state.keys = {};
});


window.addEventListener("keyup", e => {
  const code = normCode(e);
  state.keys[code] = false;
});

window.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    state.keys = {};
    window.focus();
  }
});

map.getContainer().addEventListener("mousedown", e => {
  e.preventDefault();
  window.focus();
});