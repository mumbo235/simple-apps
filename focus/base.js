'use strict';
(function () {
  const cfg = window.APP_CONFIG || {};
  const NS = (cfg.ns || 'app') + '.';
  const BUILD = cfg.build || 'v1.0';
  const FONTS = {
    inter: { css: "'Inter',system-ui,sans-serif", g: 'Inter:wght@300;400;500' },
    manrope: { css: "'Manrope',system-ui,sans-serif", g: 'Manrope:wght@300;400;500' },
    grotesk: { css: "'Space Grotesk',system-ui,sans-serif", g: 'Space+Grotesk:wght@300;400;500' },
    mono: { css: "'JetBrains Mono',ui-monospace,monospace", g: 'JetBrains+Mono:wght@300;400;500' },
    system: { css: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", g: null }
  };
  const SIZES = { s: '15px', m: '17px', l: '19.5px' };
  const DENS = { compact: '10px', comfy: '14px', airy: '20px' };
  const DEFAULTS = {
    mode: 'dark', font: 'grotesk', size: 'm', density: 'compact', speed: 1.6,
    reduceMotion: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
  };
  const $ = s => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch { toast('storage is full'); } },
    del(k) { localStorage.removeItem(NS + k); }
  };
  let settings = Object.assign({}, DEFAULTS, store.get('settings', {}));
  settings.mode = settings.mode === 'light' ? 'light' : 'dark';
  if (!FONTS[settings.font]) settings.font = 'grotesk';
  if (!SIZES[settings.size]) settings.size = 'm';
  if (!DENS[settings.density]) settings.density = 'compact';
  settings.reduceMotion = !!settings.reduceMotion;
  store.set('settings', settings);

  const dur = ms => settings.reduceMotion ? 0 : ms * (+settings.speed || 1.6);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => { const x = d instanceof Date ? d : new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
  const monthKey = d => { const x = d instanceof Date ? d : new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1); };
  const parseDay = key => { const [y, m, d] = String(key).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  function applySettings() {
    const r = document.documentElement;
    const mode = settings.mode === 'light' ? 'light' : 'dark';
    const changed = r.dataset.mode !== mode;
    if (changed) r.classList.add('no-tx');
    r.dataset.mode = mode;
    r.style.setProperty('--font', FONTS[settings.font].css);
    r.style.setProperty('--fs', SIZES[settings.size]);
    r.style.setProperty('--pad', DENS[settings.density]);
    r.style.setProperty('--spd', settings.reduceMotion ? 0.001 : (+settings.speed || 1.6));
    r.classList.toggle('rm', !!settings.reduceMotion);
    const link = $('#fontLink');
    if (link) link.href = FONTS[settings.font].g ? 'https://fonts.googleapis.com/css2?family=' + FONTS[settings.font].g + '&display=swap' : '';
    const theme = document.querySelector('meta[name="theme-color"]');
    const scheme = document.querySelector('meta[name="color-scheme"]');
    const apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (theme) theme.content = mode === 'light' ? '#ffffff' : '#141414';
    if (scheme) scheme.content = mode;
    if (apple) apple.content = mode === 'light' ? 'default' : 'black';
    if (changed) {
      requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove('no-tx')));
      setTimeout(() => r.classList.remove('no-tx'), 120);
    }
  }
  const saveSettings = () => store.set('settings', settings);

  function syncMenuUI() {
    document.querySelectorAll('[data-seg]').forEach(g => {
      const k = g.dataset.seg;
      g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(String(settings[k]) === b.dataset.v)));
    });
    document.querySelectorAll('[data-toggle]').forEach(b => b.setAttribute('aria-checked', String(!!settings[b.dataset.toggle])));
    const bi = $('#buildInfo');
    if (bi) bi.textContent = (cfg.title || 'app') + ' ' + BUILD + ' · local-first';
  }

  let toastTimer = 0;
  function toast(msg, ms = 2800) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function openMenu() {
    document.dispatchEvent(new CustomEvent('app:menuopen'));
    syncMenuUI();
    const menu = $('#menu');
    menu.classList.add('show');
    menu.setAttribute('aria-hidden', 'false');
    menu.inert = false;
    $('#scrim').classList.add('show');
    $('#menuBtn').setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    const menu = $('#menu');
    if (!menu) return;
    if (document.activeElement && menu.contains(document.activeElement)) document.activeElement.blur();
    menu.classList.remove('show');
    menu.setAttribute('aria-hidden', 'true');
    menu.inert = true;
    if (!document.body.classList.contains('sheet-open')) $('#scrim').classList.remove('show');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
  }

  function download(name, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('copied'); return true; }
    catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        toast('copied'); return true;
      } catch { toast('could not copy'); return false; }
    }
  }

  document.addEventListener('click', e => {
    const seg = e.target.closest('[data-seg]');
    if (seg) {
      const b = e.target.closest('button[data-v]');
      if (b) {
        const k = seg.dataset.seg;
        settings[k] = seg.hasAttribute('data-num') ? +b.dataset.v : b.dataset.v;
        saveSettings(); applySettings(); syncMenuUI();
        document.dispatchEvent(new CustomEvent('app:settings'));
      }
      return;
    }
    const tog = e.target.closest('[data-toggle]');
    if (tog) {
      const k = tog.dataset.toggle;
      settings[k] = !settings[k];
      saveSettings(); applySettings(); syncMenuUI();
      document.dispatchEvent(new CustomEvent('app:settings'));
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#menu') && $('#menu').classList.contains('show')) closeMenu();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = $('#menuBtn'), menuClose = $('#menuClose'), scrim = $('#scrim');
    if (menuBtn) menuBtn.addEventListener('click', () => $('#menu').classList.contains('show') ? closeMenu() : openMenu());
    if (menuClose) menuClose.addEventListener('click', closeMenu);
    if (scrim) scrim.addEventListener('click', closeMenu);
    const install = $('#installBtn');
    if (install) install.addEventListener('click', async () => {
      const p = window.__installPrompt;
      if (!p) { toast('use your browser menu → install app'); return; }
      p.prompt();
      try { await p.userChoice; } catch {}
      window.__installPrompt = null;
      closeMenu();
    });
    const motto = $('#motto');
    if (motto) {
      const list = Array.isArray(cfg.mottos) && cfg.mottos.length ? cfg.mottos : ['one step at a time'];
      let idx = Math.floor(Math.random() * list.length);
      motto.textContent = list[idx];
      const next = () => {
        idx = (idx + 1) % list.length;
        motto.classList.add('fade');
        setTimeout(() => { motto.textContent = list[idx]; motto.classList.remove('fade'); }, dur(180));
      };
      motto.addEventListener('click', next);
      motto.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
    }
    applySettings();
    syncMenuUI();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      if (navigator.serviceWorker.controller && window.top === window) {
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloaded) return;
          reloaded = true;
          location.reload();
        });
      }
      navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
    }
  });
  // apply early if the script is loaded after parsing
  if (document.readyState !== 'loading') {
    applySettings();
    syncMenuUI();
  }

  window.App = {
    ns: NS, config: cfg, build: BUILD,
    store, settings, defaults: DEFAULTS, fonts: FONTS, sizes: SIZES, dens: DENS,
    applySettings, saveSettings: () => { saveSettings(); }, syncMenuUI,
    dur, uid, dayKey, monthKey, parseDay, addDays,
    toast, openMenu, closeMenu, download, copyText
  };
})();
