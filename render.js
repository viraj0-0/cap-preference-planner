/* ============================================================
   RENDER MODULE
   Pure(ish) DOM rendering. Reads from State, writes to DOM.
   Re-render is triggered by State.onChange in main.js.
   ============================================================ */
window.Render = (function () {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const ICONS = {
    star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2a5 5 0 0 0-5 5c0 2.2 1.3 3.5 2 5l-3 3v1h6v5l1 1 1-1v-5h6v-1l-3-3c.7-1.5 2-2.8 2-5a5 5 0 0 0-5-5z"/></svg>',
    pinOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5c0 2.2 1.3 3.5 2 5l-3 3v1h6v5l1 1 1-1v-5h6v-1l-3-3c.7-1.5 2-2.8 2-5a5 5 0 0 0-5-5z"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 10-10-5-10 5 10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/></svg>',
    branch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 14l9 5 9-5"/><path d="M3 11l9 5 9-5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="10" width="3" height="6" rx="1"/><rect x="12" y="7" width="3" height="9" rx="1"/><rect x="17" y="12" width="3" height="4" rx="1"/></svg>',
    medal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="5"/><path d="M8.5 10 6 3h4l2 4 2-4h4l-2.5 7"/></svg>',
    mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-8h6v8"/><path d="M9 9h.01M12 9h.01M15 9h.01"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/></svg>',
  };

  /* ---------------- Filtering / sorting core ---------------- */
  function collegeMatches(college, f) {
    if (f.type.length && !f.type.includes(college.type)) return false;
    if (f.autonomous.length && !f.autonomous.includes(String(college.autonomous))) return false;
    if (f.university.length && !f.university.includes(college.university)) return false;
    return true;
  }

  function branchMatches(branch, college, f) {
    if (!college) return false;
    if (!collegeMatches(college, f)) return false;
    if (f.favoritesOnly && !branch.favorite) return false;
    if (f.category.length && !f.category.includes(branch.category)) return false;
    if (f.branch.length && !f.branch.includes(branch.name)) return false;
    if (f.cutoffMin !== null && f.cutoffMin !== undefined && f.cutoffMin !== '' && (branch.cutoff ?? -Infinity) < f.cutoffMin) return false;
    if (f.cutoffMax !== null && f.cutoffMax !== undefined && f.cutoffMax !== '' && (branch.cutoff ?? Infinity) > f.cutoffMax) return false;
    if (f.meritMin !== null && f.meritMin !== undefined && f.meritMin !== '' && (branch.meritNumber ?? -Infinity) < f.meritMin) return false;
    if (f.meritMax !== null && f.meritMax !== undefined && f.meritMax !== '' && (branch.meritNumber ?? Infinity) > f.meritMax) return false;
    if (f.search && f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      const hay = [college.name, college.location, college.type, college.university, branch.name, branch.notes, branch.category, String(branch.cutoff ?? ''), String(branch.meritNumber ?? '')]
        .join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function getFilteredBranches() {
    const f = State.data.filters;
    return State.data.branches.filter(b => branchMatches(b, State.getCollege(b.collegeId), f));
  }

  function sortUnranked(list) {
    const sort = State.data.sort;
    const withCollege = id => State.getCollege(id)?.name || '';
    const arr = [...list];
    switch (sort) {
      case 'alpha': arr.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'cutoff': arr.sort((a, b) => (a.cutoff ?? Infinity) - (b.cutoff ?? Infinity)); break;
      case 'merit': arr.sort((a, b) => (a.meritNumber ?? Infinity) - (b.meritNumber ?? Infinity)); break;
      case 'college': arr.sort((a, b) => withCollege(a.collegeId).localeCompare(withCollege(b.collegeId))); break;
      case 'recent': arr.sort((a, b) => b.createdAt - a.createdAt); break;
      default: break; // manual = insertion order
    }
    // pinned always float to top regardless of sort
    arr.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return arr;
  }

  /* ---------------- Branch card ---------------- */
  function colorDot(color) {
    if (!color) return '';
    const c = State.COLOR_LABELS[color];
    if (!c) return '';
    return `<span class="bc-color-dot" style="background:${c.hex}" title="${c.name}"></span>`;
  }

  function branchTone(name) {
    const n = String(name || '').toLowerCase();
    if (n.includes('artificial intelligence')) return 'purple';
    if (n.includes('ai') || n.includes('data')) return 'indigo';
    if (n.includes('computer')) return 'blue';
    if (n.includes('information') || /\bit\b/.test(n)) return 'teal';
    if (n.includes('mechanical')) return 'orange';
    if (n.includes('civil')) return 'brown';
    if (n.includes('extc') || n.includes('entc')) return 'pink';
    if (n.includes('electronics')) return 'orange';
    if (n.includes('electrical')) return 'amber';
    if (n.includes('chemical')) return 'cyan';
    if (n.includes('bio')) return 'rose';
    if (n.includes('instrument')) return 'violet';
    if (n.includes('production')) return 'olive';
    return 'neutral';
  }

  function badges(college, branch) {
    let out = '';
    if (college.type === 'Government') out += `<span class="badge gov"><span></span>Government</span>`;
    else if (college.type === 'Private') out += `<span class="badge priv"><span></span>Private</span>`;
    else if (college.type === 'Aided') out += `<span class="badge aided"><span></span>Aided</span>`;
    if (college.autonomous) out += `<span class="badge auto"><span></span>Autonomous</span>`;
    return out;
  }

  function branchCard(branch, opts) {
    opts = opts || {};
    const college = State.getCollege(branch.collegeId);
    if (!college) return '';
    const selected = State.data.ui.selectedBranchId === branch.id;
    const compareSel = State.data.ui.compareIds.includes(branch.id);
    const compact = State.data.settings.compactDensity;
    const classes = ['branch-card'];
    if (selected) classes.push('selected');
    if (compareSel) classes.push('compare-selected');
    if (compact) classes.push('compact');
    if (branch.color) classes.push(`color-${branch.color}`);
    const rankLabel = branch.rank !== null ? `#${branch.rank}` : '';
    const branchKind = branchTone(branch.name);
    const notes = branch.notes || '';
    return `
      <div class="${classes.join(' ')}" draggable="true" data-branch-id="${branch.id}" tabindex="0">
        <div class="bc-header">
          <div class="bc-title-group">
            <div class="bc-branch-row">
              <div class="bc-branch tone-${branchKind}">${Utils.escapeHtml(branch.name)}</div>
              ${colorDot(branch.color)}
            </div>
            <div class="bc-college">${ICONS.school}<span>${Utils.escapeHtml(college.name)}</span></div>
          </div>
          ${opts.showRankBadge && rankLabel ? `<span class="rank-badge-pos">${rankLabel}</span>` : ''}
        </div>
        <div class="bc-metrics">
          <div class="bc-metric"><span class="metric-label">${ICONS.chart}Cutoff</span><b>${Utils.fmtNum(branch.cutoff)}</b></div>
          <div class="bc-metric"><span class="metric-label">${ICONS.medal}Merit</span><b>${branch.meritNumber ?? '—'}</b></div>
        </div>
        <div class="bc-bottom">
          <div class="bc-badges">${badges(college, branch)}${branch.pinned ? '<span class="badge pinned"><span></span>Pinned</span>' : ''}</div>
          <div class="bc-icons">
            <button class="icon-btn ${branch.favorite ? 'active-fav' : ''}" data-action="fav" title="Favorite">${branch.favorite ? ICONS.star : ICONS.starOutline}</button>
            <button class="icon-btn ${branch.pinned ? 'active-pin' : ''}" data-action="pin" title="Pin">${branch.pinned ? ICONS.pin : ICONS.pinOutline}</button>
            <div class="branch-menu-wrap">
              <button class="icon-btn" data-branch-action="menu" title="Branch menu">•••</button>
              <div class="branch-menu">
                <button class="danger" data-branch-action="delete">Delete Branch</button>
              </div>
            </div>
          </div>
        </div>
        ${notes ? `<div class="bc-notes">${ICONS.note}<span>${Utils.escapeHtml(notes)}</span></div>` : ''}
      </div>`;
  }

  /* ---------------- Ranking panel ---------------- */
  function renderRankList() {
    const el = $('#rankList');
    const total = State.data.maxRankSlots;
    const rankedBranches = State.data.branches.filter(b => b.rank !== null);
    const byRank = new Map(rankedBranches.map(b => [b.rank, b]));
    let html = '';
    for (let r = 1; r <= total; r++) {
      const b = byRank.get(r);
      html += `
        <div class="rank-row ${b ? 'filled' : ''}">
          <div class="rank-num">#${r}</div>
          <div class="rank-slot" data-rank="${r}">
            ${b ? branchCard(b) : `<span class="empty-slot">Drop a branch here</span>`}
          </div>
        </div>`;
    }
    el.innerHTML = html;
    $('#rankedCountPill').textContent = `${rankedBranches.length} ranked`;
  }

  /* ---------------- Unranked panel ---------------- */
  function renderUnranked() {
    const el = $('#unrankedList');
    const filtered = getFilteredBranches().filter(b => b.rank === null);
    const sorted = sortUnranked(filtered);
    if (!sorted.length) {
      const total = State.data.branches.filter(b => b.rank === null).length;
      el.innerHTML = total === 0
        ? `<div class="unranked-empty rich-empty">
            <div class="empty-illustration">${ICONS.school}${ICONS.plus}</div>
            <h3>Start by creating your first college.</h3>
            <p>Then add branches and drag them into your preferred rankings.</p>
            <button class="btn btn-primary" id="emptyAddCollegeBtn">${ICONS.plus} Add College</button>
          </div>`
        : `<div class="unranked-empty">No branches match your search or filters.</div>`;
    } else {
      const byCollege = new Map();
      sorted.forEach(b => {
        if (!byCollege.has(b.collegeId)) byCollege.set(b.collegeId, []);
        byCollege.get(b.collegeId).push(b);
      });
      el.innerHTML = Array.from(byCollege.entries()).map(([collegeId, branches]) => collegeGroup(State.getCollege(collegeId), branches)).join('');
    }
    $('#unrankedCountPill').textContent = `${sorted.length} item${sorted.length === 1 ? '' : 's'}`;
  }

  function collegeGroup(college, branches) {
    if (!college) return '';
    const collapsed = State.data.ui.collapsedCollegeIds.includes(college.id);
    const meta = [college.location, college.type, college.autonomous ? 'Autonomous' : ''].filter(Boolean).map(Utils.escapeHtml).join(' <span>•</span> ');
    return `<section class="college-group ${collapsed ? 'collapsed' : ''}" data-college-id="${college.id}">
      <header class="college-group-header">
        <button class="college-collapse" data-college-action="collapse" aria-label="${collapsed ? 'Expand' : 'Collapse'} college">${collapsed ? '›' : '⌄'}</button>
        <div class="college-logo" aria-hidden="true">${ICONS.school}</div>
        <div class="college-summary">
          <h3>${Utils.escapeHtml(college.name)}</h3>
          ${meta ? `<p>${meta}</p>` : '<p>College information</p>'}
          <span class="college-branch-count">${State.data.branches.filter(b => b.collegeId === college.id).length} Branch${State.data.branches.filter(b => b.collegeId === college.id).length === 1 ? '' : 'es'}</span>
        </div>
        <div class="college-actions">
          <button class="icon-btn" data-college-action="edit" title="Edit college">${ICONS.edit}</button>
          <button class="icon-btn" data-college-action="add-branch" title="Add branch">${ICONS.plus}</button>
          <div class="college-menu-wrap"><button class="icon-btn" data-college-action="menu" title="College menu">•••</button>
            <div class="college-menu"><button data-college-action="edit">Edit College</button><button data-college-action="add-branch">Add Branch</button><button data-college-action="duplicate">Duplicate College</button><button class="danger" data-college-action="delete">Delete College</button></div>
          </div>
        </div>
      </header>
      <div class="college-branches">${branches.map(b => branchCard(b, { inCollegeGroup: true })).join('')}</div>
    </section>`;
  }

  /* ---------------- Details panel ---------------- */
  function renderDetails() {
    const body = $('#detailsBody');
    const id = State.data.ui.selectedBranchId;
    const b = id ? State.getBranch(id) : null;
    if (!b) {
      body.innerHTML = `<div class="details-empty">Select a branch card to view and edit its full details here.</div>`;
      return;
    }
    const college = State.getCollege(b.collegeId);
    body.innerHTML = `
      <h3 class="details-title">${Utils.escapeHtml(b.name)}</h3>
      <p class="details-sub">${Utils.escapeHtml(college?.name || 'Unknown college')}</p>
      <div class="details-section-label">College Information</div>
      <div class="details-grid">
        <div class="detail-stat wide"><div class="k">${ICONS.school}<span>College</span></div><div class="v">${Utils.escapeHtml(college?.name) || '—'}</div></div>
        <div class="detail-stat"><div class="k">${ICONS.mapPin}<span>Location</span></div><div class="v">${Utils.escapeHtml(college?.location) || '—'}</div></div>
        <div class="detail-stat"><div class="k">${ICONS.building}<span>College Type</span></div><div class="v">${Utils.escapeHtml(college?.type) || '—'}</div></div>
        <div class="detail-stat"><div class="k">${ICONS.star}<span>Autonomous</span></div><div class="v">${college?.autonomous ? 'Yes' : 'No'}</div></div>
        <div class="detail-stat"><div class="k">${ICONS.school}<span>University</span></div><div class="v">${Utils.escapeHtml(college?.university) || '—'}</div></div>
      </div>
      <div class="details-section-label">Branch Information</div>
      <div class="details-grid">
        <div class="detail-stat wide"><div class="k">${ICONS.branch}<span>Branch</span></div><div class="v">${Utils.escapeHtml(b.name)}</div></div>
        <div class="detail-stat"><div class="k">${ICONS.chart}<span>Last Year Cutoff</span></div><div class="v">${Utils.fmtNum(b.cutoff)}</div></div>
        <div class="detail-stat"><div class="k">${ICONS.medal}<span>Merit Number</span></div><div class="v">${b.meritNumber ?? '—'}</div></div>
        <div class="detail-stat"><div class="k">${ICONS.branch}<span>Category</span></div><div class="v">${Utils.escapeHtml(b.category) || '—'}</div></div>
        <div class="detail-stat"><div class="k">${ICONS.medal}<span>Rank</span></div><div class="v">${b.rank !== null ? '#' + b.rank : 'Unranked'}</div></div>
      </div>
      <label class="notes-label">${ICONS.note}<span>Notes</span></label>
      <textarea class="details-notes" id="dp-notes" placeholder="Write notes about this branch…">${Utils.escapeHtml(b.notes)}</textarea>
      <div class="details-actions">
        <button class="btn btn-secondary" id="dp-edit">${ICONS.edit} Edit</button>
        <button class="btn btn-secondary" id="dp-duplicate">${ICONS.copy} Duplicate</button>
        <button class="btn btn-secondary" id="dp-fav">${b.favorite ? ICONS.star : ICONS.starOutline} ${b.favorite ? 'Favorited' : 'Favorite'}</button>
        <button class="btn btn-secondary" id="dp-pin">${b.pinned ? ICONS.pin : ICONS.pinOutline} ${b.pinned ? 'Pinned' : 'Pin'}</button>
        ${b.rank !== null ? `<button class="btn btn-secondary" id="dp-unrank">${ICONS.close} Move to Unranked</button>` : ''}
        <button class="btn btn-danger" id="dp-delete">${ICONS.trash} Delete</button>
      </div>`;
  }

  /* ---------------- Filter modal ---------------- */
  function uniqueValues(key, source) {
    const set = new Set();
    source.forEach(item => { if (item[key]) set.add(item[key]); });
    return Array.from(set).sort();
  }

  function renderChipGroup(containerId, values, activeList, filterKey) {
    const el = $(containerId);
    if (!values.length) { el.innerHTML = `<span class="empty-hint">None yet</span>`; return; }
    el.innerHTML = values.map(v => `<button class="chip ${activeList.includes(v) ? 'active' : ''}" data-filter-key="${filterKey}" data-filter-val="${Utils.escapeHtml(v)}">${Utils.escapeHtml(v)}</button>`).join('');
  }

  function renderAutonomousChips(activeList) {
    const el = $('#filter-autonomous');
    const opts = [['true', 'Autonomous'], ['false', 'Non-autonomous']];
    el.innerHTML = opts.map(([v, label]) => `<button class="chip ${activeList.includes(v) ? 'active' : ''}" data-filter-key="autonomous" data-filter-val="${v}">${label}</button>`).join('');
  }

  function renderFilterModal() {
    const f = State.data.filters;
    renderChipGroup('#filter-type', ['Government', 'Aided', 'Private'], f.type, 'type');
    renderAutonomousChips(f.autonomous);
    renderChipGroup('#filter-university', uniqueValues('university', State.data.colleges), f.university, 'university');
    renderChipGroup('#filter-category', uniqueValues('category', State.data.branches), f.category, 'category');
    renderChipGroup('#filter-branch', uniqueValues('name', State.data.branches), f.branch, 'branch');
    $('#filter-cutoff-min').value = f.cutoffMin ?? '';
    $('#filter-cutoff-max').value = f.cutoffMax ?? '';
    $('#filter-merit-min').value = f.meritMin ?? '';
    $('#filter-merit-max').value = f.meritMax ?? '';
  }

  /* ---------------- Stats modal ---------------- */
  function renderStats() {
    const colleges = State.data.colleges;
    const branches = State.data.branches;
    const ranked = branches.filter(b => b.rank !== null).length;
    const gov = colleges.filter(c => c.type === 'Government').length;
    const priv = colleges.filter(c => c.type === 'Private').length;
    const cutoffs = branches.map(b => b.cutoff).filter(n => n !== null && n !== undefined && !isNaN(n));
    const avg = cutoffs.length ? (cutoffs.reduce((a, b) => a + b, 0) / cutoffs.length) : null;
    const max = cutoffs.length ? Math.max(...cutoffs) : null;
    const min = cutoffs.length ? Math.min(...cutoffs) : null;
    const stats = [
      ['Colleges', colleges.length],
      ['Branches', branches.length],
      ['Ranked', ranked],
      ['Unranked', branches.length - ranked],
      ['Government', gov],
      ['Private', priv],
      ['Avg. Cutoff', avg !== null ? Utils.fmtNum(avg) : '—'],
      ['Highest Cutoff', max !== null ? Utils.fmtNum(max) : '—'],
      ['Lowest Cutoff', min !== null ? Utils.fmtNum(min) : '—'],
    ];
    $('#statsGrid').innerHTML = stats.map(([lbl, num]) => `<div class="stat-card"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`).join('');
  }

  /* ---------------- Compare modal ---------------- */
  function renderCompare() {
    const ids = State.data.ui.compareIds;
    const body = $('#compareBody');
    if (ids.length < 2) {
      body.innerHTML = `<p class="empty-hint">Select 2–4 branch cards (click while Compare mode is on) to compare them here. Currently selected: ${ids.length}.</p>`;
      return;
    }
    const branches = ids.map(id => State.getBranch(id)).filter(Boolean);
    const rows = [
      ['College', b => State.getCollege(b.collegeId)?.name || '—'],
      ['Branch', b => b.name],
      ['Cutoff', b => Utils.fmtNum(b.cutoff)],
      ['Merit No.', b => b.meritNumber ?? '—'],
      ['Location', b => State.getCollege(b.collegeId)?.location || '—'],
      ['College Type', b => State.getCollege(b.collegeId)?.type || '—'],
      ['Autonomous', b => State.getCollege(b.collegeId)?.autonomous ? 'Yes' : 'No'],
      ['Category', b => b.category || '—'],
      ['Rank', b => b.rank !== null ? '#' + b.rank : 'Unranked'],
      ['Notes', b => b.notes || '—'],
    ];
    let html = `<table class="compare-table"><thead><tr><th></th>${branches.map(b => `<th>${Utils.escapeHtml(b.name)}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach(([label, get]) => {
      html += `<tr><th>${label}</th>${branches.map(b => `<td>${Utils.escapeHtml(String(get(b)))}</td>`).join('')}</tr>`;
    });
    html += `</tbody></table>`;
    body.innerHTML = html;
  }

  /* ---------------- College select in branch modal ---------------- */
  function renderCollegeOptions(selectedId) {
    const sel = $('#bf-college');
    sel.innerHTML = State.data.colleges
      .slice().sort((a, b) => a.name.localeCompare(b.name))
      .map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${Utils.escapeHtml(c.name)}</option>`).join('');
  }

  function renderColorPicker(selected) {
    const el = $('#bf-colorpicker');
    el.innerHTML = `<button type="button" class="swatch ${!selected ? 'selected' : ''}" data-color="" style="background:#F0F0F2;border:1px dashed #C7C7CC;" title="None"></button>` +
      Object.entries(State.COLOR_LABELS).map(([key, c]) =>
        `<button type="button" class="swatch ${selected === key ? 'selected' : ''}" data-color="${key}" style="background:${c.hex}" title="${c.name}"></button>`
      ).join('');
  }

  /* ---------------- Full re-render ---------------- */
  function renderAll() {
    renderRankList();
    renderUnranked();
    renderDetails();
    document.body.classList.toggle('density-compact', !!State.data.settings.compactDensity);
    $('#favFilterToggle').classList.toggle('active', !!State.data.filters.favoritesOnly);
    $('#compareToggle').classList.toggle('active', !!State.data.ui.compareMode);
  }

  return {
    $, $$, ICONS,
    getFilteredBranches, sortUnranked, branchCard,
    renderRankList, renderUnranked, renderDetails,
    renderFilterModal, renderStats, renderCompare,
    renderCollegeOptions, renderColorPicker,
    renderAll, uniqueValues,
  };
})();
