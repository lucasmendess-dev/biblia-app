import { BOOKS, BOOK_BY_ID, TOTAL_CHAPTERS, DAILY_VERSES, PLANS } from './books.js';
import { state, update, save, markRead, isRead, readCount, isFavorite, toggleFavorite, currentStreak, resetAll, dayKey } from './store.js';
import { VERSIONS, getVersion } from './versions.js';
import { headingsFor } from './headings/index.js';
import { fetchChapter, fetchVerse } from './api.js';
import { icon } from './icons.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const app = $('#app');
const view = $('#view');
const nav = $('#nav');

/* ================= Tema e preferências de leitura ================= */
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
function applyPrefs() {
  const root = document.documentElement;
  const theme = state.theme === 'auto' ? (darkQuery.matches ? 'night' : 'day') : state.theme;
  if (theme === 'day') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
  root.style.setProperty('--reader-font', state.fontScale);
  root.style.setProperty('--reader-lh', { compact: 1.55, normal: 1.75, wide: 2 }[state.lineHeight] || 1.75);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(root).getPropertyValue('--surface').trim() || '#ffffff';
}
darkQuery.addEventListener?.('change', applyPrefs);

/* ================= Utilidades ================= */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

const fmtDate = (d = new Date()) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' }).format(d);
const pct = (n, total) => Math.round((n / total) * 100);
const refLabel = (book, ch, v) => `${BOOK_BY_ID[book].name} ${ch}${v ? ':' + v : ''}`;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function dailyVerse() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const day = Math.floor((Date.now() - start) / 864e5);
  return DAILY_VERSES[day % DAILY_VERSES.length];
}

function bookProgress(book) {
  const b = BOOK_BY_ID[book];
  let n = 0;
  for (let c = 1; c <= b.chapters; c++) if (isRead(book, c)) n++;
  return n;
}

function planProgress(plan) {
  const done = plan.chapters.filter(([b, c]) => isRead(b, c)).length;
  const next = plan.chapters.find(([b, c]) => !isRead(b, c)) || plan.chapters[0];
  return { done, total: plan.chapters.length, next };
}

