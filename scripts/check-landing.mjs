// Validação só da landing do Munin Pet (landing/): sintaxe dos scripts da página e privacidade.
// Roda no Action "Deploy da landing (Munin Pet)", que publica só o site munin-pesquisa, sem mexer no app.
// Uso: npm run check:landing   (o npm run check completo também confere a landing)
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = new URL('..', import.meta.url).pathname;
const dir = join(root, 'landing');
const tmp = mkdtempSync(join(tmpdir(), 'landing-check-'));
const falhas = [];
const ok = m => console.log('✓ ' + m);
const bad = m => { console.log('✗ ' + m); falhas.push(m); };

// 1. sintaxe dos <script> da página
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const blocos = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
blocos.forEach((codigo, i) => {
  const f = join(tmp, `landing-${i}.js`); writeFileSync(f, codigo);
  const r = spawnSync('node', ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) bad(`sintaxe landing/index.html (script ${i + 1}): ${r.stderr.split('\n').find(l => /Error/.test(l)) || r.stderr.trim()}`);
});
if (!falhas.length) ok(`sintaxe landing/index.html: ${blocos.length} script(s)`);

// 2. a página ainda tem o que não pode sumir
[['/api/pesquisa', 'envio da pesquisa'], ['munin-pesquisa.web.app', 'alarme de clone'], ['id="pesquisa"', 'seção da pesquisa']]
  .forEach(([trecho, nome]) => html.includes(trecho) ? ok(nome + ' presente') : bad(nome + ' sumiu da landing'));

// 3. privacidade: nada de chave, segredo ou CPF nos arquivos de texto da landing
const textos = [];
const andar = d => readdirSync(d).forEach(n => { const p = join(d, n); statSync(p).isDirectory() ? andar(p) : /\.(html|js|css|svg|json|txt)$/.test(n) && textos.push(p); });
andar(dir);
const proibidos = [[/AIza[0-9A-Za-z_-]{30,}/, 'chave do Google'], [/sk-ant-[0-9A-Za-z_-]{10,}/, 'chave da Anthropic'], [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chave privada'], [/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, 'CPF']];
const vazou = [];
textos.forEach(p => { const t = readFileSync(p, 'utf8'); proibidos.forEach(([re, nome]) => re.test(t) && vazou.push(`${nome} em ${p.slice(root.length)}`)); });
vazou.length ? vazou.forEach(bad) : ok(`sem chaves, segredos ou CPF (${textos.length} arquivo(s) de texto)`);

if (falhas.length) { console.error(`\n✗ landing: ${falhas.length} problema(s). Não publique assim.`); process.exit(1); }
console.log('\n✓ landing ok');
