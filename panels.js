/* ============================================================
   PANEL RESIZE — VS Code / Figma-style drag handles
   Manages: --panel-left-w  (left panel px)
            --panel-right-w (right panel px)
   Center panel fills the remaining space automatically (1fr).
   ============================================================ */
window.PanelResize = (function () {

  /* ---- Constants ---- */
  const STORAGE_KEY = 'cap_panel_widths';
  const HANDLE_W    = 5;  // px, handle slot width in the grid
  const DEFAULTS    = { left: 262, right: 296 };
  const MIN         = { left: 240, center: 380, right: 240 };

  /* ---- State ---- */
  let leftW  = DEFAULTS.left;
  let rightW = DEFAULTS.right;
  let activeHandle = null;  // 'left' | 'right'
  let startX, startLeft, startRight;
  let rafId     = null;
  let pendingX  = null;

  /* ---- Init ---- */
  function init () {
    const saved = load();
    leftW  = clamp(saved.left  ?? DEFAULTS.left,  MIN.left,  window.innerWidth * 0.40);
    rightW = clamp(saved.right ?? DEFAULTS.right, MIN.right, window.innerWidth * 0.40);
    applyWidths();

    const hL = document.getElementById('handleLeft');
    const hR = document.getElementById('handleRight');
    if (hL) { hL.addEventListener('mousedown', onMouseDown); hL.addEventListener('dblclick', resetWidths); }
    if (hR) { hR.addEventListener('mousedown', onMouseDown); hR.addEventListener('dblclick', resetWidths); }
  }

  /* ---- Drag start ---- */
  function onMouseDown (e) {
    e.preventDefault();
    activeHandle = e.currentTarget.dataset.handle;
    startX      = e.clientX;
    startLeft   = leftW;
    startRight  = rightW;
    pendingX    = null;

    document.body.classList.add('is-resizing');
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseup',   onMouseUp);
    rafId = requestAnimationFrame(rafLoop);
  }

  function onMouseMove (e) { pendingX = e.clientX; }

  /* ---- 60 fps loop ---- */
  function rafLoop () {
    if (pendingX !== null) {
      const dx  = pendingX - startX;
      const app = document.querySelector('.app-layout');
      const totalW = app ? app.offsetWidth : window.innerWidth;
      const avail  = totalW - HANDLE_W * 2;

      if (activeHandle === 'left') {
        let nL = startLeft + dx;
        // Respect center minimum
        const centerAfter = avail - nL - rightW;
        if (centerAfter < MIN.center) nL = avail - MIN.center - rightW;
        leftW = clamp(nL, MIN.left, avail - MIN.center - rightW);
      } else {
        let nR = startRight - dx;
        const centerAfter = avail - leftW - nR;
        if (centerAfter < MIN.center) nR = avail - leftW - MIN.center;
        rightW = clamp(nR, MIN.right, avail - leftW - MIN.center);
      }

      applyWidths();
      pendingX = null;
    }
    rafId = requestAnimationFrame(rafLoop);
  }

  /* ---- Drag end ---- */
  function onMouseUp () {
    cancelAnimationFrame(rafId);
    rafId = pendingX = null;
    activeHandle = null;
    document.body.classList.remove('is-resizing');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);
    save();
  }

  /* ---- Apply CSS vars ---- */
  function applyWidths () {
    const root = document.documentElement;
    root.style.setProperty('--panel-left-w',  leftW  + 'px');
    root.style.setProperty('--panel-right-w', rightW + 'px');
  }

  /* ---- Double-click reset ---- */
  function resetWidths () {
    leftW  = DEFAULTS.left;
    rightW = DEFAULTS.right;
    applyWidths();
    save();
  }

  /* ---- Persist ---- */
  function save () {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: leftW, right: rightW })); } catch (_) {}
  }
  function load () {
    try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {}; } catch (_) { return {}; }
  }

  function clamp (val, lo, hi) { return Math.max(lo, Math.min(hi, val)); }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => PanelResize.init());