function neighbor(book, chapter, dir) {
  const b = BOOK_BY_ID[book];
  if (dir > 0) {
    if (chapter < b.chapters) return [book, chapter + 1];
    const nb = BOOKS[b.index + 1];
    return nb ? [nb.id, 1] : null;
  }
  if (chapter > 1) return [book, chapter - 1];
  const pb = BOOKS[b.index - 1];
  return pb ? [pb.id, pb.chapters] : null;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

/* ================= Router (hash) ================= */
let navDepth = 0; // quantas telas foram abertas dentro do app (para o botão voltar)
function go(path) {
  if (location.hash === '#' + path) return;
  navDepth++;
  location.hash = path;
}

function parseRoute() {
  const [path, query] = location.hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');
  return { name: parts[0] || 'home', parts, params };
}

let cleanup = null;
function render() {
  if (cleanup) { cleanup(); cleanup = null; }
  closeSheet();
  hideVerseBar();
  const route = parseRoute();

  if (!state.onboarded) return renderWelcome();

  nav.hidden = false;
  $$('button', nav).forEach(b => b.classList.toggle('active', b.dataset.tab === (route.name === 'read' ? 'books' : route.name)));

  view.scrollTop = 0;
  view.classList.remove('screen'); void view.offsetWidth; view.classList.add('screen');

  switch (route.name) {
    case 'books': return renderBooks(route.params);
    case 'read': return renderReader(route.parts[1], Number(route.parts[2]), Number(route.params.get('v')) || null);
    case 'favorites': return renderFavorites();
    case 'profile': return renderProfile();
    default: return renderHome(route.params);
  }
}

/* ================= Boas-vindas ================= */
function renderWelcome() {
  nav.hidden = true;
  view.innerHTML = `
    <div class="welcome">
      <div class="art-big">${icon('bookOpen', 54)}</div>
      <h1>Sua Bíblia,<br>simples e bonita.</h1>
      <p>Leia a tradução Almeida, acompanhe planos de leitura, guarde seus versículos favoritos e ajuste a leitura do seu jeito.</p>
      <div class="field" style="margin-bottom:14px">
        <label for="welcome-name">Como podemos te chamar?</label>
        <input id="welcome-name" autocomplete="given-name" placeholder="Seu nome" maxlength="24">
      </div>
      <button class="btn" id="welcome-go">Começar a ler ${icon('right', 18)}</button>
    </div>`;
  const input = $('#welcome-name');
  const start = () => { update({ name: input.value.trim(), onboarded: true }); go('/home'); render(); };
  $('#welcome-go').onclick = start;
  input.onkeydown = (e) => { if (e.key === 'Enter') start(); };
}

/* ================= Início ================= */
function renderHome(params) {
  const tab = params.get('tab') || 'inicio';
  const [db, dc, dv] = dailyVerse();
  const plan = PLANS.find(p => p.id === state.activePlan) || PLANS[0];
  const pp = planProgress(plan);
  const last = state.last;
  const totalRead = readCount();

  view.innerHTML = `
    <header class="topbar">
      <div>
        <h1>${greeting()}${state.name ? ', ' + esc(state.name) : ''}</h1>
        <div class="sub">${fmtDate()}</div>
      </div>
      <button class="round-btn" data-action="toggle-theme" aria-label="Alternar tema">${icon(document.documentElement.dataset.theme === 'night' ? 'sun' : 'moon', 18)}</button>
    </header>

    <article class="hero" data-action="open-daily" role="button" tabindex="0">
      <div class="art">${icon('sparkle', 26)}</div>
      <div class="eyebrow">${icon('calendar', 13)} Versículo do dia · ${getVersion(state.version).abbr}</div>
      <div class="ref">${refLabel(db, dc, dv)}</div>
      <p class="verse loading" id="daily-text">Carregando…</p>
      <div class="hero-stats">
        <div><b>Sequência</b><span>${currentStreak()} ${currentStreak() === 1 ? 'dia' : 'dias'}</span></div>
        <div><b>Capítulos</b><span>${totalRead} lidos</span></div>
        <div><b>Favoritos</b><span>${state.favorites.length}</span></div>
      </div>
    </article>

    <section class="activity" id="activity"></section>

    <div class="segmented" role="tablist">
      <button class="${tab === 'inicio' ? 'active' : ''}" data-action="home-tab" data-tab="inicio">Atalhos</button>
      <button class="${tab === 'planos' ? 'active' : ''}" data-action="home-tab" data-tab="planos">Planos</button>
    </div>

    ${tab === 'inicio' ? `
      <div class="grid2">
        <button class="tile dark" data-action="continue">
          <div class="row"><span class="bubble">${icon('bookOpen', 17)}</span><span class="pill on"></span></div>
          <div><h3>Continuar lendo</h3><p>${refLabel(last.book, last.chapter)}</p></div>
        </button>
        <button class="tile" data-action="nav" data-to="/books">
          <div class="row"><span class="bubble">${icon('library', 17)}</span><span class="pill"></span></div>
          <div><h3>Livros</h3><p>66 livros · AT e NT</p></div>
        </button>
        <button class="tile" data-action="nav" data-to="/favorites">
          <div class="row"><span class="bubble">${icon('heart', 17)}</span><span class="pill ${state.favorites.length ? 'on' : ''}"></span></div>
          <div><h3>Favoritos</h3><p>${state.favorites.length} ${state.favorites.length === 1 ? 'versículo' : 'versículos'}</p></div>
        </button>
        <button class="tile" data-action="plan-go" data-plan="${plan.id}">
          <div class="row"><span class="bubble">${icon(plan.icon, 17)}</span><span class="pill ${pp.done ? 'on' : ''}"></span></div>
          <div><h3>${plan.title}</h3><p>${pct(pp.done, pp.total)}% · próx. ${refLabel(...pp.next)}</p></div>
        </button>
      </div>

      <section class="stat-card">
        <h3>Sua jornada</h3>
        <p>Progresso na Bíblia completa</p>
        <div class="bar" style="background:var(--surface)"><i style="width:${Math.max(pct(totalRead, TOTAL_CHAPTERS), totalRead ? 1 : 0)}%"></i></div>
        <div class="stat-row">
          <div class="stat"><span class="bubble">${icon('chart', 17)}</span><div><b>${pct(totalRead, TOTAL_CHAPTERS)}%</b><span>da Bíblia</span></div></div>
          <div class="stat"><span class="bubble">${icon('flame', 17)}</span><div><b>${currentStreak()}</b><span>dias seguidos</span></div></div>
        </div>
      </section>
    ` : `
      <div class="list">
        ${PLANS.map(p => {
          const pr = planProgress(p);
          const active = p.id === state.activePlan;
          return `
          <button class="plan ${active ? 'active' : ''}" data-action="plan-go" data-plan="${p.id}">
            <span class="bubble">${icon(p.icon, 18)}</span>
            <div class="info">
              <h3>${p.title}</h3>
              <p>${active ? 'Próximo: ' + refLabel(...pr.next) : p.subtitle}</p>
              <div class="bar"><i style="width:${pct(pr.done, pr.total)}%"></i></div>
            </div>
            <span class="pct">${pct(pr.done, pr.total)}%</span>
          </button>`;
        }).join('')}
      </div>
    `}
  `;

  weekOffset = 0;
  drawActivity();

  fetchVerse(db, dc, dv, state.version)
    .then(v => { const el = $('#daily-text'); if (el) { el.textContent = v.t; el.classList.remove('loading'); } })
    .catch(() => { const el = $('#daily-text'); if (el) el.textContent = 'Sem conexão. Toque para tentar abrir o capítulo.'; });
}

/* ================= Atividade semanal ================= */
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const level = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);
let weekOffset = 0; // 0 = semana atual, -1 = semana passada…

