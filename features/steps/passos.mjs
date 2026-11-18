// Passos dos cenários (Gherkin em português). Cada frase vira ação ou conferência no app de verdade,
// rodando no Chromium com o Firebase falso (window.__store guarda o que foi gravado).
import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { PAPEL, TELA } from '../support/mundo.mjs';
import { today } from '../../tests/seed.mjs';

const SECAO = { Hoje: 'hoje', Registrar: 'registrar', 'Evolução': 'evolucao', 'Histórico': 'historico', Mais: 'mais' };
const visivel = sel => `${sel} >> visible=true`;

/* ---------- Quem e onde ---------- */
Given('que sou quem edita no {word}', function (tela) { this.email = PAPEL['quem edita']; this.largura = TELA[tela]; });
Given('que sou quem só vê no {word}', function (tela) { this.email = PAPEL['quem só vê']; this.largura = TELA[tela]; });
Given('que sou admin no {word}', function (tela) { this.email = PAPEL.admin; this.largura = TELA[tela]; });

When(/^(?:que )?abro o app$/, async function () { await this.abrir({ largura: this.largura, email: this.email }); });
When(/^(?:que )?abro o app em "([^"]+)"$/, async function (parte) { await this.abrir({ largura: this.largura, email: this.email, hash: '#' + parte }); });
When('vou para {string}', async function (secao) { await this.page.click(`.tabs .tab[data-sec="${SECAO[secao]}"]`); await this.espera(300); });

/* ---------- Navegação ---------- */
Then('vejo as seções {string} no menu', async function (lista) {
  const nomes = await this.page.$$eval('.tabs .tab', bs => bs.filter(b => b.offsetParent).map(b => b.querySelector('.tn').textContent.trim()));
  assert.deepEqual(nomes, lista.split(', '));
});
Then('o menu fica preso embaixo da tela, com no máximo {int} px de altura', async function (max) {
  const m = await this.page.evaluate(() => { const r = document.querySelector('.tabs').getBoundingClientRect(); return { pos: getComputedStyle(document.querySelector('.tabs')).position, fundo: innerHeight - r.bottom, h: r.height }; });
  assert.equal(m.pos, 'fixed'); assert.ok(m.fundo <= 1, 'não está colado embaixo'); assert.ok(m.h <= max, `altura ${m.h}px`);
});
Then('o menu fica em cima da página', async function () {
  assert.equal(await this.page.evaluate(() => getComputedStyle(document.querySelector('.tabs')).position), 'sticky');
});
Then('a parte {string} aparece', async function (parte) {
  assert.equal(await this.page.evaluate(p => !document.getElementById('p-' + p).hidden, parte), true, `a parte ${parte} não está à mostra`);
});
Then('nada passa da largura da tela', async function () {
  const sobra = await this.page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
  assert.ok(sobra <= 1, `passou ${sobra}px`);
  assert.deepEqual(this.erros, []);
});
Then('vejo as partes {string}', async function (lista) {
  assert.deepEqual(await this.page.$$eval('#subtabs [data-go]', bs => bs.map(b => b.textContent.trim())), lista.split(', '));
});
Then('o menu mostra {int} pendentes em Hoje', async function (n) {
  assert.equal(await this.page.textContent('.tab[data-sec=hoje] .badge'), String(n));
});
Then('não aparece o texto {string} em lugar nenhum', async function (t) {
  assert.equal(await this.page.evaluate(x => document.body.textContent.includes(x), t), false);
});

