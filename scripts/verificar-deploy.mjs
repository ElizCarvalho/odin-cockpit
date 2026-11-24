// Depois do push: espera os GitHub Actions do último commit e confere se o app (e o site, se mudou) está no ar com essa versão.
// Uso: npm run deploy:verificar            (commit atual)
//      npm run deploy:verificar -- <sha>
import { execFileSync } from 'node:child_process';

const REPO = 'ElizCarvalho/odin-cockpit';
const APP = 'https://odin-cockpit.web.app/';
const SITE = 'https://elizcarvalho.github.io/odin-cockpit/';
const LANDING = 'https://munin-pesquisa.web.app/';
const root = new URL('..', import.meta.url).pathname;
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

const sha = process.argv[2] || git('rev-parse', 'HEAD');
try { git('fetch', '-q', 'origin', 'main'); } catch {}
let pushed = false; try { pushed = git('branch', '-r', '--contains', sha).includes('origin/main'); } catch {}
if (!pushed) { console.error(`✗ o commit ${sha.slice(0, 7)} ainda não está no GitHub (origin/main). Faça o push antes.`); process.exit(1); }

async function api(path) {
  try { return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); } catch {}
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const r = await fetch('https://api.github.com/' + path, { headers: { accept: 'application/vnd.github+json', ...(token ? { authorization: 'Bearer ' + token } : {}) } });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  return r.json();
}

console.log(`Conferindo o commit ${sha.slice(0, 7)}…`);
let runs = [], waited = 0;
while (waited < 15 * 60e3) {
  runs = (await api(`repos/${REPO}/actions/runs?head_sha=${sha}&per_page=20`)).workflow_runs || [];
  const pending = runs.filter(r => r.status !== 'completed');
  if (runs.length && !pending.length) break;
  if (!runs.length && waited > 90e3) break; // commit que não dispara nada
  process.stdout.write(runs.length ? `  aguardando: ${pending.map(r => r.name).join(', ')}\n` : '  aguardando os Actions começarem…\n');
  await sleep(20e3); waited += 20e3;
}

let fail = false;
if (!runs.length) console.log('• nenhum Action rodou pra este commit (não mexeu em app, landing nem docs/).');
for (const r of runs) {
  const good = r.conclusion === 'success';
  console.log(`${good ? '✓' : '✗'} ${r.name}: ${r.conclusion || r.status}${good ? '' : ' → ' + r.html_url}`);
  if (!good) fail = true;
}

const deploy = runs.find(r => r.name.startsWith('Deploy do app'));
if (deploy && deploy.conclusion === 'success') {
  const html = await (await fetch(APP + '?v=' + Date.now(), { cache: 'no-store' })).text();
  const live = (html.match(/<meta name="odin-build" content="([0-9a-f]*)"/) || [])[1] || '';
  if (live === sha) console.log(`✓ app no ar com este commit: ${APP}`);
  else { console.log(`✗ o app no ar está em ${live ? live.slice(0, 7) : '(sem marca de versão)'}, não em ${sha.slice(0, 7)}`); fail = true; }
}
const landing = runs.find(r => r.name.startsWith('Deploy da landing'));
if (landing && landing.conclusion === 'success') {
  const html = await (await fetch(LANDING + '?v=' + Date.now(), { cache: 'no-store' })).text();
  const live = (html.match(/<meta name="munin-build" content="([0-9a-f]*)"/) || [])[1] || '';
  if (live === sha) console.log(`✓ landing no ar com este commit: ${LANDING}`);
  else { console.log(`✗ a landing no ar está em ${live ? live.slice(0, 7) : '(sem marca de versão)'}, não em ${sha.slice(0, 7)}`); fail = true; }
}
const pages = runs.find(r => r.name === 'pages build and deployment');
if (pages && pages.conclusion === 'success') {
  const st = (await fetch(SITE, { cache: 'no-store' })).status;
  st === 200 ? console.log(`✓ site público respondendo: ${SITE}`) : (console.log(`✗ site público respondeu ${st}`), fail = true);
}

// conferência em produção (só leitura): app e site no iPhone/Safari e no computador/Chrome
if (!fail) {
  console.log('\nConferindo produção no iPhone e no computador…');
  try { execFileSync('node', [root + 'scripts/conferir-producao.mjs'], { stdio: 'inherit' }); }
  catch { fail = true; }
}
if (fail) { console.error('\n✗ deploy com problema: veja os links acima.'); process.exit(1); }
console.log('\n✓ tudo no ar');