function startOfWeek(d = new Date()) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay()); // domingo
  return s;
}

function weekDays(offset) {
  const s = startOfWeek();
  s.setDate(s.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
}

const weekSum = (days) => days.reduce((n, d) => n + (state.activity[dayKey(d)] || 0), 0);

function weekRangeLabel(days) {
  const a = days[0], b = days[6];
  const m = (d) => new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '');
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} de ${m(b)}`
    : `${a.getDate()} de ${m(a)} – ${b.getDate()} de ${m(b)}`;
}

function drawActivity() {
  const box = $('#activity');
  if (!box) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = weekDays(weekOffset);
  const total = weekSum(days);
  const prev = weekSum(weekDays(weekOffset - 1));
  const active = days.filter(d => state.activity[dayKey(d)]).length;
  const title = weekOffset === 0 ? 'Esta semana' : weekOffset === -1 ? 'Semana passada' : weekRangeLabel(days);
  const diff = total - prev;

  box.innerHTML = `
    <div class="activity-head">
      <div>
        <h3>${title}</h3>
        <p>${weekOffset > -2 ? weekRangeLabel(days) : 'Atividade de leitura'}</p>
      </div>
      <div class="week-nav">
        <button data-action="week" data-dir="-1" aria-label="Semana anterior">${icon('back', 16)}</button>
        <button data-action="week" data-dir="1" aria-label="Próxima semana" ${weekOffset >= 0 ? 'disabled' : ''}>${icon('right', 16)}</button>
      </div>
    </div>
    <div class="week-row">
      ${days.map((d, i) => {
        const n = state.activity[dayKey(d)] || 0;
        const future = d > today;
        const isToday = d.getTime() === today.getTime();
        return `
        <div class="day ${isToday ? 'today' : ''} ${future ? 'future' : ''}">
          <span class="wd">${WEEKDAYS[i]}</span>
          <span class="cell l${future ? 0 : level(n)}">${n && !future ? n : ''}</span>
          <span class="dn">${d.getDate()}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="week-foot">
      <span><b>${total}</b> ${total === 1 ? 'capítulo' : 'capítulos'} · ${active} de 7 dias</span>
      ${prev || total ? `<span class="trend ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff > 0 ? '+' : ''}${diff} vs. anterior</span>` : ''}
    </div>`;
}

/* ================= Livros ================= */
function renderBooks(params) {
  let testament = params.get('t') || BOOK_BY_ID[state.last.book].testament;
  let query = '';

  view.innerHTML = `
    <header class="topbar">
      <div><h1>Bíblia</h1><button class="version-pill" data-action="open-versions">${getVersion(state.version).name} ${icon('down', 14)}</button></div>
      <button class="round-btn" data-action="open-settings" aria-label="Aparência">${icon('type', 18)}</button>
    </header>
    <label class="search">${icon('search', 18)}<input id="book-search" type="search" placeholder="Buscar livro…" autocomplete="off"></label>
    <div class="segmented" id="testament-tabs">
      <button data-t="AT">Antigo Testamento</button>
      <button data-t="NT">Novo Testamento</button>
    </div>
    <div id="book-list"></div>`;

  const list = $('#book-list');
  const draw = () => {
    $$('#testament-tabs button').forEach(b => b.classList.toggle('active', b.dataset.t === testament && !query));
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const q = norm(query);
    const items = BOOKS.filter(b => q ? (norm(b.name).includes(q) || norm(b.abbr).startsWith(q)) : b.testament === testament);
    if (!items.length) { list.innerHTML = `<div class="empty"><p>Nenhum livro encontrado.</p></div>`; return; }
    const groups = [];
    items.forEach(b => {
      const g = groups[groups.length - 1];
      if (g && g.name === b.group) g.items.push(b); else groups.push({ name: b.group, items: [b] });
    });
    list.innerHTML = groups.map(g => `
      <div class="group-label">${g.name}</div>
      <div class="grid2">
        ${g.items.map(b => {
          const done = bookProgress(b.id);
          return `
          <button class="book ${b.id === state.last.book ? 'current' : ''}" data-action="pick-book" data-book="${b.id}">
            <span class="abbr">${b.abbr}</span>
            <div class="meta">
              <h4>${b.name}</h4>
              <p>${b.chapters} ${b.chapters === 1 ? 'capítulo' : 'capítulos'}</p>
              ${done ? `<div class="mini-bar"><i style="width:${pct(done, b.chapters)}%"></i></div>` : ''}
            </div>
          </button>`;
        }).join('')}
      </div>`).join('');
  };

  $('#testament-tabs').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    testament = b.dataset.t; query = ''; $('#book-search').value = '';
    history.replaceState(null, '', `#/books?t=${testament}`);
    draw();
  };
  $('#book-search').oninput = (e) => { query = e.target.value.trim(); draw(); };
  draw();
}

function openChapterPicker(bookId) {
  const b = BOOK_BY_ID[bookId];
  const current = state.last.book === bookId ? state.last.chapter : null;
  openSheet(`
    <h2>${b.name}</h2>
    <p class="hint">${bookProgress(bookId)} de ${b.chapters} capítulos lidos</p>
    <div class="chapter-grid">
      ${Array.from({ length: b.chapters }, (_, i) => i + 1).map(c =>
        `<button class="${c === current ? 'current' : isRead(bookId, c) ? 'read' : ''}" data-action="read" data-book="${bookId}" data-ch="${c}">${c}</button>`
      ).join('')}
    </div>`);
}

/* ================= Leitor ================= */
const selected = new Set();
let readerCtx = null;

function renderReader(bookId, chapter, focusVerse) {
  const b = BOOK_BY_ID[bookId];
  if (!b || !chapter || chapter < 1 || chapter > b.chapters) return go('/books');
  update({ last: { book: bookId, chapter } });
  selected.clear();
  readerCtx = { book: bookId, chapter, verses: [] };

  const prev = neighbor(bookId, chapter, -1);
  const next = neighbor(bookId, chapter, 1);

  view.innerHTML = `
    <header class="topbar center">
      <button class="round-btn" data-action="nav" data-to="/books?t=${b.testament}" aria-label="Voltar">${icon('back', 18)}</button>
      <div class="reader-title"><h1>${b.name}</h1><button class="version-pill small" data-action="open-versions">${getVersion(state.version).abbr} ${icon('down', 12)}</button></div>
      <button class="round-btn" data-action="open-settings" aria-label="Aparência">${icon('more', 18)}</button>
    </header>

    <nav class="chips" id="chips">
      ${Array.from({ length: b.chapters }, (_, i) => i + 1).map(c =>
        `<button class="chip ${c === chapter ? 'active' : ''} ${isRead(bookId, c) ? 'read' : ''}" data-action="read" data-book="${bookId}" data-ch="${c}">${b.chapters > 9 ? c : 'Cap. ' + c}</button>`
      ).join('')}
    </nav>

    <div class="chapter-head" data-action="pick-book" data-book="${bookId}" role="button">
      <div class="lbl">Capítulo</div>
      <div class="num">${chapter}</div>
    </div>

    <div class="text" id="chapter-text">
      <div class="skeleton">${'<i></i>'.repeat(9).replace(/<i><\/i>$/, '<i style="width:60%"></i>')}</div>
    </div>

    <section class="stat-card" id="chapter-end">
      <h3>Progresso de leitura</h3>
      <p>${b.name} · ${b.testament === 'AT' ? 'Antigo' : 'Novo'} Testamento</p>
      <div class="stat-row">
        <div class="stat"><span class="bubble">${icon('check', 17)}</span><div><b id="book-done">${bookProgress(bookId)}/${b.chapters}</b><span>capítulos</span></div></div>
        <div class="stat"><span class="bubble">${icon('chart', 17)}</span><div><b id="bible-done">${pct(readCount(), TOTAL_CHAPTERS)}%</b><span>da Bíblia</span></div></div>
      </div>
    </section>

    <div class="btn-row">
      <button class="btn ghost" ${prev ? `data-action="read" data-book="${prev[0]}" data-ch="${prev[1]}"` : 'disabled style="opacity:.4"'}>${icon('back', 16)} Anterior</button>
      <button class="btn" ${next ? `data-action="next" data-book="${next[0]}" data-ch="${next[1]}"` : 'disabled style="opacity:.4"'}>Próximo ${icon('right', 16)}</button>
    </div>`;

  // centraliza o capítulo ativo nos chips
  requestAnimationFrame(() => {
    const active = $('#chips .chip.active');
    if (active) $('#chips').scrollLeft = active.offsetLeft - $('#chips').clientWidth / 2 + active.clientWidth / 2;
  });

  loadChapterText(bookId, chapter, focusVerse);

  // marca como lido ao chegar ao fim do capítulo
  const end = $('#chapter-end');
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && readerCtx?.verses.length && !isRead(bookId, chapter)) {
      markRead(bookId, chapter);
      $('#book-done').textContent = `${bookProgress(bookId)}/${b.chapters}`;
      $('#bible-done').textContent = `${pct(readCount(), TOTAL_CHAPTERS)}%`;
      $(`#chips .chip.active`)?.classList.add('read');
      toast(`${refLabel(bookId, chapter)} marcado como lido`);
    }
  }, { root: view, threshold: 0.6 });
  io.observe(end);
  cleanup = () => io.disconnect();
}

