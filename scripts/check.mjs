// Validação antes de commitar: monta o app, confere sintaxe, JSON, funções, privacidade e (se der) roda o smoke.
// Uso: npm run check            (tudo)
//      npm run check -- --rapido (pula o smoke e os cenários)
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = new URL('..', import.meta.url).pathname;
const r = p => join(root, p);
const fails = [];
const ok = msg => console.log('✓ ' + msg);
const bad = msg => { console.log('✗ ' + msg); fails.push(msg); };
const tmp = mkdtempSync(join(tmpdir(), 'odin-check-'));

// 1. monta o app
try { execFileSync('node', [r('scripts/build-app.mjs')], { stdio: 'pipe' }); ok('app montado (app/public)'); }
catch (e) { bad('build do app: ' + String(e.stderr || e.message).trim().split('\n').pop()); }

// 2. sintaxe de todo JS
const syntax = (label, file) => {
  const res = spawnSync('node', ['--check', file], { encoding: 'utf8' });
  if (res.status !== 0) bad(`sintaxe ${label}: ${res.stderr.split('\n').find(l => /Error/.test(l)) || res.stderr.trim()}`);
  return res.status === 0;
};
const inline = (label, file) => {
  const html = readFileSync(file, 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  let good = true;
  blocks.forEach((code, i) => { const f = join(tmp, `inline-${label.replace(/\W/g, '_')}-${i}.js`); writeFileSync(f, code); good = syntax(`${label} (script ${i + 1})`, f) && good; });
  if (good) ok(`sintaxe ${label}: ${blocks.length} script(s)`);
};
inline('artifact/index.html', r('artifact/index.html'));
try { inline('app/public/index.html', r('app/public/index.html')); } catch {}
const jsFiles = [
  ...readdirSync(r('app/src')).filter(f => f.endsWith('.js')).map(f => 'app/src/' + f),
  ...readdirSync(r('app/static')).filter(f => f.endsWith('.js')).map(f => 'app/static/' + f),
  ...readdirSync(r('scripts')).filter(f => /\.m?js$/.test(f)).map(f => 'scripts/' + f),
  ...readdirSync(r('tests')).filter(f => /\.m?js$/.test(f)).map(f => 'tests/' + f),
  'functions/index.js', 'app/firebase-config.js'
];
if (jsFiles.every(f => syntax(f, r(f)))) ok(`sintaxe de ${jsFiles.length} arquivos JS`);

// 3. JSON válido
const jsonFiles = ['firebase.json', 'firestore.indexes.json', 'app/static/manifest.webmanifest', 'config/anonimizacao.json', 'package.json', 'functions/package.json'];
let jsonOk = true;
for (const f of jsonFiles) { try { JSON.parse(readFileSync(r(f), 'utf8')); } catch (e) { jsonOk = false; bad(`JSON inválido em ${f}: ${e.message}`); } }
if (jsonOk) ok(`JSON válido (${jsonFiles.length} arquivos)`);

// 4. funções: carregam e a regra de horário bate
try {
  const out = execFileSync('node', ['--input-type=module', '-e', `
    const m = await import(${JSON.stringify(r('functions/index.js'))});
    const s = { active: true, every: 120, from: '08:00', to: '22:00' };
    const t = [m.isDue(s, '2026-01-01', '10:00'), m.isDue(s, '2026-01-01', '10:30'), m.isDue({ active: true, times: ['09:00'] }, '2026-01-01', '09:00'),
      m.isDue({ active: false, times: ['09:00'] }, '2026-01-01', '09:00'), m.isDue({ active: true, times: ['09:00'], until: '2025-12-31' }, '2026-01-01', '09:00')];
    const N = 1e9, P = [m.devePublicar({ dirtyAt: N - 4 * 60e3 }, N), m.devePublicar({ dirtyAt: N - 60e3 }, N), m.devePublicar({ dirtyAt: N - 4 * 60e3, sentAt: N - 5 * 60e3 }, N),
      m.devePublicar({ dirtyAt: N - 20 * 60e3, sentAt: N - 30 * 60e3 }, N), m.devePublicar({ dirtyAt: N - 30 * 60e3, sentAt: N - 20 * 60e3 }, N), m.isPublicDoc('vitals', 'x'), m.isPublicDoc('rotina_log', 'x'), m.isPublicDoc('meta', 'publico')];
    const L = [m.proximoLado([]), m.proximoLado(['lado esquerdo']), m.proximoLado(['esfinge', 'lado esquerdo']), m.proximoLado(['esternal (de bruços)', 'lado direito', 'esfinge']),
      m.aguaDoDia([{ water_ml: 100 }, { water_ml: 100, drinkId: 'coco' }, { food_g: 100, foodId: 'pate' }, { food_g: 50, note: 'ração' }], [{ id: 'agua', kind: 'bebida', water: 1 }, { id: 'coco', kind: 'bebida', water: 0.95 }, { id: 'pate', kind: 'comida', water: 0.8 }, { id: 'racao', kind: 'comida', water: 0.1, match: 'ra[çc][ãa]o' }])];
    console.log(JSON.stringify(t) + JSON.stringify(P) + JSON.stringify(L));`], { encoding: 'utf8', cwd: r('functions'), stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n').pop();
  out === '[true,false,true,false,false][true,false,false,true,false,true,false,false]["lado esquerdo","esternal (de bruços)","lado direito","lado esquerdo",280]' ? ok('functions carregam; isDue, site público, próximo decúbito e água do dia conferem') : bad('isDue/devePublicar deu ' + out);
} catch (e) {
  const msg = String(e.stderr || e.message);
  /Cannot find (package|module) 'firebase-/.test(msg) ? console.log('• functions: pulei (rode npm ci --prefix functions pra testar)') : bad('functions: ' + msg.trim().split('\n').slice(-1)[0]);
}

// 5. privacidade e segredos nos arquivos versionados
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const exp = tracked.filter(f => /^exports\/|odin-export-.*\.json$/.test(f));
exp.length ? bad('export bruto versionado: ' + exp.join(', ')) : ok('nenhum export bruto no git');
const PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chave privada'],
  [/"private_key"\s*:/, 'chave de conta de serviço'],
  [/sk-ant-[A-Za-z0-9_-]{10,}/, 'chave da Anthropic'],
  [/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, 'CPF']
];
const leaks = [];
for (const f of tracked) {
  if (/\.(png|jpe?g|gif|webp|mp4|mov|ico|lock)$/i.test(f) || f.endsWith('package-lock.json') || f === 'scripts/check.mjs') continue;
  let txt; try { txt = readFileSync(r(f), 'utf8'); } catch { continue; }
  for (const [re, what] of PATTERNS) if (re.test(txt)) leaks.push(`${what} em ${f}`);
}
leaks.length ? leaks.forEach(l => bad(l)) : ok('sem chaves, segredos ou CPF nos arquivos versionados');

// 6. smoke (navegador)
if (process.argv.includes('--rapido')) console.log('• smoke: pulado (--rapido)');
else {
  const res = spawnSync('node', [r('tests/smoke.mjs')], { encoding: 'utf8' });
  if (res.status === 2) console.log('• smoke: pulado — ' + (res.stderr.trim() || 'sem playwright'));
  else if (res.status === 0) ok('smoke no navegador (390 e 1440 px, papéis admin/edita/só vê)');
  else { process.stdout.write(res.stdout.split('\n').filter(l => l.startsWith('✗')).map(l => '   ' + l).join('\n') + '\n'); bad('smoke falhou'); }
}

// 7. cenários de comportamento (Gherkin em português, features/*.feature), no Chrome e no Safari simulando iPhone
if (process.argv.includes('--rapido')) console.log('• cenários: pulados (--rapido)');
else for (const [nav, nome] of [['chromium', 'Chrome'], ['webkit', 'Safari/iPhone']]) {
  const res = spawnSync('npx', ['cucumber-js', '--format', 'summary'], { encoding: 'utf8', cwd: r('.'), env: { ...process.env, NAVEGADOR: nav } });
  const resumo = (res.stdout.match(/(\d+) scenarios? \(([^)]*)\)/) || [])[0] || '';
  if (res.status === 0) ok(`cenários Gherkin no ${nome}: ` + resumo.replace('scenarios', 'cenários').replace('passed', 'ok'));
  else { process.stdout.write((res.stdout + res.stderr).split('\n').filter(l => /✖|Error|scenarios/.test(l)).slice(0, 20).map(l => '   ' + l).join('\n') + '\n'); bad(`cenários Gherkin falharam no ${nome} (NAVEGADOR=${nav} npm run bdd pra ver o detalhe)`); }
}

if (fails.length) { console.error(`\n✗ check: ${fails.length} problema(s). Não commite assim.`); process.exit(1); }
console.log('\n✓ check ok — pode commitar');
