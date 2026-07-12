/* ============================================================
   MAIN MODULE
   Wires DOM events to State + Render. Owns modals, toasts,
   keyboard shortcuts, and import/export flows.
   ============================================================ */
(function () {
  const $ = Render.$;

  /* ---------------- Toasts ---------------- */
  function toast(msg, opts) {
    opts = opts || {};
    const c = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${Utils.escapeHtml(msg)}</span>`;
    if (opts.actionLabel && opts.onAction) {
      const btn = document.createElement('button');
      btn.textContent = opts.actionLabel;
      btn.onclick = () => { opts.onAction(); el.remove(); };
      el.appendChild(btn);
    }
    c.appendChild(el);
    setTimeout(() => el.remove(), opts.duration || 3600);
  }

  /* ---------------- Modal system ---------------- */
  const overlay = document.getElementById('modalOverlay');
  function openModal(id) {
    overlay.classList.add('open');
    Render.$$('.modal').forEach(m => m.classList.remove('show'));
    document.getElementById(id).classList.add('show');
  }
  function closeModal() {
    overlay.classList.remove('open');
    Render.$$('.modal').forEach(m => m.classList.remove('show'));
  }
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  Render.$$('[data-close]').forEach(btn => btn.addEventListener('click', closeModal));

  /* ---------------- Confirm dialog helper ---------------- */
  let confirmCallback = null;
  function showConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = onConfirm;
    openModal('confirmModal');
  }
  document.getElementById('confirmActionBtn').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
    closeModal();
  });

  /* ---------------- College modal ---------------- */
  let editingCollegeId = null;
  function openCollegeModal(collegeId) {
    editingCollegeId = collegeId || null;
    const c = collegeId ? State.getCollege(collegeId) : null;
    document.getElementById('collegeModalTitle').textContent = c ? 'Edit College' : 'Add College';
    $('#cf-name').value = c?.name || '';
    $('#cf-location').value = c?.location || '';
    $('#cf-university').value = c?.university || '';
    $('#cf-type').value = c?.type || 'Government';
    $('#cf-autonomous').value = String(c?.autonomous || false);
    $('#cf-naac').value = c?.naacGrade || '';
    $('#cf-website').value = c?.website || '';
    $('#cf-notes').value = c?.notes || '';
    document.getElementById('cf-delete').style.display = c ? 'inline-flex' : 'none';
    openModal('collegeModal');
    setTimeout(() => $('#cf-name').focus(), 60);
  }

  document.getElementById('addCollegeFab').addEventListener('click', () => openCollegeModal(null));

  document.getElementById('cf-save').addEventListener('click', () => {
    const name = $('#cf-name').value.trim();
    if (!name) { toast('College name is required'); $('#cf-name').focus(); return; }
    const fields = {
      name,
      location: $('#cf-location').value.trim(),
      university: $('#cf-university').value.trim(),
      type: $('#cf-type').value,
      autonomous: $('#cf-autonomous').value === 'true',
      naacGrade: $('#cf-naac').value.trim(),
      website: $('#cf-website').value.trim(),
      notes: $('#cf-notes').value.trim(),
    };
    if (editingCollegeId) {
      State.updateCollege(editingCollegeId, fields);
      toast('College updated');
      closeModal();
    } else {
      const c = State.addCollege(fields);
      toast('College added — now add its branches');
      closeModal();
      setTimeout(() => openBranchModal(null, c.id), 180);
    }
  });

  document.getElementById('cf-delete').addEventListener('click', () => {
    if (!editingCollegeId) return;
    const c = State.getCollege(editingCollegeId);
    showConfirm('Delete college?', `This removes "${c.name}" and all of its branches, including any rankings. This cannot be undone via the UI (use Ctrl+Z immediately after if needed).`, () => {
      State.deleteCollege(editingCollegeId);
      toast('College deleted');
    });
  });

  /* ---------------- Branch modal ---------------- */
  let editingBranchId = null;
  let selectedColor = null;

  function openBranchModal(branchId, presetCollegeId) {
    if (!State.data.colleges.length) {
      toast('Add a college first, then add its branches');
      openCollegeModal(null);
      return;
    }
    editingBranchId = branchId || null;
    const b = branchId ? State.getBranch(branchId) : null;
    document.getElementById('branchModalTitle').textContent = b ? 'Edit Branch' : 'Add Branch';
    Render.renderCollegeOptions(b?.collegeId || presetCollegeId || State.data.colleges[0].id);
    $('#bf-name').value = b?.name || '';
    $('#bf-cutoff').value = b?.cutoff ?? '';
    $('#bf-merit').value = b?.meritNumber ?? '';
    $('#bf-category').value = b?.category || '';
    $('#bf-notes').value = b?.notes || '';
    selectedColor = b?.color || null;
    Render.renderColorPicker(selectedColor);
    document.getElementById('bf-delete').style.display = b ? 'inline-flex' : 'none';
    openModal('branchModal');
    setTimeout(() => $('#bf-name').focus(), 60);
  }

  document.getElementById('bf-colorpicker').addEventListener('click', e => {
    const sw = e.target.closest('.swatch');
    if (!sw) return;
    selectedColor = sw.dataset.color || null;
    Render.renderColorPicker(selectedColor);
  });

  document.getElementById('bf-save').addEventListener('click', () => {
    const name = $('#bf-name').value.trim();
    const collegeId = $('#bf-college').value;
    if (!name) { toast('Branch name is required'); $('#bf-name').focus(); return; }
    if (!collegeId) { toast('Choose a college'); return; }
    const fields = {
      collegeId,
      name,
      cutoff: $('#bf-cutoff').value,
      meritNumber: $('#bf-merit').value,
      category: $('#bf-category').value.trim(),
      notes: $('#bf-notes').value.trim(),
      color: selectedColor,
    };
    if (editingBranchId) {
      State.updateBranch(editingBranchId, fields);
      toast('Branch updated');
    } else {
      State.addBranch(fields);
      toast('Branch added to Unranked');
    }
    closeModal();
  });

  document.getElementById('bf-delete').addEventListener('click', () => {
    if (!editingBranchId) return;
    showConfirm('Delete branch?', 'This branch will be permanently removed from your preference list.', () => {
      State.deleteBranch(editingBranchId);
      if (State.data.ui.selectedBranchId === editingBranchId) State.setSelectedBranch(null);
      toast('Branch deleted');
    });
  });

  /* Quick "+ Branch" entry point in unranked header */
  (function injectAddBranchButton() {
    const controls = document.querySelector('.unranked-controls');
    const btn = document.createElement('button');
    btn.className = 'tbtn';
    btn.style.background = 'var(--c-surface-2)';
    btn.innerHTML = `${Render.ICONS.plus}<span class="label">Branch</span>`;
    btn.title = 'Add branch (B)';
    btn.addEventListener('click', () => openBranchModal(null));
    controls.insertBefore(btn, controls.firstChild);
  })();

  /* ---------------- Card interactions (delegated) ---------------- */
  document.addEventListener('click', e => {
    // Close menus if clicking outside
    if (!e.target.closest('.college-menu-wrap')) {
      Render.$$('.college-menu.open').forEach(x => x.classList.remove('open'));
    }
    if (!e.target.closest('.branch-menu-wrap')) {
      Render.$$('.branch-menu.open').forEach(x => x.classList.remove('open'));
    }

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const card = actionBtn.closest('.branch-card');
      const id = card?.dataset.branchId;
      if (!id) return;
      e.stopPropagation();
      if (actionBtn.dataset.action === 'fav') State.toggleFavorite(id);
      if (actionBtn.dataset.action === 'pin') State.togglePin(id);
      return;
    }
    const collegeAction = e.target.closest('[data-college-action]');
    if (collegeAction) {
      const id = collegeAction.closest('.college-group')?.dataset.collegeId;
      if (!id) return;
      e.stopPropagation();
      const action = collegeAction.dataset.collegeAction;
      if (action === 'collapse') State.toggleCollegeCollapsed(id);
      if (action === 'edit') openCollegeModal(id);
      if (action === 'add-branch') openBranchModal(null, id);
      if (action === 'menu') {
        const wrap = collegeAction.closest('.college-menu-wrap');
        const menu = wrap?.querySelector('.college-menu');
        Render.$$('.college-menu.open').forEach(x => {
          x.classList.remove('open');
          x.closest('.college-group')?.classList.remove('has-open-menu');
        });
        Render.$$('.branch-menu.open').forEach(x => x.classList.remove('open'));
        if (menu) {
          menu.classList.toggle('open');
          // Elevate the group so the dropdown clears subsequent groups
          wrap.closest('.college-group')?.classList.toggle('has-open-menu', menu.classList.contains('open'));
        }
      }
      if (action === 'duplicate') { State.duplicateCollege(id); toast('College and its branches duplicated'); }
      if (action === 'delete') {
        const c = State.getCollege(id);
        showConfirm('Delete college?', `This removes "${c.name}" and all of its branches, including any rankings.`, () => { State.deleteCollege(id); toast('College deleted'); });
      }
      return;
    }
    // Click anywhere on college-group-header (outside action buttons) → toggle collapse
    const header = e.target.closest('.college-group-header');
    if (header && !e.target.closest('.college-actions')) {
      const id = header.closest('.college-group')?.dataset.collegeId;
      if (id) { State.toggleCollegeCollapsed(id); return; }
    }
    const branchAction = e.target.closest('[data-branch-action]');
    if (branchAction) {
      const card = branchAction.closest('.branch-card');
      const id = card?.dataset.branchId;
      if (!id) return;
      e.stopPropagation();
      const action = branchAction.dataset.branchAction;
      if (action === 'menu') {
        const menu = branchAction.closest('.branch-menu-wrap')?.querySelector('.branch-menu');
        Render.$$('.branch-menu.open').forEach(x => { if (x !== menu) x.classList.remove('open'); });
        Render.$$('.college-menu.open').forEach(x => x.classList.remove('open'));
        menu?.classList.toggle('open');
      }
      if (action === 'delete') {
        showConfirm('Delete branch?', 'This branch will be permanently removed from your preference list.', () => {
          if (State.data.ui.selectedBranchId === id) State.setSelectedBranch(null);
          State.deleteBranch(id);
          toast('Branch deleted');
        });
      }
      return;
    }
    if (e.target.closest('#emptyAddCollegeBtn')) {
      openCollegeModal(null);
      return;
    }
    const card = e.target.closest('.branch-card');
    if (card) {
      const id = card.dataset.branchId;
      if (State.data.ui.compareMode) {
        State.toggleCompareId(id);
        if (State.data.ui.compareIds.length >= 2) { Render.renderCompare(); openModal('compareModal'); }
      } else {
        State.setSelectedBranch(id);
        // Show details slide-over on mobile/tablet
        if (window.innerWidth < 1200) {
          document.body.classList.add('show-details');
        }
      }
    }
    
    // Mobile Tabs
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) {
      const tab = tabBtn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn === tabBtn));
      if (tab === 'ranking') {
        document.body.classList.add('show-ranking');
      } else {
        document.body.classList.remove('show-ranking');
      }
    }
    
    // Mobile Close Details Button
    const closeBtn = e.target.closest('.mobile-close-btn');
    if (closeBtn) {
      document.body.classList.remove('show-details');
    }
  });

  document.addEventListener('dblclick', e => {
    const card = e.target.closest('.branch-card');
    if (card) openBranchModal(card.dataset.branchId);
  });

  /* ---------------- Details panel actions (delegated, re-bound on render) ---------------- */
  document.getElementById('detailsBody').addEventListener('click', e => {
    const id = State.data.ui.selectedBranchId;
    if (!id) return;
    if (e.target.closest('#dp-edit')) openBranchModal(id);
    else if (e.target.closest('#dp-duplicate')) { State.duplicateBranch(id); toast('Branch duplicated'); }
    else if (e.target.closest('#dp-fav')) State.toggleFavorite(id);
    else if (e.target.closest('#dp-pin')) State.togglePin(id);
    else if (e.target.closest('#dp-unrank')) { State.unassignRank(id); toast('Moved to Unranked'); }
    else if (e.target.closest('#dp-delete')) {
      showConfirm('Delete branch?', 'This branch will be permanently removed from your preference list.', () => {
        State.deleteBranch(id); State.setSelectedBranch(null); toast('Branch deleted');
      });
    }
  });

  document.getElementById('detailsBody').addEventListener('input', e => {
    if (e.target.id === 'dp-notes') {
      const id = State.data.ui.selectedBranchId;
      if (id) State.patchBranchQuiet(id, { notes: e.target.value });
    }
  });

  /* ---------------- Search ---------------- */
  document.getElementById('searchInput').addEventListener('input', Utils.debounce(e => {
    State.setFilters({ search: e.target.value });
  }, 150));

  /* ---------------- Sort ---------------- */
  document.getElementById('sortSelect').addEventListener('change', e => State.setSort(e.target.value));

  /* ---------------- Favorites toggle ---------------- */
  document.getElementById('favFilterToggle').addEventListener('click', () => {
    State.setFilters({ favoritesOnly: !State.data.filters.favoritesOnly });
  });

  /* ---------------- Compare mode ---------------- */
  document.getElementById('compareToggle').addEventListener('click', () => {
    if (State.data.ui.compareMode && State.data.ui.compareIds.length >= 2) {
      Render.renderCompare();
      openModal('compareModal');
    } else {
      State.setCompareMode(!State.data.ui.compareMode);
      toast(State.data.ui.compareMode ? 'Compare mode on — click 2 to 4 cards' : 'Compare mode off');
    }
  });

  /* ---------------- Filters modal ---------------- */
  document.getElementById('filterBtn').addEventListener('click', () => { Render.renderFilterModal(); openModal('filterModal'); });
  document.getElementById('filterModalBody').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const key = chip.dataset.filterKey;
    const val = chip.dataset.filterVal;
    const list = State.data.filters[key].slice();
    const idx = list.indexOf(val);
    if (idx >= 0) list.splice(idx, 1); else list.push(val);
    State.setFilters({ [key]: list });
    Render.renderFilterModal();
  });
  ['#filter-cutoff-min', '#filter-cutoff-max', '#filter-merit-min', '#filter-merit-max'].forEach(sel => {
    document.querySelector(sel).addEventListener('change', () => {
      State.setFilters({
        cutoffMin: parseFloat($('#filter-cutoff-min').value) || null,
        cutoffMax: parseFloat($('#filter-cutoff-max').value) || null,
        meritMin: parseInt($('#filter-merit-min').value) || null,
        meritMax: parseInt($('#filter-merit-max').value) || null,
      });
    });
  });
  document.getElementById('filter-clear').addEventListener('click', () => { State.clearFilters(); Render.renderFilterModal(); });

  /* ---------------- Stats modal ---------------- */
  document.getElementById('statsBtn').addEventListener('click', () => { Render.renderStats(); openModal('statsModal'); });

  /* ---------------- Settings modal ---------------- */
  function renderSettingsSwitches() {
    Render.$$('#settingsModal .switch[data-setting]').forEach(sw => {
      sw.classList.toggle('on', !!State.data.settings[sw.dataset.setting]);
    });
  }
  document.getElementById('settingsBtn').addEventListener('click', () => { renderSettingsSwitches(); openModal('settingsModal'); });
  Render.$$('#settingsModal .switch[data-setting]').forEach(sw => {
    sw.addEventListener('click', () => {
      State.setSetting(sw.dataset.setting, !State.data.settings[sw.dataset.setting]);
      renderSettingsSwitches();
    });
  });
  document.getElementById('set-reset').addEventListener('click', () => {
    showConfirm('Reset everything?', 'This permanently erases every college, branch, and ranking from Local Storage. This cannot be undone.', () => {
      State.resetEverything();
      toast('Application reset');
      closeModal();
    });
  });

  /* ---------------- Export ---------------- */
  document.getElementById('exportBtn').addEventListener('click', e => {
    showExportMenu(e.currentTarget);
  });

  function showExportMenu(anchor) {
    const existing = document.getElementById('exportMenu');
    if (existing) { existing.remove(); return; }
    const menu = document.createElement('div');
    menu.id = 'exportMenu';
    menu.style.cssText = `position:absolute; background:var(--c-surface); border:1px solid var(--c-border); border-radius:12px; box-shadow:var(--shadow-3); padding:6px; z-index:150; min-width:170px;`;
    const rect = anchor.getBoundingClientRect();
    menu.style.top = (rect.bottom + 6 + window.scrollY) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    const opts = [
      ['Export JSON backup', exportJSON],
      ['Export CSV (branches)', exportCSV],
      ['Print / PDF-friendly view', printView],
    ];
    opts.forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'display:block; width:100%; text-align:left; padding:9px 10px; border-radius:8px; font-size:12.5px;';
      b.onmouseenter = () => b.style.background = 'var(--c-surface-2)';
      b.onmouseleave = () => b.style.background = 'none';
      b.onclick = () => { fn(); menu.remove(); };
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', function h(ev) {
      if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', h); }
    }), 0);
  }

  function exportJSON() {
    const data = State.exportData();
    Utils.downloadFile(`cap-preferences-${dateStamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
    State.setSetting('lastBackupAt', Date.now());
    toast('JSON backup downloaded');
  }

  function exportCSV() {
    const headers = ['Rank', 'College', 'Location', 'CollegeType', 'Autonomous', 'University', 'Branch', 'Cutoff', 'MeritNumber', 'Category', 'Favorite', 'Pinned', 'Color', 'Notes'];
    const rows = State.data.branches
      .slice()
      .sort((a, b) => (a.rank ?? 99999) - (b.rank ?? 99999))
      .map(b => {
        const c = State.getCollege(b.collegeId) || {};
        return [b.rank ?? '', c.name || '', c.location || '', c.type || '', c.autonomous ? 'Yes' : 'No', c.university || '', b.name, b.cutoff ?? '', b.meritNumber ?? '', b.category, b.favorite ? 'Yes' : 'No', b.pinned ? 'Yes' : 'No', b.color || '', b.notes];
      });
    Utils.downloadFile(`cap-preferences-${dateStamp()}.csv`, Utils.toCSV(headers, rows), 'text/csv');
    toast('CSV exported');
  }

  function printView() {
    const ranked = State.data.branches.filter(b => b.rank !== null).sort((a, b) => a.rank - b.rank);
    const win = window.open('', '_blank');
    const rowsHtml = ranked.map(b => {
      const c = State.getCollege(b.collegeId) || {};
      return `<tr><td>${b.rank}</td><td>${Utils.escapeHtml(c.name || '')}</td><td>${Utils.escapeHtml(b.name)}</td><td>${Utils.fmtNum(b.cutoff)}</td><td>${b.meritNumber ?? ''}</td><td>${Utils.escapeHtml(c.type || '')}</td></tr>`;
    }).join('');
    win.document.write(`<html><head><title>CAP Preference List</title><style>
      body{font-family:-apple-system,Arial,sans-serif; padding:32px; color:#1D1D1F;}
      h1{font-size:20px;} table{width:100%; border-collapse:collapse; margin-top:16px;}
      th,td{border-bottom:1px solid #E3E3E7; text-align:left; padding:8px 10px; font-size:12.5px;}
      th{color:#6E6E73; text-transform:uppercase; font-size:10.5px; letter-spacing:0.03em;}
      </style></head><body><h1>CAP Preference List</h1><p>${ranked.length} ranked choices · generated ${new Date().toLocaleDateString()}</p>
      <table><thead><tr><th>Rank</th><th>College</th><th>Branch</th><th>Cutoff</th><th>Merit No.</th><th>Type</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  function dateStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /* ---------------- Import ---------------- */
  document.getElementById('importBtn').addEventListener('click', () => openModal('importModal'));

  document.getElementById('import-json-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        showConfirm('Overwrite current data?', 'Importing this backup will replace all current colleges, branches, and rankings.', () => {
          State.importJSON(obj);
          toast('Backup restored');
          closeModal();
        });
      } catch (err) {
        toast('That file is not valid JSON');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('import-csv-btn').addEventListener('click', () => {
    const text = $('#import-csv-text').value.trim();
    if (!text) { toast('Paste some CSV text first'); return; }
    const rows = Utils.parseCSV(text);
    if (rows.length < 2) { toast('Could not find data rows'); return; }
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const idx = name => headers.indexOf(name);
    const iCollege = idx('college'), iBranch = idx('branch'), iCutoff = idx('cutoff'),
      iMerit = idx('merit'), iCategory = idx('category'), iRemarks = idx('remarks');
    if (iCollege < 0 || iBranch < 0) { toast('CSV needs at least College and Branch columns'); return; }

    let createdColleges = 0, createdBranches = 0;
    const collegeByName = new Map(State.data.colleges.map(c => [c.name.toLowerCase(), c]));
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const collegeName = (row[iCollege] || '').trim();
      const branchName = (row[iBranch] || '').trim();
      if (!collegeName || !branchName) continue;
      let college = collegeByName.get(collegeName.toLowerCase());
      if (!college) {
        college = State.addCollege({ name: collegeName, type: 'Government' });
        collegeByName.set(collegeName.toLowerCase(), college);
        createdColleges++;
      }
      State.addBranch({
        collegeId: college.id,
        name: branchName,
        cutoff: iCutoff >= 0 ? row[iCutoff] : '',
        meritNumber: iMerit >= 0 ? row[iMerit] : '',
        category: iCategory >= 0 ? row[iCategory] : '',
        notes: iRemarks >= 0 ? row[iRemarks] : '',
      });
      createdBranches++;
    }
    toast(`Imported ${createdBranches} branch(es) across ${createdColleges} new college(s)`);
    $('#import-csv-text').value = '';
    closeModal();
  });

  /* ---------------- Rank slot management ---------------- */
  document.getElementById('addRankSlotsBtn').addEventListener('click', () => State.addRankSlots(20));

  /* ---------------- Keyboard shortcuts ---------------- */
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

    if (e.key === 'Escape') { closeModal(); return; }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (State.undo()) toast('Undone'); else toast('Nothing to undo');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      if (State.redo()) toast('Redone'); else toast('Nothing to redo');
      return;
    }

    if (typing) return; // don't hijack normal typing

    if (e.key === '/') { e.preventDefault(); document.getElementById('searchInput').focus(); return; }
    if (e.key.toLowerCase() === 'n') { openCollegeModal(null); return; }
    if (e.key.toLowerCase() === 'b') { openBranchModal(null); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const id = State.data.ui.selectedBranchId;
      if (id) {
        showConfirm('Delete branch?', 'This branch will be permanently removed from your preference list.', () => {
          State.deleteBranch(id); State.setSelectedBranch(null); toast('Branch deleted');
        });
      }
      return;
    }
    if (e.key === 'Enter') {
      const id = State.data.ui.selectedBranchId;
      if (id) openBranchModal(id);
      return;
    }
  });

  /* ---------------- Backup reminder ---------------- */
  function maybeShowBackupReminder() {
    if (!State.data.settings.backupReminder) return;
    const last = State.data.settings.lastBackupAt;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (State.data.branches.length > 0 && (!last || Date.now() - last > weekMs)) {
      toast("It's been a while — consider exporting a backup", { actionLabel: 'Export now', onAction: exportJSON, duration: 6000 });
    }
  }

  /* ---------------- Init ---------------- */
  State.init();
  State.onChange(() => Render.renderAll());
  Render.renderAll();
  DragDrop.init();
  setTimeout(maybeShowBackupReminder, 1200);
})();