async function loadChapterText(bookId, chapter, focusVerse) {
  const box = $('#chapter-text');
  try {
    const { verses } = await fetchChapter(bookId, chapter, state.version);
    if (!readerCtx || readerCtx.book !== bookId || readerCtx.chapter !== chapter) return;
    readerCtx.verses = verses;
    const heads = state.showHeadings ? headingsFor(bookId, chapter) : {};
    box.innerHTML = verses.map(v =>
      (heads[v.n] ? `<h3 class="epigrafe">${esc(heads[v.n])}</h3>` : '') +
      `<p class="v ${isFavorite(bookId, chapter, v.n) ? 'fav' : ''}" data-n="${v.n}"><sup>${v.n}</sup>${esc(v.t)}</p>`
    ).join('');
    if (focusVerse) {
      const el = $(`.v[data-n="${focusVerse}"]`, box);
      if (el) { el.classList.add('flash'); setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150); }
    }
  } catch (err) {
    box.innerHTML = `
      <div class="error-box">
        ${icon('bookOpen', 32)}<p style="margin-top:10px">Não foi possível carregar este capítulo.<br><small>${esc(err.message || 'Verifique sua conexão.')}</small></p>
        <button class="btn small" data-action="retry">Tentar novamente</button>
      </div>`;
  }
}

