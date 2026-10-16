// 66 livros da Bíblia (cânon protestante) — id segue o padrão USFM usado pela bible-api.com
const RAW = [
  // Antigo Testamento
  ['GEN', 'Gênesis', 'Gn', 50, 'Lei'],
  ['EXO', 'Êxodo', 'Êx', 40, 'Lei'],
  ['LEV', 'Levítico', 'Lv', 27, 'Lei'],
  ['NUM', 'Números', 'Nm', 36, 'Lei'],
  ['DEU', 'Deuteronômio', 'Dt', 34, 'Lei'],
  ['JOS', 'Josué', 'Js', 24, 'Históricos'],
  ['JDG', 'Juízes', 'Jz', 21, 'Históricos'],
  ['RUT', 'Rute', 'Rt', 4, 'Históricos'],
  ['1SA', '1 Samuel', '1Sm', 31, 'Históricos'],
  ['2SA', '2 Samuel', '2Sm', 24, 'Históricos'],
  ['1KI', '1 Reis', '1Rs', 22, 'Históricos'],
  ['2KI', '2 Reis', '2Rs', 25, 'Históricos'],
  ['1CH', '1 Crônicas', '1Cr', 29, 'Históricos'],
  ['2CH', '2 Crônicas', '2Cr', 36, 'Históricos'],
  ['EZR', 'Esdras', 'Ed', 10, 'Históricos'],
  ['NEH', 'Neemias', 'Ne', 13, 'Históricos'],
  ['EST', 'Ester', 'Et', 10, 'Históricos'],
  ['JOB', 'Jó', 'Jó', 42, 'Poéticos'],
  ['PSA', 'Salmos', 'Sl', 150, 'Poéticos'],
  ['PRO', 'Provérbios', 'Pv', 31, 'Poéticos'],
  ['ECC', 'Eclesiastes', 'Ec', 12, 'Poéticos'],
  ['SNG', 'Cânticos', 'Ct', 8, 'Poéticos'],
  ['ISA', 'Isaías', 'Is', 66, 'Profetas maiores'],
  ['JER', 'Jeremias', 'Jr', 52, 'Profetas maiores'],
  ['LAM', 'Lamentações', 'Lm', 5, 'Profetas maiores'],
  ['EZK', 'Ezequiel', 'Ez', 48, 'Profetas maiores'],
  ['DAN', 'Daniel', 'Dn', 12, 'Profetas maiores'],
  ['HOS', 'Oseias', 'Os', 14, 'Profetas menores'],
  ['JOL', 'Joel', 'Jl', 3, 'Profetas menores'],
  ['AMO', 'Amós', 'Am', 9, 'Profetas menores'],
  ['OBA', 'Obadias', 'Ob', 1, 'Profetas menores'],
  ['JON', 'Jonas', 'Jn', 4, 'Profetas menores'],
  ['MIC', 'Miqueias', 'Mq', 7, 'Profetas menores'],
  ['NAM', 'Naum', 'Na', 3, 'Profetas menores'],
  ['HAB', 'Habacuque', 'Hc', 3, 'Profetas menores'],
  ['ZEP', 'Sofonias', 'Sf', 3, 'Profetas menores'],
  ['HAG', 'Ageu', 'Ag', 2, 'Profetas menores'],
  ['ZEC', 'Zacarias', 'Zc', 14, 'Profetas menores'],
  ['MAL', 'Malaquias', 'Ml', 4, 'Profetas menores'],
  // Novo Testamento
  ['MAT', 'Mateus', 'Mt', 28, 'Evangelhos'],
  ['MRK', 'Marcos', 'Mc', 16, 'Evangelhos'],
  ['LUK', 'Lucas', 'Lc', 24, 'Evangelhos'],
  ['JHN', 'João', 'Jo', 21, 'Evangelhos'],
  ['ACT', 'Atos', 'At', 28, 'Histórico'],
  ['ROM', 'Romanos', 'Rm', 16, 'Cartas de Paulo'],
  ['1CO', '1 Coríntios', '1Co', 16, 'Cartas de Paulo'],
  ['2CO', '2 Coríntios', '2Co', 13, 'Cartas de Paulo'],
  ['GAL', 'Gálatas', 'Gl', 6, 'Cartas de Paulo'],
  ['EPH', 'Efésios', 'Ef', 6, 'Cartas de Paulo'],
  ['PHP', 'Filipenses', 'Fp', 4, 'Cartas de Paulo'],
  ['COL', 'Colossenses', 'Cl', 4, 'Cartas de Paulo'],
  ['1TH', '1 Tessalonicenses', '1Ts', 5, 'Cartas de Paulo'],
  ['2TH', '2 Tessalonicenses', '2Ts', 3, 'Cartas de Paulo'],
  ['1TI', '1 Timóteo', '1Tm', 6, 'Cartas de Paulo'],
  ['2TI', '2 Timóteo', '2Tm', 4, 'Cartas de Paulo'],
  ['TIT', 'Tito', 'Tt', 3, 'Cartas de Paulo'],
  ['PHM', 'Filemom', 'Fm', 1, 'Cartas de Paulo'],
  ['HEB', 'Hebreus', 'Hb', 13, 'Cartas gerais'],
  ['JAS', 'Tiago', 'Tg', 5, 'Cartas gerais'],
  ['1PE', '1 Pedro', '1Pe', 5, 'Cartas gerais'],
  ['2PE', '2 Pedro', '2Pe', 3, 'Cartas gerais'],
  ['1JN', '1 João', '1Jo', 5, 'Cartas gerais'],
  ['2JN', '2 João', '2Jo', 1, 'Cartas gerais'],
  ['3JN', '3 João', '3Jo', 1, 'Cartas gerais'],
  ['JUD', 'Judas', 'Jd', 1, 'Cartas gerais'],
  ['REV', 'Apocalipse', 'Ap', 22, 'Profético'],
];

