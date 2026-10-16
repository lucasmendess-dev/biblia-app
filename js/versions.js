// Versões da Bíblia disponíveis.
// source 'bibleapi' → bible-api.com (domínio público) | source 'bolls' → bolls.life
export const VERSIONS = [
  { id: 'almeida', abbr: 'ALM', name: 'João Ferreira de Almeida', note: 'Clássica · domínio público', source: 'bibleapi', code: 'almeida' },
  { id: 'ara', abbr: 'ARA', name: 'Almeida Revista e Atualizada', note: 'Tradicional, linguagem formal', source: 'bolls', code: 'ARA' },
  { id: 'arc', abbr: 'ARC', name: 'Almeida Revista e Corrigida', note: 'Tradicional, mais literal', source: 'bolls', code: 'ARC09' },
  { id: 'acf', abbr: 'ACF', name: 'Almeida Corrigida Fiel', note: 'Fiel ao Texto Recebido', source: 'bolls', code: 'ACF11' },
  { id: 'naa', abbr: 'NAA', name: 'Nova Almeida Atualizada', note: 'Almeida com português atual', source: 'bolls', code: 'NAA' },
  { id: 'nvt', abbr: 'NVT', name: 'Nova Versão Transformadora', note: 'Clara e contemporânea', source: 'bolls', code: 'NVT' },
  { id: 'ntlh', abbr: 'NTLH', name: 'Nova Tradução na Linguagem de Hoje', note: 'Linguagem simples do dia a dia', source: 'bolls', code: 'NTLH' },
  { id: 'kja', abbr: 'KJA', name: 'King James Atualizada', note: 'Baseada na King James', source: 'bolls', code: 'KJA' },
];

export const VERSION_BY_ID = Object.fromEntries(VERSIONS.map(v => [v.id, v]));
export const getVersion = (id) => VERSION_BY_ID[id] || VERSIONS[0];