function selectionLabel() {
  const nums = [...selected].sort((a, b) => a - b);
  const parts = [];
  let start = nums[0], prev = nums[0];
  for (let i = 1; i <= nums.length; i++) {
    if (nums[i] === prev + 1) { prev = nums[i]; continue; }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = nums[i];
  }
  return `${refLabel(readerCtx.book, readerCtx.chapter)}:${parts.join(',')}`;
}

function selectionText() {
  const nums = [...selected].sort((a, b) => a - b);
  const text = nums.map(n => readerCtx.verses.find(v => v.n === n)?.t).filter(Boolean).join(' ');
  return `"${text}"\n— ${selectionLabel()} (${getVersion(state.version).abbr})`;
}

function showVerseBar() {
  const bar = $('#verse-bar');
  if (!selected.size) return hideVerseBar();
  const allFav = [...selected].every(n => isFavorite(readerCtx.book, readerCtx.chapter, n));
  $('.lbl', bar).textContent = selectionLabel();
  $('[data-action="fav-sel"]', bar).classList.toggle('on', allFav);
  bar.classList.add('show');
}
function hideVerseBar() {
  $('#verse-bar')?.classList.remove('show');
  $$('.v.sel').forEach(el => el.classList.remove('sel'));
  selected.clear();
}

/* ================= Favoritos ================= */
function renderFavorites() {
  const favs = state.favorites;
  view.innerHTML = `
    <header class="topbar">
      <div><h1>Favoritos</h1><div class="sub">${favs.length} ${favs.length === 1 ? 'versículo salvo' : 'versículos salvos'}</div></div>
      <span class="round-btn">${icon('heart', 18)}</span>
    </header>
    ${favs.length ? `<div class="list">
      ${favs.map((f, i) => `
        <article class="fav-card">
          <div class="head"><b>${refLabel(f.book, f.chapter, f.verse)} <small>${getVersion(f.version).abbr}</small></b>
            <span style="display:flex;gap:2px">
              <button data-action="fav-share" data-i="${i}" aria-label="Compartilhar">${icon('share', 16)}</button>
              <button data-action="fav-remove" data-i="${i}" aria-label="Remover">${icon('trash', 16)}</button>
            </span>
          </div>
          <p>${esc(f.text)}</p>
          <button class="open" data-action="nav" data-to="/read/${f.book}/${f.chapter}?v=${f.verse}">Abrir capítulo ${icon('right', 14)}</button>
        </article>`).join('')}
    </div>` : `
      <div class="empty">
        <div class="bubble">${icon('heart', 26)}</div>
        <h3>Nenhum favorito ainda</h3>
        <p>Toque em um versículo durante a leitura e use o coração para guardá-lo aqui.</p>
        <button class="btn small" style="margin-top:18px" data-action="continue">Começar a ler</button>
      </div>`}`;
}

