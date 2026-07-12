/* ============================================================
   STORAGE MODULE
   Thin, defensive wrapper around window.localStorage.
   Everything the app persists goes through here so the rest
   of the codebase never touches localStorage directly.
   ============================================================ */
window.Storage = (function () {
  const KEY = 'capPlanner.v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error('Storage.load failed, data may be corrupt:', err);
      return null;
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Storage.save failed (quota exceeded?):', err);
      return false;
    }
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  return { load, save, clear, KEY };
})();
