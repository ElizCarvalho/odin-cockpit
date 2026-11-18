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

import { SEED, today } from './seed.mjs';
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
    const { page, errs } = await open(width, 'admin@teste.com', '#hoje');
    for (const tab of ['hoje', 'registrar', 'exames', 'linha', 'fotos', 'remedios', 'vacinas', 'lembretes', 'admin']) {
      await page.evaluate(t => go(t), tab); await page.waitForTimeout(350);
      const visible = await page.evaluate(t => !document.getElementById('p-' + t).hidden, tab);
      const ov = await overflow(page);
      check(visible && ov <= 1, `${width}px · ${tab} abre sem estourar a largura${ov > 1 ? ` (+${ov}px)` : ''}`);
    }
    const nav = await page.evaluate(() => ({ secs: [...document.querySelectorAll('.tabs .tab')].filter(b => b.offsetParent).map(b => b.dataset.sec), pos: getComputedStyle(document.querySelector('.tabs')).position, bottom: Math.round(innerHeight - document.querySelector('.tabs').getBoundingClientRect().bottom), h: Math.round(document.querySelector('.tabs').getBoundingClientRect().height) }));
    check(nav.secs.join() === 'hoje,registrar,evolucao,historico,mais', `${width}px · menu com as 5 seções (Hoje, Registrar, Evolução, Histórico, Mais)`);
    if (width === 390) check(nav.pos === 'fixed' && nav.bottom <= 1 && nav.h <= 80, `390px · menu é uma barra embaixo, baixa (${nav.h}px)`);
    else check(nav.pos === 'sticky', '1440px · menu fica em cima');
    await page.evaluate(() => go('mais')); await page.waitForTimeout(200);
    check(await page.evaluate(() => [...document.querySelectorAll('#subtabs [data-go]')].map(b => b.dataset.go).join()) === 'remedios,vacinas,lembretes,admin', `${width}px · Mais mostra Medicamentos, Vacinas, Lembretes e Admin pro admin`);
    await page.evaluate(() => go('rotina')); await page.waitForTimeout(200);
    check(await page.evaluate(() => !document.getElementById('p-hoje').hidden), `${width}px · link antigo #rotina (do push) cai em Hoje`);
    if (width === 390) check(await page.evaluate(() => /Comprar logo/.test(document.getElementById('p-hoje').textContent)), 'Hoje · avisa remédio que precisa comprar');
    check(await page.evaluate(() => !/Publicar no site/.test(document.body.textContent)), `${width}px · sem o card antigo de publicar no site`);
    check(await page.evaluate(() => /Água hoje/.test(document.getElementById('tiles').textContent) && /Calorias hoje/.test(document.getElementById('tiles').textContent)), `${width}px · Painel mostra água e calorias de hoje`);
    if (width === 1440) {
      await page.evaluate(() => go('admin')); await page.waitForTimeout(300);
      await page.fill('#aGoals [name=water]', '900'); await page.fill('#aGoals [name=kcal]', '1000'); await page.click('#aGoals [type=submit]'); await page.waitForTimeout(600);
      check(await page.evaluate(() => JSON.stringify([__store.meta.goals.water_ml, __store.meta.goals.kcal])) === '[900,1000]', 'Admin · salva metas de água e calorias');
      await page.uncheck('#aNotif [name=compra]'); await page.check('#aNotif [name=decubito_on]'); await page.check('#aNotif [name=agua_on]');
      await page.selectOption('#aNotif [name=agua_every]', '120'); await page.click('#aNotif [type=submit]'); await page.waitForTimeout(800);
      const nc = await page.evaluate(() => ({ c: __store.meta.notificacoes, d: __store.schedule.decubito, a: __store.schedule.agua }));
      check(nc.c && nc.c.compra === false && nc.c.med === true && nc.d.active && nc.d.every === 240 && nc.d.kind === 'decubito' && nc.a.every === 120 && nc.a.from === '08:00', 'Admin · notificações: liga decúbito (4 h) e água (2 h), desliga compras');
      await page.evaluate(() => window.ODIN_UPD_CHECK()); await page.waitForTimeout(300);
      check(!(await page.locator('#odinUpd').count()), 'Versão · sem faixa quando o app está atualizado');
      await page.route('**/index.html?b=*', r => r.fulfill({ contentType: 'text/html', body: '<meta name="odin-build" content="abc123">' }));
      await page.evaluate(() => window.ODIN_UPD_CHECK()); await page.waitForTimeout(300);
      check(await page.locator('#odinUpd').isVisible(), 'Versão · faixa "Nova versão disponível" quando sai build novo');
      await page.unroute('**/index.html?b=*'); await page.evaluate(() => document.getElementById('odinUpd')?.remove());
    }
    check(errs.length === 0, `${width}px · sem erro de JavaScript${errs.length ? ': ' + errs[0] : ''}`);
    await page.close();
  }

  // calendário (visão da Linha do tempo)
  for (const width of [390, 1440]) {
    const { page, errs } = await open(width, 'admin@teste.com', '#linha');
    check(await page.evaluate(() => [...document.querySelectorAll('#subtabs [data-go]')].map(b => b.dataset.go).join()) === 'linha,fotos', `${width}px · Histórico tem Linha do tempo e Fotos`);
    await page.click('#tlView [data-view=cal]'); await page.waitForTimeout(300);
    const modes = width === 390 ? ['dia'] : ['mes', 'sem', 'dia'];
    if (width === 390) check(!(await page.locator('#calMode').isVisible()) && await page.evaluate(() => calMode) === 'dia', '390px · no celular o calendário fica só na visão Dia');
    for (const mode of modes) {
      if (width !== 390) { await page.click(`[data-cmode=${mode}]`); await page.waitForTimeout(250); }
      const ov = await overflow(page);
      check(ov <= 1, `${width}px · calendário ${mode} sem estourar a largura${ov > 1 ? ` (+${ov}px)` : ''}`);
      const esc = await page.evaluate(() => [...document.querySelectorAll('#calBody *')].filter(e => getComputedStyle(e).position === 'absolute' || getComputedStyle(e).position === 'fixed').length);
      check(esc === 0, `${width}px · calendário ${mode} sem nada solto por cima da tela`);
    }
    check(await page.locator('#calBody .hgrid .gev').count() > 0, `${width}px · calendário dia mostra o que aconteceu hoje na grade de horas`);
    check(await page.evaluate(() => [...document.querySelectorAll('#calBody .gev')].every(g => g.scrollWidth <= g.clientWidth + 1)), `${width}px · texto da visão Dia não fica cortado`);
    await page.click('#calBody .gev[data-ci]'); await page.waitForTimeout(200);
    check(await page.locator('.modal .mbox').isVisible(), `${width}px · tocar num registro abre os detalhes`);
    await page.click('.modal [data-close]'); await page.waitForTimeout(150);
    check(await page.locator('.modal').count() === 0, `${width}px · detalhes fecham no ✕`);
    if (width === 1440) {
      await page.click('[data-cmode=sem]'); await page.waitForTimeout(200);
      check(await page.locator('#calBody .hgrid thead th[data-cday]').count() === 7, `${width}px · 7 dias em colunas com horas`);
      await page.click('#calBody .hgrid thead th.is-today'); await page.waitForTimeout(200);
      check(await page.evaluate(() => calMode) === 'dia', `${width}px · tocar no dia da semana abre o dia`);
      await page.click('[data-cmode=mes]'); await page.waitForTimeout(200); await page.click('[data-cmode=sem]', { timeout: 2000 }); await page.click('[data-cmode=mes]', { timeout: 2000 }); await page.click('.calgrid .cd.is-today'); await page.waitForTimeout(200);
      check(await page.evaluate(() => calMode) === 'dia', 'Calendário · tocar no dia do mês abre o dia');
    }
    if (width === 390) {
      await page.click('#cal [data-reg=consulta]'); await page.waitForTimeout(300);
      check(await page.evaluate(() => activeTab === 'registrar' && !document.querySelector('[data-regbox=consulta]').classList.contains('hidden')), 'Calendário · + Agendar abre o formulário em Registrar');
      await page.fill('#calAdd [name=what]', 'neuro'); await page.fill('#calAdd [name=time]', '15:00');
      await page.click('#calAdd [type=submit]'); await page.waitForTimeout(800);
      const ap = await page.evaluate(() => Object.values(__store.events).filter(e => e.kind === 'consulta').map(e => e.text + '|' + e.remind));
      check(ap.length === 1 && ap[0] === 'Consulta: neuro|1440', 'Calendário · agendar consulta com lembrete');
      await page.evaluate(() => go('linha')); await page.waitForTimeout(300);
      await page.click('[data-ccat="Consulta"]'); await page.waitForTimeout(200);
      const ft = await page.evaluate(() => [...document.querySelectorAll('#calBody .gev')].map(x => x.title));
      check(ft.length > 0 && ft.every(t => /Consulta/.test(t)), 'Calendário · filtro por tipo');
    }
    check(errs.length === 0, `${width}px · calendário sem erro de JavaScript${errs.length ? ': ' + errs[0] : ''}`);
    await page.close();
  }

  // pausar e retomar um remédio
  {
    const { page, errs } = await open(390, 'admin@teste.com', '#remedios');
    page.on('dialog', d => { console.log('✗ caixa de diálogo aberta: ' + d.message()); d.dismiss(); });
    check(await page.evaluate(() => !document.getElementById('medPastBox').open), 'Remédios · "Já usou" vem recolhido');
    const ic = await page.evaluate(() => [...document.querySelectorAll('#medActive .mrow')].map(r => !!r.querySelector('.mic svg')));
    check(ic.length > 0 && ic.every(Boolean), 'Remédios · cada item tem ícone de forma e cor de tipo');
    await page.evaluate(() => document.querySelector('#medActive details').open = true);
    await page.click('#medActive [data-mpause]'); await page.waitForTimeout(200);
    await page.click('#medActive [data-mpausego]'); await page.waitForTimeout(800);
    const p1 = await page.evaluate(() => ({ m: __store.meds.m1, card: !document.getElementById('medPausedCard').classList.contains('hidden'), n: document.querySelectorAll('#medPaused .mrow').length }));
    check(p1.m.paused === true && p1.m.pauseReason === 'aguardando a neuro' && p1.card && p1.n === 1, 'Pausar · remédio vai pra Pausados com o motivo');
    const g = await page.evaluate(() => ({ sep: [...document.querySelectorAll('#medGantt .gsep')].map(x => x.textContent), pz: document.querySelectorAll('#medGantt .bar.pz').length }));
    check(g.pz === 1 && g.sep.includes('pausados'), 'Pausar · linha do tempo mostra o pausado separado e listrado');
    await page.evaluate(() => document.querySelector('#medPaused details').open = true);
    await page.click('#medPaused [data-mresume]'); await page.waitForTimeout(800);
    const p2 = await page.evaluate(() => ({ m: __store.meds.m1, card: document.getElementById('medPausedCard').classList.contains('hidden') }));
    check(p2.m.paused === false && (p2.m.pauses || []).length === 1 && p2.card, 'Retomar · volta pra Em uso e guarda o histórico da pausa');
    await page.evaluate(() => go('fotos')); await page.waitForTimeout(500);
    await page.waitForTimeout(200);
    await page.click('[data-ptime]'); await page.fill('#photoGrid input[type=time]', '14:30'); await page.click('[data-ptsave]'); await page.waitForTimeout(800);
    check(await page.evaluate(() => __store.photos.p1.time) === '14:30', 'Fotos · pôr hora numa foto existente');
    check(errs.length === 0, `Pausar · sem erro de JavaScript${errs.length ? ': ' + errs[0] : ''}`);
    await page.close();
  }

  // quem edita: responde um lembrete de água e pula o remédio
  {
    const { page, errs } = await open(390, 'edita@teste.com', '#rotina');
    check(await page.evaluate(() => document.querySelector('.tab[data-sec=hoje] .badge')?.textContent) === '4', 'Hoje · bolinha com 4 pendentes no menu');
    const n = `#rn-s2_${today}_1000`;
    await page.fill(`${n} [name=v]`, '150'); await page.selectOption(`${n} [name=fid]`, 'coco');
    await page.click(`${n} [type=submit]`); await page.waitForTimeout(800);
    await page.click(`#rn-s1_${today}_0900 [data-skip]`); await page.waitForTimeout(800);
    const st = await page.evaluate(() => ({ notifs: Object.values(__store.notifs).map(n => n.status), v: Object.values(__store.vitals).filter(v => v.source === 'rotina') }));
    check(st.v.length === 1 && st.v[0].water_ml === 150 && /coco/.test(st.v[0].note), 'Edita · resposta de água vira registro (150 mL, água de coco)');
    check(st.notifs.includes('done') && st.notifs.includes('skipped'), 'Edita · lembretes marcados como feito e pulado');
    const hoje = await page.evaluate(() => Math.round(dayTotals(todayIso()).water));
    check(hoje === 143, `Água · água de coco conta 95% como água (150 mL → ${hoje} mL)`);
    await page.click('.tab[data-sec=registrar]'); await page.waitForTimeout(300);
    await page.click('#regGrid [data-free=comida]'); await page.waitForTimeout(300);
    await page.selectOption('#regFree [name=fid]', 'biscrok'); await page.fill('#regFree [name=v]', '2'); await page.click('#regFree [type=submit]'); await page.waitForTimeout(800);
    const bis = await page.evaluate(() => { const v = Object.values(__store.vitals).find(x => x.foodId === 'biscrok'); return v && { g: v.food_g, qty: v.qty, kcal: Math.round(nutri(v).kcal) }; });
    check(bis && bis.qty === 2 && bis.g === 20 && bis.kcal === 68, 'Comida · por unidade vira gramas e calorias (2 Biscrok → 20 g, 68 kcal)');
    await page.click('#regGrid [data-free=med]'); await page.waitForTimeout(300);
    await page.check('#regFree [name=it][value="0"]'); await page.click('#regFree [type=submit]'); await page.waitForTimeout(800);
    const avulso = await page.evaluate(() => Object.values(__store.rotina_log || {}).filter(l => l.block === 'Fora de hora').map(l => l.status + ':' + l.label));
    check(avulso.length === 1 && /^done:/.test(avulso[0]), 'Registrar · remédio dado fora de hora grava só o que foi marcado');
    await page.click('#regGrid [data-reg=peso]'); await page.waitForTimeout(200);
    await page.fill('#regPeso [data-w=kg]', '19.4'); await page.click('[data-wsave2]'); await page.waitForTimeout(800);
    check(await page.evaluate(() => Object.values(__store.exams).some(e => e.params && e.params.peso === 19.4)), 'Registrar · peso vira pesagem');
    await page.evaluate(() => go('mais')); await page.waitForTimeout(200);
    check(await page.evaluate(() => ![...document.querySelectorAll('#subtabs [data-go]')].some(b => b.dataset.go === 'admin')), 'Edita · não vê Admin em Mais');
    await page.evaluate(() => go('hoje')); await page.waitForTimeout(300);
    check(await page.evaluate(() => !!document.querySelector('#hojeAgora .mic svg')), 'Hoje · remédio aparece com o ícone de forma/tipo');
    const blk = `#rn-s3_${today}_0930`;
    check(await page.locator(`${blk} [name=it]`).count() === 2, 'Rotina · bloco mostra a lista de remédios pra marcar');
    await page.uncheck(`${blk} [name=it][value="1"]`); await page.click(`${blk} [type=submit]`); await page.waitForTimeout(800);
    const bl = await page.evaluate(() => ({ st: Object.entries(__store.notifs).find(([k]) => k.startsWith('s3_'))[1].status, logs: Object.values(__store.rotina_log || {}).filter(l => l.block === 'Manhã').map(l => l.status).sort() }));
    check(bl.st === 'partial' && bl.logs.join() === 'done,skipped', 'Rotina · bloco grava um registro por remédio (dado/pulado)');
    const sk = await page.evaluate(() => Object.entries(__store.rotina_log).find(([, l]) => l.block === 'Manhã' && l.status === 'skipped')[0]);
    await page.click(`[data-late="${sk}"]`); await page.fill('.rLate [name=lt]', '11:28'); await page.click(`[data-latego="${sk}"]`); await page.waitForTimeout(800);
    const lt = await page.evaluate(id => __store.rotina_log[id], sk);
    check(lt.status === 'done' && lt.time === '11:28' && /atraso/.test(lt.note), 'Rotina · "Dei depois" vira dado no horário informado');
    await page.click('.tab[data-sec=registrar]'); await page.click('#regGrid [data-free=fezes]'); await page.waitForTimeout(300);
    await page.selectOption('#regFree [name=cons]', 'pastosa'); await page.click('#regFree [type=submit]'); await page.waitForTimeout(800);
    await page.click('#regGrid [data-free=urina]'); await page.waitForTimeout(300);
    await page.selectOption('#regFree [name=como]', 'com escape'); await page.click('#regFree [type=submit]'); await page.waitForTimeout(800);
    const fx = await page.evaluate(() => Object.values(__store.events).filter(e => ['fezes', 'urina'].includes(e.kind)).map(e => e.text));
    check(fx.some(t => /Fezes pastosa/.test(t)) && fx.some(t => /Xixi com escape/.test(t)), 'Rotina · fezes e xixi viram acontecimento');
    check(errs.length === 0, `Edita · sem erro de JavaScript${errs.length ? ': ' + errs[0] : ''}`);
    await page.close();
  }

  // só vê: nada de formulário, nada de escrita
  {
    const { page, errs } = await open(390, 've@teste.com', '#rotina');
    check(await page.evaluate(() => canWrite === false), 'Só vê · cockpit em modo leitura');
    check(await page.locator('#hojeAgora .rN form').count() === 0, 'Só vê · lembretes sem formulário de resposta');
    check(await page.evaluate(() => !document.querySelector('.tab[data-sec=registrar]').offsetParent), 'Só vê · sem o botão Registrar');
    await page.evaluate(() => go('registrar')); await page.waitForTimeout(200);
    check(await page.evaluate(() => activeTab === 'hoje'), 'Só vê · #registrar cai em Hoje');
    await page.evaluate(() => go('mais')); await page.waitForTimeout(200);
    check(await page.evaluate(() => ![...document.querySelectorAll('#subtabs [data-go]')].some(b => b.dataset.go === 'admin')), 'Só vê · não vê Admin');
    check(errs.length === 0, `Só vê · sem erro de JavaScript${errs.length ? ': ' + errs[0] : ''}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (fails.length) { console.error(`\n✗ smoke: ${fails.length} problema(s)`); process.exit(1); }
console.log('\n✓ smoke ok');