/* ---------- Registrar ---------- */
When('toco em {string}', async function (nome) { await this.page.click(`#regGrid .regb:has(span:text-is("${nome}"))`); await this.espera(300); });
const formAberto = '#regFree form.rForm';
When('escolho {string} em {string}', async function (opcao, rotulo) {
  const sel = this.page.locator(visivel(`${formAberto} label:has-text("${rotulo}") select`));
  const valor = await sel.evaluate((s, o) => [...s.options].find(x => x.text.trim() === o || x.text.trim().startsWith(o + ' ('))?.value, opcao);
  assert.ok(valor != null, `não achei "${opcao}" em "${rotulo}"`);
  await sel.selectOption(valor);
});
When('preencho {string} com {string}', async function (rotulo, valor) { await this.page.locator(visivel(`${formAberto} label:has-text("${rotulo}") input`)).fill(valor); });
When('marco {string}', async function (nome) { await this.page.locator(`${formAberto} label.chk:has-text("${nome}") input`).check(); });
When('salvo', async function () { await this.page.click(`${formAberto} [type=submit]`); await this.espera(800); });
Then('fica registrado {int} Biscrok, {int} g e {int} kcal', async function (qtd, g, kcal) {
  const v = await this.loja(() => { const v = Object.values(__store.vitals).find(x => x.foodId === 'biscrok'); return v && { qty: v.qty, g: v.food_g, kcal: Math.round(nutri(v).kcal) }; });
  assert.deepEqual(v, { qty: qtd, g, kcal });
});
Then('o remédio {string} fica como dado', async function (nome) {
  const l = await this.loja(n => Object.values(__store.rotina_log || {}).filter(x => x.label.startsWith(n)).map(x => x.status), nome);
  assert.deepEqual(l, ['done']);
});
Then('nenhum outro remédio fica como pulado', async function () {
  assert.equal(await this.loja(() => Object.values(__store.rotina_log || {}).filter(x => x.status === 'skipped').length), 0);
});
When('preencho o peso com {string}', async function (kg) { await this.page.fill('#regPeso [data-w=kg]', kg); });
When('salvo o peso', async function () { await this.page.click('[data-wsave2]'); await this.espera(800); });
Then('existe uma pesagem de {float} kg', async function (kg) {
  assert.ok(await this.loja(k => Object.values(__store.exams).some(e => e.params && e.params.peso === k), kg));
});
Then('a linha do tempo ganha o acontecimento {string}', async function (t) {
  assert.ok(await this.loja(x => Object.values(__store.events).some(e => (e.text || '').startsWith(x)), t));
});
When('preencho a consulta {string} às {string}', async function (oque, hora) { await this.page.fill('#calAdd [name=what]', oque); await this.page.fill('#calAdd [name=time]', hora); });
When('salvo a consulta', async function () { await this.page.click('#calAdd [type=submit]'); await this.espera(800); });
Then('fica agendado {string} com lembrete de {int} minutos antes', async function (txt, min) {
  const ap = await this.loja(() => Object.values(__store.events).filter(e => e.kind === 'consulta').map(e => [e.text, e.remind]));
  assert.deepEqual(ap, [[txt, min]]);
});

/* ---------- Lembretes ---------- */
const lembrete = rotulo => `#hojeAgora .rN:has(b:has-text("${rotulo}"))`;
When('respondo o lembrete de {string} com {int} mL de {string}', async function (rotulo, ml, bebida) {
  const n = lembrete(rotulo);
  await this.page.fill(`${n} [name=v]`, String(ml));
  const sel = this.page.locator(`${n} [name=fid]`);
  const valor = await sel.evaluate((s, o) => [...s.options].find(x => x.text.trim().toLowerCase().startsWith(o.toLowerCase()))?.value, bebida);
  assert.ok(valor, `não achei a bebida ${bebida}`); await sel.selectOption(valor);
  await this.page.click(`${n} [type=submit]`); await this.espera(800);
});
Then('a água de hoje soma {int} mL', async function (ml) { assert.equal(await this.loja(() => Math.round(dayTotals(todayIso()).water)), ml); });
When('desmarco {string} no lembrete {string}', async function (nome, rotulo) { await this.page.locator(`${lembrete(rotulo)} label.chk:has-text("${nome}") input`).uncheck(); });
When('confirmo o lembrete {string}', async function (rotulo) { await this.page.click(`${lembrete(rotulo)} [type=submit]`); await this.espera(800); });
Given('que pulei {string} no lembrete {string}', async function (nome, rotulo) {
  await this.page.locator(`${lembrete(rotulo)} label.chk:has-text("${nome}") input`).uncheck();
  await this.page.click(`${lembrete(rotulo)} [type=submit]`); await this.espera(800);
});
const statusDo = (w, rotulo) => w.loja(r => Object.values(__store.notifs).find(n => n.label === r)?.status, rotulo);
Then('o lembrete {string} fica parcial', async function (r) { assert.equal(await statusDo(this, r), 'partial'); });
Then('o lembrete {string} fica pulado', async function (r) { assert.equal(await statusDo(this, r), 'skipped'); });
Then('{string} fica dado e {string} fica pulado', async function (a, b) {
  const st = await this.loja(() => Object.fromEntries(Object.values(__store.rotina_log).filter(l => l.block === 'Manhã').map(l => [l.label.split(' · ')[0], l.status])));
  assert.equal(st[a], 'done'); assert.equal(st[b], 'skipped');
});
When('digo que dei {string} às {string}', async function (nome, hora) {
  const id = await this.loja(n => Object.entries(__store.rotina_log).find(([, l]) => l.label.startsWith(n) && l.status === 'skipped')[0], nome);
  await this.page.click(`[data-late="${id}"]`); await this.page.fill('.rLate [name=lt]', hora); await this.page.click(`[data-latego="${id}"]`); await this.espera(800);
  this.logId = id;
});
Then('{string} fica dado às {string} com a nota de atraso', async function (_n, hora) {
  const l = await this.loja(id => __store.rotina_log[id], this.logId);
  assert.equal(l.status, 'done'); assert.equal(l.time, hora); assert.match(l.note, /atraso/);
});
When('pulo o lembrete {string}', async function (rotulo) {
  await this.page.click(`#hojeAgora .rN:has(b:text-is("💊 ${rotulo}")) [data-skip], #hojeAgora .rN:has(b:has-text("${rotulo}")):not(:has([name=it])) [data-skip]`); await this.espera(800);
});

