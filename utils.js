/* ============================================================
   UTILITIES
   Pure helper functions with no dependency on app state.
   ============================================================ */
window.Utils = (function () {

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtNum(n, digits) {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-IN', { maximumFractionDigits: digits ?? 2 });
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---- Minimal CSV parser: handles quoted fields with commas ---- */
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], next = text[i + 1];
      if (inQuotes) {
        if (c === '"' && next === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { field += c; }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',' || c === '\t') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c === '\r') { /* skip */ }
        else { field += c; }
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
  }

  function toCSV(headers, rows) {
    const esc = v => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.map(esc).join(',')];
    rows.forEach(r => lines.push(r.map(esc).join(',')));
    return lines.join('\n');
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  return { uid, debounce, escapeHtml, fmtNum, downloadFile, parseCSV, toCSV, clamp };
})();
