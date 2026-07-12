/* ============================================================
   DRAG & DROP MODULE
   Native HTML5 drag/drop. Handles:
   - dragging a card from Unranked into a Rank slot (assign)
   - dragging a card between two Rank slots (swap)
   - dragging a card from a Rank slot back to Unranked (unassign)
   - auto-scroll of the ranking list while dragging near edges
   ============================================================ */
window.DragDrop = (function () {
  let draggedId = null;
  let autoScrollRAF = null;
  let scrollTarget = null;
  let pointerY = 0;

  function init() {
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('dragend', onDragEnd);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
  }

  function onDragStart(e) {
    const card = e.target.closest('.branch-card');
    if (!card) return;
    draggedId = card.dataset.branchId;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', draggedId); } catch (err) {}
    startAutoScroll();
  }

  function onDragEnd(e) {
    const card = e.target.closest('.branch-card');
    if (card) card.classList.remove('dragging');
    draggedId = null;
    stopAutoScroll();
    Render.$$('.drop-hover').forEach(el => el.classList.remove('drop-hover'));
  }

  function onDragOver(e) {
    const slot = e.target.closest('.rank-slot');
    const unrankedList = e.target.closest('#unrankedList');
    updateAutoScrollTarget(e);
    if (slot || unrankedList) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (slot) {
        Render.$$('.rank-slot.drop-hover').forEach(el => { if (el !== slot) el.classList.remove('drop-hover'); });
        slot.classList.add('drop-hover');
      }
    }
  }

  function onDragLeave(e) {
    const slot = e.target.closest('.rank-slot');
    if (slot && !slot.contains(e.relatedTarget)) slot.classList.remove('drop-hover');
  }

  function onDrop(e) {
    const slot = e.target.closest('.rank-slot');
    const unrankedList = e.target.closest('#unrankedList');
    if (!slot && !unrankedList) return;
    e.preventDefault();

    const id = draggedId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
    if (!id) return;

    if (slot) {
      const rank = Number(slot.dataset.rank);
      State.assignRank(id, rank);
      slot.classList.remove('drop-hover');
    } else if (unrankedList) {
      State.unassignRank(id);
    }
  }

  /* ---- Auto-scroll either independently scrollable work area while dragging ---- */
  function startAutoScroll() {
    document.addEventListener('dragover', updateAutoScrollTarget);
    autoScrollRAF = requestAnimationFrame(autoScrollStep);
  }

  function updateAutoScrollTarget(e) {
    if (!draggedId) return;
    pointerY = e.clientY;
    const rankList     = document.getElementById('rankList');
    const unrankedList = document.getElementById('unrankedList');
    const rankingPanel = document.getElementById('rankingPanel');
    const unrankedPanel = document.getElementById('unrankedPanel') ||
                          document.querySelector('.unranked-section');

    if (!rankList || !unrankedList) { scrollTarget = null; return; }

    // Determine which panel column the pointer is currently over by X position.
    scrollTarget = null;
    const candidates = [
      { list: rankList,     panel: rankingPanel },
      { list: unrankedList, panel: unrankedPanel },
    ];
    for (const { list, panel } of candidates) {
      if (!panel) continue;
      const r = panel.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right) {
        scrollTarget = list;
        break;
      }
    }
  }

  function autoScrollStep() {
    if (!draggedId) return;
    if (scrollTarget) {
      const rect    = scrollTarget.getBoundingClientRect();
      const margin  = 52;
      let distance  = 0;
      if (pointerY - rect.top < margin)      distance = pointerY - rect.top - margin;
      else if (rect.bottom - pointerY < margin) distance = margin - (rect.bottom - pointerY);
      if (distance) {
        const speed = Math.sign(distance) * Math.ceil(4 + Math.min(16, Math.abs(distance) * 0.3));
        scrollTarget.scrollTop += speed;
      }
    }
    autoScrollRAF = requestAnimationFrame(autoScrollStep);
  }

  function stopAutoScroll() {
    document.removeEventListener('dragover', updateAutoScrollTarget);
    if (autoScrollRAF) cancelAnimationFrame(autoScrollRAF);
    autoScrollRAF = null;
    scrollTarget = null;
  }

  return { init };
})();
