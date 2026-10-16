// Epígrafes: títulos de seção escritos para o app (valem para todas as versões)
import AT from './at.js';
import NT from './nt.js';

const RAW = { ...AT, ...NT };
const parsed = new Map();

// retorna { versículo: título } para um capítulo
export function headingsFor(book, chapter) {
  if (!parsed.has(book)) {
    const byChapter = {};
    (RAW[book] || '').split('|').filter(Boolean).forEach(entry => {
      const m = entry.match(/^(\d+):(\d+)\s+(.+)$/);
      if (!m) return;
      const [, c, v, title] = m;
      (byChapter[c] ||= {})[v] = title.trim();
    });
    parsed.set(book, byChapter);
  }
  return parsed.get(book)[chapter] || {};
}
