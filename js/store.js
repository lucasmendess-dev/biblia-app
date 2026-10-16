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
};

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function load() {
  let saved = null;
  try { saved = safeParse(localStorage.getItem(KEY)); } catch { /* storage indisponível */ }
  return { ...DEFAULTS, ...(saved || {}) };
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

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

export function markRead(book, chapter) {
  state.read[`${book}:${chapter}`] = Date.now();
  // sequência de dias de leitura
  const today = dayKey();
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

export function toggleFavorite(book, chapter, verse, text) {
  if (isFavorite(book, chapter, verse)) {
    state.favorites = state.favorites.filter(f => !(f.book === book && f.chapter === chapter && f.verse === verse));
  } else {
    state.favorites = [{ book, chapter, verse, text, at: Date.now() }, ...state.favorites];
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