/* ================= Perfil ================= */
function renderProfile() {
  const plan = PLANS.find(p => p.id === state.activePlan) || PLANS[0];
  const themeName = { auto: 'Automático', sepia: 'Sépia', day: 'Dia', night: 'Noite' }[state.theme];
  view.innerHTML = `
    <header class="topbar"><div><h1>Perfil</h1><div class="sub">Preferências e progresso</div></div></header>
    <div class="profile-head">
      <div class="avatar">${esc((state.name || '?').charAt(0).toUpperCase())}</div>
      <div style="flex:1">
        <div class="field" style="margin:0"><label for="name">Seu nome</label><input id="name" value="${esc(state.name)}" placeholder="Digite seu nome" maxlength="24"></div>
      </div>
    </div>

    <section class="stat-card">
      <h3>Estatísticas</h3>
      <p>Desde que você começou</p>
      <div class="stat-row">
        <div class="stat"><span class="bubble">${icon('book', 17)}</span><div><b>${readCount()}</b><span>capítulos lidos</span></div></div>
        <div class="stat"><span class="bubble">${icon('flame', 17)}</span><div><b>${currentStreak()}</b><span>dias seguidos</span></div></div>
      </div>
    </section>

    <div class="section-title">Configurações</div>
    <div class="list">
      <button class="setting-row" data-action="open-settings">
        <span class="bubble">${icon('type', 17)}</span>
        <div class="info"><b>Leitura e aparência</b><span>${themeName} · fonte ${state.fontScale}%</span></div>${icon('right', 16)}
      </button>
      <button class="setting-row" data-action="open-versions">
        <span class="bubble">${icon('book', 17)}</span>
        <div class="info"><b>Versão da Bíblia</b><span>${getVersion(state.version).name}</span></div>${icon('right', 16)}
      </button>
      <button class="setting-row" data-action="home-tab" data-tab="planos">
        <span class="bubble">${icon(plan.icon, 17)}</span>
        <div class="info"><b>Plano de leitura</b><span>${plan.title}</span></div>${icon('right', 16)}
      </button>
      <button class="setting-row danger" data-action="reset">
        <span class="bubble">${icon('trash', 17)}</span>
        <div class="info"><b>Apagar meus dados</b><span>Progresso, favoritos e preferências</span></div>
      </button>
    </div>

    <p class="about">Bíblia · versão 0.4.0<br>Almeida (domínio público) via <a href="https://bible-api.com" target="_blank" rel="noopener">bible-api.com</a><br>Demais versões via <a href="https://bolls.life" target="_blank" rel="noopener">bolls.life</a></p>`;

  $('#name').onchange = (e) => { update({ name: e.target.value.trim() }); renderProfile(); };
}

/* ================= Folha de configurações de leitura ================= */
const DIAL = { cx: 105, cy: 105, r: 86, start: 135, sweep: 270, min: 80, max: 160 };
const polar = (deg) => {
  const a = (deg * Math.PI) / 180;
  return [DIAL.cx + DIAL.r * Math.cos(a), DIAL.cy + DIAL.r * Math.sin(a)];
};
const ARC_LEN = 2 * Math.PI * DIAL.r * (DIAL.sweep / 360);