/* ---------- Notificações (Admin) ---------- */
When('desligo {string} e ligo {string} e {string} a cada {int} h', async function (off, on1, on2, h) {
  await this.page.uncheck(`#aNotif [name=${off}]`); await this.page.check(`#aNotif [name=${on1}_on]`); await this.page.check(`#aNotif [name=${on2}_on]`);
  await this.page.selectOption(`#aNotif [name=${on2}_every]`, String(h * 60));
});
When('salvo as notificações', async function () { await this.page.click('#aNotif [type=submit]'); await this.espera(800); });
Then('compras ficam desligadas e remédios ligados', async function () {
  const c = await this.loja(() => __store.meta.notificacoes); assert.equal(c.compra, false); assert.equal(c.med, true);
});
Then('o decúbito fica a cada {int} h e a água a cada {int} h, das {string}', async function (hd, ha, de) {
  const s = await this.loja(() => ({ d: __store.schedule.decubito, a: __store.schedule.agua }));
  assert.equal(s.d.every, hd * 60); assert.equal(s.d.kind, 'decubito'); assert.ok(s.d.active);
  assert.equal(s.a.every, ha * 60); assert.equal(s.a.from, de);
});

/* ---------- Permissões ---------- */
Then('o botão {string} não aparece', async function (nome) {
  assert.equal(await this.page.evaluate(n => [...document.querySelectorAll('.tabs .tab')].some(b => b.offsetParent && b.textContent.includes(n)), nome), false);
});
Then('os lembretes aparecem sem formulário de resposta', async function () { assert.equal(await this.page.locator('#hojeAgora .rN form').count(), 0); });
Then(/^Admin (aparece|não aparece) em Mais$/, async function (q) {
  const tem = await this.page.$$eval('#subtabs [data-go]', bs => bs.some(b => b.dataset.go === 'admin'));
  assert.equal(tem, q === 'aparece');
});

/* ---------- Medicamentos ---------- */
Then('a lista {string} está fechada', async function (_lista) { assert.equal(await this.page.evaluate(() => document.getElementById('medPastBox').open), false); });
Then('cada remédio em uso tem ícone', async function () {
  const ic = await this.page.$$eval('#medActive .mrow', rs => rs.map(r => !!r.querySelector('.mic svg')));
  assert.ok(ic.length > 0 && ic.every(Boolean));
});
const linhaMed = nome => `.mrow:has(b:text-is("${nome}"))`;
When('pauso {string} com o motivo padrão', async function (nome) {
  await this.page.evaluate(n => [...document.querySelectorAll('#medActive .mrow')].find(r => r.textContent.includes(n)).querySelector('details').open = true, nome);
  await this.page.click(`#medActive [data-mpause="m1"]`); await this.page.click('#medActive [data-mpausego]'); await this.espera(800);
});
Then('{string} aparece em Pausados com o motivo {string}', async function (_n, motivo) {
  const m = await this.loja(() => __store.meds.m1);
  assert.equal(m.paused, true); assert.equal(m.pauseReason, motivo);
  assert.equal(await this.page.locator('#medPaused .mrow').count(), 1);
});
When('retomo {string}', async function (_nome) {
  await this.page.evaluate(() => document.querySelector('#medPaused details').open = true);
  await this.page.click('#medPaused [data-mresume]'); await this.espera(800);
});
Then('{string} volta pra Em uso com {int} pausa no histórico', async function (_n, k) {
  const m = await this.loja(() => __store.meds.m1);
  assert.equal(m.paused, false); assert.equal((m.pauses || []).length, k);
  assert.deepEqual(this.dialogos, [], 'abriu caixa de diálogo do navegador');
});
