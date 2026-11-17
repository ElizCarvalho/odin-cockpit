#!/usr/bin/env node
// Publica o cockpit do Odin no GitHub Pages.
//
// 1. Pega o export mais recente (odin-export-*.json) da pasta Downloads
//    (ou o arquivo passado como argumento).
// 2. Remove dados pessoais conforme config/anonimizacao.json.
// 3. Gera docs/ (site estático): index.html + data/odin.json + data/photos/.
// 4. Com --push, faz commit e push (o GitHub Pages atualiza sozinho).
//
// Uso:
//   npm run publicar                       # só gera docs/ pra conferir
//   npm run publicar -- --push             # gera, commita e publica
//   npm run publicar -- caminho/arquivo.json --push

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const push = args.includes('--push');
const fileArg = args.find(a => !a.startsWith('--'));

function findExport() {
  if (fileArg) return path.resolve(fileArg);
  const dirs = [path.join(ROOT, 'exports'), path.join(os.homedir(), 'Downloads')];
  const found = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (/^odin-export-.*\.json$/.test(f)) {
      const p = path.join(d, f); found.push({ p, t: fs.statSync(p).mtimeMs });
    }
  }
  if (!found.length) throw new Error('Nenhum odin-export-*.json em Downloads nem em exports/. Exporte pelo cockpit (Painel > Publicar no site).');
  return found.sort((a, b) => b.t - a.t)[0].p;
}

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/anonimizacao.json'), 'utf8'));
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// aceita a palavra com ou sem acento (Patrícia = Patricia)
const FOLD = { a: '[aáàâã]', e: '[eéê]', i: '[ií]', o: '[oóôõ]', u: '[uú]', c: '[cç]' };
const loose = s => [...s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')].map(ch => FOLD[ch.toLowerCase()] || escapeRe(ch)).join('').replace(/\\\.\s|\\\./g, m => m.includes(' ') ? '\\.?\\s*' : '\\.?');
const pairs = Object.entries(cfg.substituir).sort((a, b) => b[0].length - a[0].length)
  .map(([from, to]) => [new RegExp(`(?<![\\p{L}])${loose(from)}(?![\\p{L}])`, 'giu'), to]);
const dropLine = (cfg.remover_linhas || []).map(r => new RegExp(r, 'i'));
const forbidden = (cfg.proibidos || []).map(r => new RegExp(r, 'i'));

function clean(str) {
  let s = String(str);
  s = s.replace(/\s*\((?:Dra?\.?|Dr\.)\s[^)]*\)/g, '');                // "(Dra. Fulana, CRMV ...)"
  s = s.replace(/,?\s*CRMV[- ]?(?:[A-Z]{2})?\s*[\d.]+/gi, '');           // CRMV-RJ 12345
  s = s.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[removido]');         // CPF
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[removido]');                // e-mail
  s = s.replace(/\(?\b\d{2}\)?\s?9?\d{4}-\d{4}\b/g, '[removido]');       // telefone
  s = s.replace(/\b\d{15}\b/g, '[removido]');                            // microchip
  for (const [re, to] of pairs) s = s.replace(re, to);
  s = s.replace(/(?<!\p{L})(pela|pelo|da|do|na|no|à|para a|com a) a (veterin|neurolog|tutora|respons)/giu, (m, p, w) => `${p} ${w}`);
  s = s.replace(/\(\s*[,;]?\s*\)/g, '');                                // parênteses que ficaram vazios
  return s.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([,.;:)])/g, '$1').trim();
}
function walk(v) {
  if (typeof v === 'string') return clean(v);
  if (Array.isArray(v)) return v
    .filter(x => !(typeof x === 'string' && dropLine.some(re => re.test(x))))
    .map(walk);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = walk(x);
    return o;
  }
  return v;
}

const src = findExport();
console.log('Export:', src);
const raw = JSON.parse(fs.readFileSync(src, 'utf8'));

// fotos: tira o base64 do JSON e grava como arquivo
const photosDir = path.join(ROOT, 'docs/data/photos');
fs.rmSync(photosDir, { recursive: true, force: true });
fs.mkdirSync(photosDir, { recursive: true });
const photos = [];
for (const p of raw.photos || []) {
  const { dataUrl, ...rest } = p;
  if (!dataUrl) continue; // vídeos ficam de fora do site
  const b64 = dataUrl.split(',')[1];
  fs.writeFileSync(path.join(photosDir, `${p.assetId}.jpg`), Buffer.from(b64, 'base64'));
  photos.push(rest);
}

// campos internos e de quem registrou nunca vão pro site
const strip = list => (list || []).map(({ source, createdAt, by, stock, pauses, ...rest }) => rest);
const data = walk({
  exportedAt: raw.exportedAt,
  updatedAt: raw.updatedAt || null,
  exams: strip(raw.exams),
  events: strip(raw.events),
  analyses: (raw.analyses || []).map(({ text, createdAt, basedOn, id }) => ({ id, text, createdAt })),
  meds: strip(raw.meds),
  prevent: strip(raw.prevent),
  vitals: strip(raw.vitals),
  foods: strip(raw.foods),
  goals: raw.goals || null,
  photos
});
if (!cfg.manter_clinicas) {
  for (const m of data.meds) delete m.clinic;
  for (const e of data.exams) e.lab = '';
}

// checagem final: nada proibido pode sobrar
const json = JSON.stringify(data, null, 1);
const hits = forbidden.flatMap(re => (json.match(new RegExp(re.source, 'gi')) || []).map(h => h));
if (hits.length) {
  console.error('\nPARADO: sobrou dado pessoal no que seria publicado:', [...new Set(hits)].join(', '));
  console.error('Ajuste config/anonimizacao.json e rode de novo.');
  process.exit(1);
}

fs.mkdirSync(path.join(ROOT, 'docs/data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/data/odin.json'), json);

// site = mesma página do artefato, em modo só leitura
const html = fs.readFileSync(path.join(ROOT, 'artifact/index.html'), 'utf8')
  .replace('<head>', '<head>\n<script>window.ODIN_STATIC = "data/odin.json";</script>\n<meta name="robots" content="noindex">');
fs.writeFileSync(path.join(ROOT, 'docs/index.html'), html);
fs.writeFileSync(path.join(ROOT, 'docs/.nojekyll'), '');

console.log(`OK: ${data.exams.length} exames, ${data.events.length} acontecimentos, ${data.meds.length} remédios, ${data.prevent.length} vacinas/vermífugos, ${data.vitals.length} medições de temperatura, ${photos.length} fotos.`);

if (push) {
  const day = (raw.exportedAt || new Date().toISOString()).slice(0, 10);
  execSync('git add -A docs artifact config scripts', { cwd: ROOT, stdio: 'inherit' });
  try { execSync(`git commit -m "Atualiza dados do cockpit (${day})"`, { cwd: ROOT, stdio: 'inherit' }); }
  catch { console.log('Nada novo pra commitar.'); }
  execSync('git push', { cwd: ROOT, stdio: 'inherit' });
  console.log('Publicado. O GitHub Pages atualiza em 1 a 2 minutos.');
} else {
  console.log('Confira abrindo docs/index.html (npm run ver). Pra publicar: npm run publicar -- --push');
}