function openSettings() {
  const [sx, sy] = polar(DIAL.start);
  const [ex, ey] = polar(DIAL.start + DIAL.sweep);
  const arc = `M ${sx} ${sy} A ${DIAL.r} ${DIAL.r} 0 1 1 ${ex} ${ey}`;
  const modes = [
    ['auto', 'Auto', '<span class="letter">A</span>'],
    ['sepia', 'Sépia', icon('coffee', 22)],
    ['day', 'Dia', icon('sun', 22)],
    ['night', 'Noite', icon('moon', 22)],
  ];

  openSheet(`
    <h2>Leitura</h2>
    <button class="setting-row" style="margin-top:12px" data-action="open-versions">
      <span class="bubble">${icon('book', 17)}</span>
      <div class="info"><b>Versão</b><span>${getVersion(state.version).name}</span></div>${icon('right', 16)}
    </button>
    <div class="options" id="lh-options">
      ${[['compact', 'Compacto'], ['normal', 'Normal'], ['wide', 'Amplo']].map(([k, l]) =>
        `<button data-lh="${k}" class="${state.lineHeight === k ? 'active' : ''}">${l}</button>`).join('')}
    </div>

    <div class="options" id="hd-options">
      <button data-hd="1" class="${state.showHeadings ? 'active' : ''}">Com epígrafes</button>
      <button data-hd="0" class="${!state.showHeadings ? 'active' : ''}">Sem epígrafes</button>
    </div>

    <div class="ctrl-label">Tamanho da letra</div>
    <div class="dial-wrap" id="dial" role="slider" aria-label="Tamanho da letra" aria-valuemin="${DIAL.min}" aria-valuemax="${DIAL.max}" tabindex="0">
      <svg viewBox="0 0 210 210">
        <path d="${arc}" fill="none" stroke="var(--card)" stroke-width="12" stroke-linecap="round"/>
        <path id="dial-progress" d="${arc}" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${ARC_LEN}" stroke-dashoffset="${ARC_LEN}"/>
        <circle id="dial-knob" r="9" fill="var(--dark)" stroke="var(--surface)" stroke-width="4"/>
      </svg>
      <div class="dial-center"><b id="dial-value">100%</b><span>tamanho da letra</span></div>
    </div>
    <div class="dial-ends"><span>Min</span><span>Max</span></div>

    <div class="modes" id="modes">
      ${modes.map(([k, l, ic]) => `<button class="mode ${state.theme === k ? 'active' : ''}" data-mode="${k}"><span class="box">${ic}</span>${l}</button>`).join('')}
    </div>

    <div class="preview"><div class="text"><h3 class="epigrafe">A criação</h3><span class="v"><sup>1</sup>No princípio criou Deus os céus e a terra.</span></div></div>
    <button class="btn" style="margin-top:16px" data-action="close-sheet">Pronto</button>
  `);

  const dial = $('#dial');
  const setDial = (value, persist) => {
    value = Math.min(DIAL.max, Math.max(DIAL.min, Math.round(value / 5) * 5));
    const t = (value - DIAL.min) / (DIAL.max - DIAL.min);
    $('#dial-progress').setAttribute('stroke-dashoffset', ARC_LEN * (1 - t));
    const [kx, ky] = polar(DIAL.start + DIAL.sweep * t);
    const knob = $('#dial-knob'); knob.setAttribute('cx', kx); knob.setAttribute('cy', ky);
    $('#dial-value').textContent = value + '%';
    dial.setAttribute('aria-valuenow', value);
    if (value !== state.fontScale) { state.fontScale = value; applyPrefs(); }
    if (persist) save();
  };
  setDial(state.fontScale);

  const fromPointer = (e) => {
    const rect = dial.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 210 - DIAL.cx;
    const y = ((e.clientY - rect.top) / rect.height) * 210 - DIAL.cy;
    let rel = ((Math.atan2(y, x) * 180) / Math.PI - DIAL.start + 720) % 360;
    if (rel > DIAL.sweep) rel = rel > DIAL.sweep + (360 - DIAL.sweep) / 2 ? 0 : DIAL.sweep;
    setDial(DIAL.min + (rel / DIAL.sweep) * (DIAL.max - DIAL.min));
  };
  dial.onpointerdown = (e) => { dial.setPointerCapture(e.pointerId); fromPointer(e); };
  dial.onpointermove = (e) => { if (dial.hasPointerCapture(e.pointerId)) fromPointer(e); };
  dial.onpointerup = () => save();
  dial.onkeydown = (e) => {
    if (['ArrowRight', 'ArrowUp'].includes(e.key)) { setDial(state.fontScale + 5, true); e.preventDefault(); }
    if (['ArrowLeft', 'ArrowDown'].includes(e.key)) { setDial(state.fontScale - 5, true); e.preventDefault(); }
  };

  $('#modes').onclick = (e) => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    update({ theme: b.dataset.mode }); applyPrefs();
    $$('#modes .mode').forEach(m => m.classList.toggle('active', m === b));
  };
  $('#hd-options').onclick = (e) => {
    const b = e.target.closest('[data-hd]'); if (!b) return;
    update({ showHeadings: b.dataset.hd === '1' });
    $$('#hd-options button').forEach(x => x.classList.toggle('active', x === b));
    if (readerCtx && parseRoute().name === 'read') loadChapterText(readerCtx.book, readerCtx.chapter);
  };
  $('#lh-options').onclick = (e) => {
    const b = e.target.closest('[data-lh]'); if (!b) return;
    update({ lineHeight: b.dataset.lh }); applyPrefs();
    $$('#lh-options button').forEach(x => x.classList.toggle('active', x === b));
  };
}

/* ================= Folha de versões ================= */
function openVersions() {
  openSheet(`
    <h2>Versão da Bíblia</h2>
    <p class="hint">A escolha vale para a leitura e o versículo do dia</p>
    <div class="list">
      ${VERSIONS.map(v => `
        <button class="version-row ${v.id === state.version ? 'active' : ''}" data-action="set-version" data-version="${v.id}">
          <span class="abbr">${v.abbr}</span>
          <div class="info"><b>${v.name}</b><span>${v.note}</span></div>
          <span class="radio">${v.id === state.version ? icon('check', 14) : ''}</span>
        </button>`).join('')}
    </div>`);
}

/* ================= Sheet genérico ================= */
let sheetOnClose = null;
function openSheet(html, onClose) {
  hideVerseBar();
  $('#sheet-content').innerHTML = html;
  $('#sheet').classList.add('show');
  $('#sheet-backdrop').classList.add('show');
  sheetOnClose = onClose || null;
}
function closeSheet() {
  const wasOpen = $('#sheet').classList.contains('show');
  $('#sheet').classList.remove('show');
  $('#sheet-backdrop').classList.remove('show');
  if (wasOpen && sheetOnClose) { const fn = sheetOnClose; sheetOnClose = null; fn(); }
}

