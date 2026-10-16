// Busca capítulos na bible-api.com (tradução João Ferreira de Almeida — domínio público)
const BASE = 'https://bible-api.com/data/almeida';
const CACHE_PREFIX = 'biblia-app:ch:';
const memory = new Map();

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(key, value) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value)); }
  catch {
    // armazenamento cheio: limpa o cache de capítulos e tenta de novo
    try {
      Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
    } catch { /* ignora */ }
  }
}

const clean = (t) => String(t).replace(/\s+/g, ' ').trim();

export async function fetchChapter(book, chapter) {
  const key = `${book}:${chapter}`;
  if (memory.has(key)) return memory.get(key);
  const cached = readCache(key);
  if (cached) { memory.set(key, cached); return cached; }

  const res = await fetch(`${BASE}/${book}/${chapter}`);
  if (!res.ok) throw new Error(res.status === 429 ? 'Muitas requisições. Aguarde alguns segundos.' : `Erro ${res.status}`);
  const data = await res.json();
  const verses = (data.verses || []).map(v => ({ n: v.verse, t: clean(v.text) }));
  if (!verses.length) throw new Error('Capítulo não encontrado');
  const value = { verses };
  memory.set(key, value);
  writeCache(key, value);
  return value;
}

export async function fetchVerse(book, chapter, verse) {
  const { verses } = await fetchChapter(book, chapter);
  return verses.find(v => v.n === verse) || verses[0];
}
