/* ============================================================
   STATE MODULE
   Single source of truth for the whole app. Owns colleges,
   branches, filters, settings, selection, and an undo/redo
   history stack. All mutation happens through the functions
   exposed here — nothing else writes to `data` directly.
   ============================================================ */
window.State = (function () {
  const COLOR_LABELS = {
    green:  { name: 'Dream',    hex: '#2FA84F' },
    blue:   { name: 'Safe',     hex: '#0071E3' },
    yellow: { name: 'Moderate', hex: '#C58A00' },
    red:    { name: 'Backup',   hex: '#D6412C' },
    purple: { name: 'Research', hex: '#7A4FE0' },
    grey:   { name: 'Avoid',    hex: '#6E6E73' },
  };

  const DEFAULT_SETTINGS = {
    compactDensity: false,
    autoExpand: true,
    backupReminder: true,
    animationSpeed: 'normal',
    lastBackupAt: null,
  };

  const DEFAULT_FILTERS = {
    search: '',
    type: [],        // Government / Aided / Private
    autonomous: [],  // 'true' / 'false'
    university: [],
    category: [],
    branch: [],
    cutoffMin: null,
    cutoffMax: null,
    meritMin: null,
    meritMax: null,
    favoritesOnly: false,
  };

  let data = {
    colleges: [],
    branches: [],
    settings: { ...DEFAULT_SETTINGS },
    filters: { ...DEFAULT_FILTERS },
    sort: 'manual',
    maxRankSlots: 60,
    ui: { selectedBranchId: null, compareMode: false, compareIds: [], collapsedCollegeIds: [] },
  };

  let history = [];   // undo stack of JSON snapshots
  let future = [];     // redo stack
  const HISTORY_LIMIT = 60;

  let listeners = [];
  function onChange(fn) { listeners.push(fn); }
  function emit(reason) { listeners.forEach(fn => fn(reason)); }

  const persist = Utils.debounce(() => Storage.save(data), 200);

  function snapshot() {
    // exclude transient ui state from undo snapshots
    return JSON.stringify({ colleges: data.colleges, branches: data.branches, maxRankSlots: data.maxRankSlots });
  }

  function pushHistory() {
    history.push(snapshot());
    if (history.length > HISTORY_LIMIT) history.shift();
    future = [];
  }

  function undo() {
    if (!history.length) return false;
    future.push(snapshot());
    const prev = JSON.parse(history.pop());
    data.colleges = prev.colleges;
    data.branches = prev.branches;
    data.maxRankSlots = prev.maxRankSlots;
    persist();
    emit('undo');
    return true;
  }

  function redo() {
    if (!future.length) return false;
    history.push(snapshot());
    const next = JSON.parse(future.pop());
    data.colleges = next.colleges;
    data.branches = next.branches;
    data.maxRankSlots = next.maxRankSlots;
    persist();
    emit('redo');
    return true;
  }

  function init() {
    const loaded = Storage.load();
    if (loaded) {
      data.colleges = loaded.colleges || [];
      data.branches = loaded.branches || [];
      data.settings = { ...DEFAULT_SETTINGS, ...(loaded.settings || {}) };
      data.filters = { ...DEFAULT_FILTERS, ...(loaded.filters || {}) };
      data.sort = loaded.sort || 'manual';
      data.maxRankSlots = loaded.maxRankSlots || 60;
      data.ui.collapsedCollegeIds = loaded.ui?.collapsedCollegeIds || [];
    }
    migrateSchema();
    persist();
  }

  // v1 stored a few college attributes on branches. Normalize all existing
  // backups in-place so old Local Storage and imported data stay usable.
  function migrateSchema() {
    const collegeFields = ['location', 'type', 'autonomous', 'university'];
    const legacyCollegeField = {
      location: b => b.location,
      type: b => b.type || b.collegeType || b.governmentPrivate,
      autonomous: b => b.autonomous ?? b.isAutonomous,
      university: b => b.university,
    };
    data.colleges.forEach(c => {
      c.location = c.location || '';
      c.type = c.type || 'Government';
      c.autonomous = !!c.autonomous;
      c.university = c.university || '';
      c.naacGrade = c.naacGrade || '';
      c.website = c.website || '';
      c.notes = c.notes || '';
    });
    data.branches = data.branches.filter(b => data.colleges.some(c => c.id === b.collegeId)).map(b => {
      const college = getCollege(b.collegeId);
      collegeFields.forEach(key => {
        const legacyValue = legacyCollegeField[key](b);
        const missing = key === 'autonomous' ? !college.autonomous : (college[key] === '' || college[key] === undefined);
        if (missing && legacyValue !== undefined && legacyValue !== '') {
          college[key] = key === 'autonomous' ? !!legacyValue : legacyValue;
        }
      });
      const normalized = {
        id: b.id || Utils.uid('br'), collegeId: b.collegeId, name: b.name || '',
        cutoff: b.cutoff ?? null, meritNumber: b.meritNumber ?? null,
        category: b.category || '', notes: b.notes || b.remarks || '',
        favorite: !!b.favorite, pinned: !!b.pinned, color: b.color || null,
        rank: b.rank ?? null, createdAt: b.createdAt || Date.now(),
      };
      return normalized;
    });
    data.ui.collapsedCollegeIds = data.ui.collapsedCollegeIds.filter(id => getCollege(id));
  }

  /* ---------------- Colleges ---------------- */
  function addCollege(fields) {
    pushHistory();
    const college = {
      id: Utils.uid('col'),
      name: fields.name.trim(),
      location: fields.location || '',
      autonomous: !!fields.autonomous,
      university: fields.university || '',
      naacGrade: fields.naacGrade || '',
      type: fields.type || 'Government',
      website: fields.website || '',
      notes: fields.notes || '',
      createdAt: Date.now(),
    };
    data.colleges.push(college);
    persist(); emit('college:add');
    return college;
  }

  function updateCollege(id, fields) {
    const c = data.colleges.find(c => c.id === id);
    if (!c) return null;
    pushHistory();
    Object.assign(c, fields);
    persist(); emit('college:update');
    return c;
  }

  function deleteCollege(id) {
    pushHistory();
    data.colleges = data.colleges.filter(c => c.id !== id);
    data.branches = data.branches.filter(b => b.collegeId !== id);
    persist(); emit('college:delete');
  }

  function duplicateCollege(id) {
    const source = getCollege(id);
    if (!source) return null;
    pushHistory();
    const copy = { ...source, id: Utils.uid('col'), name: `${source.name} (copy)`, createdAt: Date.now() };
    data.colleges.push(copy);
    data.branches.filter(b => b.collegeId === id).forEach(b => data.branches.push({ ...b, id: Utils.uid('br'), collegeId: copy.id, rank: null, createdAt: Date.now() }));
    persist(); emit('college:duplicate');
    return copy;
  }

  function getCollege(id) { return data.colleges.find(c => c.id === id) || null; }

  /* ---------------- Branches ---------------- */
  function addBranch(fields) {
    pushHistory();
    const branch = {
      id: Utils.uid('br'),
      collegeId: fields.collegeId,
      name: fields.name.trim(),
      cutoff: fields.cutoff === '' || fields.cutoff === undefined ? null : Number(fields.cutoff),
      meritNumber: fields.meritNumber === '' || fields.meritNumber === undefined ? null : Number(fields.meritNumber),
      category: fields.category || '',
      notes: fields.notes || '',
      favorite: false,
      pinned: false,
      color: fields.color || null,
      rank: null,
      createdAt: Date.now(),
    };
    data.branches.push(branch);
    persist(); emit('branch:add');
    return branch;
  }

  function updateBranch(id, fields) {
    const b = data.branches.find(b => b.id === id);
    if (!b) return null;
    pushHistory();
    Object.assign(b, fields);
    persist(); emit('branch:update');
    return b;
  }

  // Lightweight update (notes typing, etc.) — no history spam, still persists.
  function patchBranchQuiet(id, fields) {
    const b = data.branches.find(b => b.id === id);
    if (!b) return null;
    Object.assign(b, fields);
    persist(); emit('branch:patch');
    return b;
  }

  function deleteBranch(id) {
    const b = getBranch(id);
    if (!b) return;
    pushHistory();
    if (b.rank !== null) {
      b.rank = null;
    }
    data.branches = data.branches.filter(x => x.id !== id);
    persist(); emit('branch:delete');
  }

  function duplicateBranch(id) {
    const b = data.branches.find(b => b.id === id);
    if (!b) return null;
    pushHistory();
    const copy = { ...b, id: Utils.uid('br'), name: b.name + ' (copy)', rank: null, createdAt: Date.now() };
    data.branches.push(copy);
    persist(); emit('branch:duplicate');
    return copy;
  }

  function getBranch(id) { return data.branches.find(b => b.id === id) || null; }

  function toggleFavorite(id) {
    const b = getBranch(id); if (!b) return;
    pushHistory();
    b.favorite = !b.favorite;
    persist(); emit('branch:favorite');
  }

  function togglePin(id) {
    const b = getBranch(id); if (!b) return;
    pushHistory();
    b.pinned = !b.pinned;
    persist(); emit('branch:pin');
  }

  function setColor(id, color) {
    const b = getBranch(id); if (!b) return;
    pushHistory();
    b.color = color;
    persist(); emit('branch:color');
  }

  /* ---------------- Ranking ---------------- */
  function assignRank(branchId, rank) {
    const b = getBranch(branchId); if (!b) return;
    pushHistory();
    // If another branch already occupies this rank, swap (it takes the dragged branch's old rank / becomes unranked)
    const occupant = data.branches.find(x => x.rank === rank && x.id !== branchId);
    const oldRank = b.rank;
    if (occupant) occupant.rank = oldRank ?? null;
    b.rank = rank;
    if (rank !== null && rank + 10 >= data.maxRankSlots) {
      data.maxRankSlots = rank + 21;
    }
    persist(); emit('rank:assign');
  }

  function unassignRank(branchId) {
    const b = getBranch(branchId); if (!b) return;
    pushHistory();
    b.rank = null;
    persist(); emit('rank:unassign');
  }

  function addRankSlots(n) {
    data.maxRankSlots += n;
    persist(); emit('rank:slots');
  }

  function resetAllRankings() {
    pushHistory();
    data.branches.forEach(b => b.rank = null);
    persist(); emit('rank:reset');
  }

  /* ---------------- Filters / sort / settings ---------------- */
  function setFilters(partial) {
    Object.assign(data.filters, partial);
    persist(); emit('filters');
  }
  function clearFilters() {
    data.filters = { ...DEFAULT_FILTERS };
    persist(); emit('filters');
  }
  function setSort(v) { data.sort = v; persist(); emit('sort'); }
  function setSetting(key, val) { data.settings[key] = val; persist(); emit('settings'); }

  function setSelectedBranch(id) { data.ui.selectedBranchId = id; emit('selection'); }
  function toggleCollegeCollapsed(id) {
    const list = data.ui.collapsedCollegeIds;
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    persist(); emit('college:collapse');
  }
  function setCompareMode(on) {
    data.ui.compareMode = on;
    if (!on) data.ui.compareIds = [];
    emit('compare');
  }
  function toggleCompareId(id) {
    const idx = data.ui.compareIds.indexOf(id);
    if (idx >= 0) data.ui.compareIds.splice(idx, 1);
    else if (data.ui.compareIds.length < 4) data.ui.compareIds.push(id);
    emit('compare');
  }

  /* ---------------- Bulk import / export ---------------- */
  function importJSON(obj) {
    pushHistory();
    data.colleges = obj.colleges || [];
    data.branches = obj.branches || [];
    if (obj.settings) data.settings = { ...DEFAULT_SETTINGS, ...obj.settings };
    if (obj.maxRankSlots) data.maxRankSlots = obj.maxRankSlots;
    data.ui.collapsedCollegeIds = obj.ui?.collapsedCollegeIds || [];
    migrateSchema();
    persist(); emit('import');
  }

  function resetEverything() {
    pushHistory();
    data.colleges = [];
    data.branches = [];
    data.maxRankSlots = 60;
    data.ui.collapsedCollegeIds = [];
    persist(); emit('reset');
  }

  function exportData() {
    return {
      colleges: data.colleges,
      branches: data.branches,
      settings: data.settings,
      ui: { collapsedCollegeIds: data.ui.collapsedCollegeIds },
      maxRankSlots: data.maxRankSlots,
      exportedAt: new Date().toISOString(),
    };
  }

  return {
    COLOR_LABELS,
    data,
    init, onChange,
    addCollege, updateCollege, deleteCollege, duplicateCollege, getCollege,
    addBranch, updateBranch, patchBranchQuiet, deleteBranch, duplicateBranch, getBranch,
    toggleFavorite, togglePin, setColor,
    assignRank, unassignRank, addRankSlots, resetAllRankings,
    setFilters, clearFilters, setSort, setSetting,
    setSelectedBranch, toggleCollegeCollapsed, setCompareMode, toggleCompareId,
    importJSON, resetEverything, exportData,
    undo, redo, pushHistory,
  };
})();
