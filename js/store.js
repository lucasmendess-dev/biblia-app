// Estado persistido no localStorage
const KEY = 'biblia-app:v1';

const DEFAULTS = {
  name: '',
  theme: 'auto',          // auto | sepia | day | night
  fontScale: 100,         // 80 – 160 (%)
  lineHeight: 'normal',   // compact | normal | wide
  last: { book: 'JHN', chapter: 1 },
  read: {},               // { 'JHN:3': timestamp }
  favorites: [],          // [{ book, chapter, verse, text, at }]
  streak: { count: 0, lastDay: null },
  activePlan: 'evangelhos',
  version: 'almeida',
  showHeadings: true,     // exibir epígrafes     // id em js/versions.js
  activity: {},           // { 'AAAA-MM-DD': capítulos lidos no dia }
};

// chave do dia no fuso local (AAAA-MM-DD)
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function load() {
  let saved = null;
  try { saved = safeParse(localStorage.getItem(KEY)); } catch { /* storage indisponível */ }
  const s = { ...structuredClone(DEFAULTS), ...(saved || {}) };
  // migração: monta a atividade a partir dos capítulos já lidos
  if (!saved?.activity) {
    s.activity = {};
    Object.values(s.read).forEach(ts => { const k = dayKey(new Date(ts)); s.activity[k] = (s.activity[k] || 0) + 1; });
  }
  return s;
}

const listeners = new Set();
export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignora */ }
  listeners.forEach(fn => fn(state));
}

export function update(patch) {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  save();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}


export function markRead(book, chapter) {
  const key = `${book}:${chapter}`;
  const today = dayKey();
  // conta na atividade do dia apenas uma vez por capítulo
  const prev = state.read[key];
  if (!prev || dayKey(new Date(prev)) !== today) {
    state.activity = { ...state.activity, [today]: (state.activity[today] || 0) + 1 };
  }
  state.read[key] = Date.now();
  // sequência de dias de leitura
  const yesterday = dayKey(new Date(Date.now() - 864e5));
  if (state.streak.lastDay !== today) {
    state.streak = {
      count: state.streak.lastDay === yesterday ? state.streak.count + 1 : 1,
      lastDay: today,
    };
  }
  save();
}

export const isRead = (book, chapter) => Boolean(state.read[`${book}:${chapter}`]);
export const readCount = () => Object.keys(state.read).length;

export function isFavorite(book, chapter, verse) {
  return state.favorites.some(f => f.book === book && f.chapter === chapter && f.verse === verse);
}

export function toggleFavorite(book, chapter, verse, text, version = state.version) {
  if (isFavorite(book, chapter, verse)) {
    state.favorites = state.favorites.filter(f => !(f.book === book && f.chapter === chapter && f.verse === verse));
  } else {
    state.favorites = [{ book, chapter, verse, text, version, at: Date.now() }, ...state.favorites];
  }
  save();
}

export function currentStreak() {
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 864e5));
  return [today, yesterday].includes(state.streak.lastDay) ? state.streak.count : 0;
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, structuredClone(DEFAULTS));
  save();
}
