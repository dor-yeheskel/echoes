/* ========= FX ========= */
function whiteFlash(duration = 160) {
  const el = document.getElementById("flashOverlay");
  if (!el) return;

  el.classList.add("active");
  
  setTimeout(() => {
    el.classList.remove("active");
  }, duration);
}
