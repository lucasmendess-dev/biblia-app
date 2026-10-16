// Busca capítulos da Bíblia na versão escolhida, com cache local
import { BOOK_BY_ID } from './books.js';
import { getVersion } from './versions.js';

const CACHE_PREFIX = 'biblia-app:c2:';
const memory = new Map();

// remove o cache do formato antigo (v0.1.0)
try {
  Object.keys(localStorage).filter(k => k.startsWith('biblia-app:ch:')).forEach(k => localStorage.removeItem(k));
} catch { /* ignora */ }

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

const decoder = typeof document !== 'undefined' ? document.createElement('textarea') : null;
function clean(t) {
  let s = String(t)
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')   // marcadores de notas de rodapé
    .replace(/<S>\d+<\/S>/g, '')             // números de Strong
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '');                // demais tags (itálico etc.)
  if (decoder && /&[#a-z0-9]+;/i.test(s)) { decoder.innerHTML = s; s = decoder.value; }
  return s.replace(/\s+/g, ' ').trim();
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 429 ? 'Muitas requisições. Aguarde alguns segundos.' : `Erro ${res.status}`);
  return res.json();
}

const SOURCES = {
  async bibleapi(code, book, chapter) {
    const data = await getJson(`https://bible-api.com/data/${code}/${book}/${chapter}`);
    return (data.verses || []).map(v => ({ n: v.verse, t: clean(v.text) }));
  },
  async bolls(code, book, chapter) {
    const num = BOOK_BY_ID[book].index + 1;
    const data = await getJson(`https://bolls.life/get-text/${code}/${num}/${chapter}/`);
    return (Array.isArray(data) ? data : []).map(v => ({ n: v.verse, t: clean(v.text) }));
  },
};

export async function fetchChapter(book, chapter, versionId) {
  const version = getVersion(versionId);
  const key = `${version.id}:${book}:${chapter}`;
  if (memory.has(key)) return memory.get(key);
  const cached = readCache(key);
  if (cached) { memory.set(key, cached); return cached; }

  const verses = (await SOURCES[version.source](version.code, book, chapter)).filter(v => v.t);
  if (!verses.length) throw new Error('Capítulo não encontrado nesta versão');
  const value = { verses };
  memory.set(key, value);
  writeCache(key, value);
  return value;
}

export async function fetchVerse(book, chapter, verse, versionId) {
  const { verses } = await fetchChapter(book, chapter, versionId);
  return verses.find(v => v.n === verse) || verses[0];
}
