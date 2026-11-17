// Teste de fumaça do app: abre o app montado (app/public) com um Firebase falso e dados de teste,
// em 390 px (celular) e 1440 px (desktop), e confere que nada quebra.
// Uso: npm run smoke   (precisa de: npm install && npx playwright install chromium)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('✗ playwright não instalado. Rode: npm install && npx playwright install chromium'); process.exit(2); }

const root = new URL('..', import.meta.url).pathname;
const pub = join(root, 'app/public');
if (!existsSync(join(pub, 'index.html'))) { console.error('✗ app não montado. Rode: npm run app:build'); process.exit(2); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = join(pub, p === '/' ? 'index.html' : p);
  if (!f.startsWith(pub) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const SEED = {
  acl: { users: { emails: ['admin@teste.com', 'edita@teste.com', 've@teste.com'], roles: { 'admin@teste.com': 'admin', 'edita@teste.com': 'edit', 've@teste.com': 'view' }, notify: {} } },
  exams: { e1: { date: today, kind: 'Hemograma', lab: 'Lab teste', params: { hb: 9.1, ht: 27 }, other: [], createdAt: 1 } },
  events: { v1: { date: today, time: '08:10', text: 'Evento de teste', mark: false } },
  meds: { m0: { name: 'Remédio antigo', start: '2026-01-01', end: '2026-01-10' }, m1: { name: 'Remédio teste', start: today, dose: '1 comp.' }, m2: { name: 'Outro em uso', start: '2026-01-05', dose: '1 comp.' } },
  vitals: { t1: { date: today, time: '07:00', temp: 38.4 } },
  schedule: { s1: { kind: 'med', label: 'Remédio teste', times: ['09:00'], active: true }, s2: { kind: 'agua', label: 'Água', every: 120, from: '08:00', to: '22:00', active: true } },
  notifs: {
    [`s1_${today}_0900`]: { schedId: 's1', kind: 'med', label: 'Remédio teste', date: today, time: '09:00', status: 'pending', sentAt: 1 },
    [`s2_${today}_1000`]: { schedId: 's2', kind: 'agua', label: 'Água', date: today, time: '10:00', status: 'pending', sentAt: 1 }
  }
};
const fake = readFileSync(join(root, 'tests/fakefb.js'), 'utf8');

const fails = [];
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) fails.push(msg); };

const browser = await chromium.launch();
async function open(width, email, hash) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.route('**/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.addInitScript(`window.ODIN_SEED = ${JSON.stringify(SEED)};\n${fake}`);
  await page.goto(`${base}/?as=${encodeURIComponent(email)}${hash}`);
  await page.waitForTimeout(1500);
  return { page, errs };
}
const overflow = page => page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);

try {
  for (const width of [390, 1440]) {
    const { page, errs } = await open(width, 'admin@teste.com', '#painel');
    for (const tab of ['painel', 'rotina', 'exames', 'remedios', 'vacinas', 'fotos', 'linha', 'admin']) {
      await page.evaluate(t => go(t), tab); await page.waitForTimeout(350);
      const visible = await page.evaluate(t => !document.getElementById('p-' + t).hidden, tab);
      const ov = await overflow(page);
      check(visible && ov <= 1, `${width}px · aba ${tab} abre sem estourar a largura${ov > 1 ? ` (+${ov}px)` : ''}`);
    }
    check(!(await page.evaluate(() => document.querySelector('.tab[data-tab=admin]').hidden)), `${width}px · admin vê a aba Admin`);
    check(errs.length === 0, `${width}px · sem erro de JavaScript${errs.length ? ': ' + errs[0] : ''}`);
    await page.close();
  }

  // pausar e retomar um remédio
  {
    const { page, errs } = await open(390, 'admin@teste.com', '#remedios');
    page.on('dialog', d => d.accept('aguardando a neuro'));
    const ic = await page.evaluate(() => [...document.querySelectorAll('#medActive .mrow')].map(r => !!r.querySelector('.mic svg')));
    check(ic.length > 0 && ic.every(Boolean), 'Remédios · cada item tem ícone de forma e cor de tipo');
    await page.evaluate(() => document.querySelector('#medActive details').open = true);
    await page.click('#medActive [data-mpause]'); await page.waitForTimeout(800);
    const p1 = await page.evaluate(() => ({ m: __store.meds.m1, card: !document.getElementById('medPausedCard').classList.contains('hidden'), n: document.querySelectorAll('#medPaused .mrow').length }));
    check(p1.m.paused === true && p1.m.pauseReason === 'aguardando a neuro' && p1.card && p1.n === 1, 'Pausar · remédio vai pra Pausados com o motivo');
    const g = await page.evaluate(() => ({ sep: [...document.querySelectorAll('#medGantt .gsep')].map(x => x.textContent), pz: document.querySelectorAll('#medGantt .bar.pz').length }));
    check(g.pz === 1 && g.sep.includes('pausados'), 'Pausar · linha do tempo mostra o pausado separado e listrado');
    await page.evaluate(() => document.querySelector('#medPaused details').open = true);
    await page.click('#medPaused [data-mresume]'); await page.waitForTimeout(800);
    const p2 = await page.evaluate(() => ({ m: __store.meds.m1, card: document.getElementById('medPausedCard').classList.contains('hidden') }));
    check(p2.m.paused === false && (p2.m.pauses || []).length === 1 && p2.card, 'Retomar · volta pra Em uso e guarda o histórico da pausa');
    check(errs.length === 0, `Pausar · sem erro de JavaScript${errs.length ? ': ' + errs[0] : ''}`);
    await page.close();
  }

  // quem edita: responde um lembrete de água e pula o remédio
  {
    const { page, errs } = await open(390, 'edita@teste.com', '#rotina');
    const n = `#rn-s2_${today}_1000`;
    await page.fill(`${n} [name=v]`, '150'); await page.check(`${n} [name=coco]`);
    await page.click(`${n} [type=submit]`); await page.waitForTimeout(800);
    await page.click('[data-skip]'); await page.waitForTimeout(800);
    const st = await page.evaluate(() => ({ notifs: Object.values(__store.notifs).map(n => n.status), v: Object.values(__store.vitals).filter(v => v.source === 'rotina') }));
    check(st.v.length === 1 && st.v[0].water_ml === 150 && /coco/.test(st.v[0].note), 'Edita · resposta de água vira registro (150 mL, água de coco)');
    check(st.notifs.includes('done') && st.notifs.includes('skipped'), 'Edita · lembretes marcados como feito e pulado');
    check(await page.evaluate(() => document.querySelector('.tab[data-tab=admin]').hidden), 'Edita · não vê a aba Admin');
    check(errs.length === 0, `Edita · sem erro de JavaScript${errs.length ? ': ' + errs[0] : ''}`);
    await page.close();
  }

  // só vê: nada de formulário, nada de escrita
  {
    const { page, errs } = await open(390, 've@teste.com', '#rotina');
    check(await page.evaluate(() => canWrite === false), 'Só vê · cockpit em modo leitura');
    check(await page.locator('#p-rotina .rN form').count() === 0, 'Só vê · lembretes sem formulário de resposta');
    check(await page.evaluate(() => document.querySelector('.tab[data-tab=admin]').hidden), 'Só vê · não vê a aba Admin');
    check(errs.length === 0, `Só vê · sem erro de JavaScript${errs.length ? ': ' + errs[0] : ''}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (fails.length) { console.error(`\n✗ smoke: ${fails.length} problema(s)`); process.exit(1); }
console.log('\n✓ smoke ok');