export const BOOKS = RAW.map(([id, name, abbr, chapters, group], i) => ({
  id, name, abbr, chapters, group,
  testament: i < 39 ? 'AT' : 'NT',
  index: i,
}));

export const BOOK_BY_ID = Object.fromEntries(BOOKS.map(b => [b.id, b]));
export const TOTAL_CHAPTERS = BOOKS.reduce((s, b) => s + b.chapters, 0); // 1189

// Versículos do dia (referências; o texto é carregado da tradução Almeida)
export const DAILY_VERSES = [
  ['PSA', 23, 1], ['JHN', 3, 16], ['PHP', 4, 13], ['JER', 29, 11], ['ROM', 8, 28],
  ['PRO', 3, 5], ['ISA', 41, 10], ['MAT', 11, 28], ['PSA', 46, 1], ['JOS', 1, 9],
  ['2TI', 1, 7], ['PSA', 119, 105], ['MAT', 6, 33], ['ROM', 12, 2], ['GAL', 5, 22],
  ['1CO', 13, 4], ['HEB', 11, 1], ['PSA', 37, 5], ['ISA', 40, 31], ['JHN', 14, 6],
  ['LAM', 3, 22], ['PSA', 91, 1], ['EPH', 2, 8], ['1JN', 4, 19], ['MAT', 5, 9],
  ['PRO', 16, 3], ['ROM', 15, 13], ['PSA', 27, 1], ['JHN', 16, 33], ['COL', 3, 23],
];

const range = (id) => Array.from({ length: BOOK_BY_ID[id].chapters }, (_, i) => [id, i + 1]);

// Planos de leitura: lista ordenada de [livro, capítulo]
export const PLANS = [
  {
    id: 'evangelhos',
    title: 'Os Evangelhos',
    subtitle: 'A vida de Jesus em 89 capítulos',
    icon: 'cross',
    chapters: ['MAT', 'MRK', 'LUK', 'JHN'].flatMap(range),
  },
  {
    id: 'salmos',
    title: 'Salmos e Provérbios',
    subtitle: 'Sabedoria e oração diária',
    icon: 'music',
    chapters: ['PSA', 'PRO'].flatMap(range),
  },
  {
    id: 'nt',
    title: 'Novo Testamento',
    subtitle: 'De Mateus a Apocalipse',
    icon: 'book',
    chapters: BOOKS.filter(b => b.testament === 'NT').flatMap(b => range(b.id)),
  },
  {
    id: 'biblia',
    title: 'Bíblia completa',
    subtitle: 'Todos os 1.189 capítulos',
    icon: 'library',
    chapters: BOOKS.flatMap(b => range(b.id)),
  },
];