/* ================= Ações (delegação de eventos) ================= */
const actions = {
  nav: (el) => go(el.dataset.to),
  'home-tab': (el) => go(`/home?tab=${el.dataset.tab}`),
  continue: () => go(`/read/${state.last.book}/${state.last.chapter}`),
  'open-daily': () => { const [b, c, v] = dailyVerse(); go(`/read/${b}/${c}?v=${v}`); },
  'toggle-theme': () => {
    const isNight = document.documentElement.dataset.theme === 'night';
    update({ theme: isNight ? 'day' : 'night' }); applyPrefs(); render();
  },
  'pick-book': (el) => openChapterPicker(el.dataset.book),
  read: (el) => go(`/read/${el.dataset.book}/${el.dataset.ch}`),
  next: (el) => {
    if (readerCtx && readerCtx.verses.length) markRead(readerCtx.book, readerCtx.chapter);
    go(`/read/${el.dataset.book}/${el.dataset.ch}`);
  },
  retry: () => render(),
  'plan-go': (el) => {
    const plan = PLANS.find(p => p.id === el.dataset.plan);
    update({ activePlan: plan.id });
    const [b, c] = planProgress(plan).next;
    go(`/read/${b}/${c}`);
  },
  'open-settings': () => openSettings(),
  'open-versions': () => openVersions(),
  week: (el) => { weekOffset = Math.min(0, weekOffset + Number(el.dataset.dir)); drawActivity(); },
  'set-version': (el) => {
    update({ version: el.dataset.version });
    closeSheet();
    toast(`Versão: ${getVersion(state.version).name}`);
    render();
  },
  'close-sheet': () => closeSheet(),
  'fav-remove': (el) => {
    const f = state.favorites[Number(el.dataset.i)];
    if (f) toggleFavorite(f.book, f.chapter, f.verse);
    renderFavorites(); toast('Removido dos favoritos');
  },
  'fav-share': async (el) => {
    const f = state.favorites[Number(el.dataset.i)];
    if (f) share(`"${f.text}"\n— ${refLabel(f.book, f.chapter, f.verse)} (${getVersion(f.version).abbr})`);
  },
  'fav-sel': () => {
    const { book, chapter, verses } = readerCtx;
    const allFav = [...selected].every(n => isFavorite(book, chapter, n));
    selected.forEach(n => {
      if (allFav === isFavorite(book, chapter, n)) toggleFavorite(book, chapter, n, verses.find(v => v.n === n)?.t || '');
      $(`.v[data-n="${n}"]`)?.classList.toggle('fav', !allFav);
    });
    toast(allFav ? 'Removido dos favoritos' : 'Salvo nos favoritos');
    hideVerseBar();
  },
  'copy-sel': async () => { if (await copyText(selectionText())) toast('Versículo copiado'); hideVerseBar(); },
  'share-sel': () => { share(selectionText()); hideVerseBar(); },
  'close-bar': () => hideVerseBar(),
  reset: () => {
    if (confirm('Apagar todo o progresso, favoritos e preferências?')) { resetAll(); applyPrefs(); go('/home'); render(); }
  },
};

async function share(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  if (await copyText(text)) toast('Copiado para compartilhar');
}

app.addEventListener('click', (e) => {
  // toque em versículo
  const verse = e.target.closest('#chapter-text .v');
  if (verse) {
    const n = Number(verse.dataset.n);
    if (selected.has(n)) { selected.delete(n); verse.classList.remove('sel'); }
    else { selected.add(n); verse.classList.add('sel'); }
    return showVerseBar();
  }
  const el = e.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) { e.preventDefault(); actions[el.dataset.action](el); }
});
app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[role="button"][data-action]')) actions[e.target.dataset.action]?.(e.target);
  if (e.key === 'Escape') { closeSheet(); hideVerseBar(); }
});

nav.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) go('/' + b.dataset.tab);
});
$('#sheet-backdrop').addEventListener('click', closeSheet);

window.addEventListener('hashchange', render);

/* ================= Botão/gesto "voltar" do Android ================= */
let lastBackAt = 0;
function handleBack() {
  if ($('#sheet').classList.contains('show')) return closeSheet();
  if ($('#verse-bar').classList.contains('show')) return hideVerseBar();
  const r = parseRoute();
  const atRoot = !state.onboarded || (r.name === 'home' && !r.params.get('tab'));
  if (!atRoot) {
    if (navDepth > 0) { navDepth--; history.back(); }
    else location.replace('#/home');
    return;
  }
  // na tela inicial: é preciso voltar duas vezes para sair
  if (Date.now() - lastBackAt < 2000) {
    window.Capacitor?.Plugins?.App?.exitApp();
  } else {
    lastBackAt = Date.now();
    toast('Deslize de novo para sair');
  }
}

const CapApp = window.Capacitor?.Plugins?.App;
if (CapApp && window.Capacitor.isNativePlatform?.()) {
  CapApp.addListener('backButton', handleBack);
}

/* ================= Inicialização ================= */
applyPrefs();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
