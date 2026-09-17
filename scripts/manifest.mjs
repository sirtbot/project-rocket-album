// Junta as selecoes dos agentes (selecao_*.json na pasta dada) em public/photos.json.
// Fotos sem selecao entram com score 5, portanto ficam de fora ate um agente as ver.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const thumbs = join(raiz, 'public/photos/thumb');
const pastaSelecoes = process.argv[2];

const ficheiros = readdirSync(thumbs).filter((f) => f.endsWith('.jpg')).sort();
const porFicheiro = new Map(ficheiros.map((f) => [f, { file: f, score: 5, hero: false, tipo: 'comboio', legenda: 'Comboio Project Rocket', duplicada_de: null }]));

if (pastaSelecoes && existsSync(pastaSelecoes)) {
  for (const n of readdirSync(pastaSelecoes).filter((f) => /^selecao_.*\.json$/.test(f))) {
    for (const s of JSON.parse(readFileSync(join(pastaSelecoes, n), 'utf8'))) {
      if (porFicheiro.has(s.file)) porFicheiro.set(s.file, { ...porFicheiro.get(s.file), ...s });
    }
  }
}

const lista = [...porFicheiro.values()]
  .filter((f) => f.score >= 5 && !f.duplicada_de)
  .sort((a, b) => (b.hero - a.hero) || (b.score - a.score) || a.file.localeCompare(b.file));

writeFileSync(join(raiz, 'public/photos.json'), JSON.stringify(lista, null, 1));
const semVer = ficheiros.length - [...porFicheiro.values()].filter((f) => f.legenda !== 'Comboio Project Rocket' || f.score !== 5).length;
console.log(`photos.json: ${lista.length} fotos (${lista.filter((f) => f.hero).length} hero) de ${ficheiros.length}; por classificar: ${semVer}`);
