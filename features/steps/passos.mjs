// Passos dos cenários (Gherkin declarativo, em português). Cada passo fala com os Page Objects
// (features/support/paginas.mjs) e confere o que aparece na tela com expect, que espera sozinho
// (sem espera fixa). Um expect por "Então"/"E".
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { PAPEL, TELA } from '../support/mundo.mjs'
import { SEED, today } from '../../tests/seed.mjs'

const SECOES = ['Hoje', 'Registrar', 'Evolução', 'Histórico', 'Mais']
// dados de teste usados nas ações (só ilustram; a regra conferida vem do catálogo e da tela)
const MASSA = { biscoitos: 2, cocoMl: 150, pesoKg: 19.4, consulta: 'neuro', consultaHora: '15:00', motivoPausa: 'aguardando a neuro', remedio: 'Remédio teste', outroRemedio: 'Outro em uso', blocoManha: 'Manhã', remedioAvulso: 'Remédio teste', horaDepois: '11:28' }

/* ---------- Quem sou e onde estou ---------- */
Given('que eu administro o app', function () { this.email = PAPEL.admin })
Given('que eu posso registrar os cuidados do Odin', function () { this.email = PAPEL['quem edita'] })
Given('que eu só acompanho o Odin', function () { this.email = PAPEL['quem só vê'] })
Given('há lembretes pendentes para hoje', function () {
  this.pendentes = Object.values(SEED.notifs).filter(n => n.status === 'pending' && n.date === today).length
})
Given('eu estou em Registrar', async function () { await this.abrir(); await this.nav.abrir('Registrar') })
Given('eu estou em Medicamentos', async function () { await this.abrir(); await this.nav.abrir('Mais', 'Medicamentos') })
Given('eu estou na administração', async function () { await this.abrir(); await this.nav.abrir('Mais', 'Admin') })

When('eu abro o app', async function () { await this.abrir() })
When('eu abro {string} em {string}', async function (parte, secao) { await this.abrir(); await this.nav.abrir(secao, parte) })
When('eu abro {string}', async function (secao) { await this.abrir(); await this.nav.abrir(secao) })
When('eu abro o aviso de um lembrete', async function () { await this.abrir({ hash: '#rotina' }) })
When('eu abro um link que leva para Registrar', async function () { await this.abrir({ hash: '#registrar' }) })

/* ---------- Navegação ---------- */
Then('eu vejo as seções Hoje, Registrar, Evolução, Histórico e Mais', async function () {
  for (const s of SECOES) await expect(this.nav.secao(s)).toBeVisible()
})
Then('as seções ficam na parte de baixo da tela', async function () {
  const caixa = await this.nav.menu.boundingBox()
  expect(Math.round(caixa.y + caixa.height)).toBe(this.page.viewportSize().height)
})
Then('as seções ficam no topo da página', async function () {
  const caixa = await this.nav.menu.boundingBox()
  expect(caixa.y).toBeLessThan(200)
})
Then('eu vejo {string} sem precisar rolar para o lado', async function (parte) {
  await expect(this.page.getByRole('tabpanel').filter({ visible: true })).toHaveCount(1)
  if (await this.nav.partes.isVisible()) await expect(this.nav.parte(parte)).toHaveAttribute('aria-selected', 'true')
  expect(await this.page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})
Then('eu encontro Medicamentos, Estoque, Vacinas e vermífugos, Lembretes, Admin e Atividade', async function () {
  await expect(this.nav.partes.getByRole('tab')).toHaveText(['Medicamentos', 'Estoque', 'Vacinas e vermífugos', 'Lembretes', 'Admin', 'Atividade'])
})
Then('eu vou para Hoje', async function () { await expect(this.nav.secao('Hoje')).toHaveAttribute('aria-selected', 'true') })
Then('eu vejo quantos lembretes estão pendentes', async function () { await expect(this.nav.pendentes()).toHaveText(String(this.pendentes)) })
Then('eu não encontro instrução para publicar o site manualmente', async function () {
  await expect(this.page.getByRole('heading', { name: 'Publicar no site' })).toHaveCount(0)
})

Given('que eu uso o app no {word}', function (aparelho) { this.largura = TELA[aparelho] })
Then('a contagem não fica por cima do nome da seção', async function () {
  const b = await this.nav.pendentes().boundingBox()
  const t = await this.nav.secao('Hoje').locator('.tn').boundingBox()
  const sobrepoe = b.x < t.x + t.width && t.x < b.x + b.width && b.y < t.y + t.height && t.y < b.y + b.height
  expect(sobrepoe).toBe(false)
})

/* ---------- Registrar ---------- */
When('eu registro que ele comeu biscoitos contados por unidade', async function () {
  this.antes = await this.page.evaluate(() => Math.round(dayTotals(todayIso()).kcal))
  await this.registrar.comida('Biscrok Multi (unid.)', MASSA.biscoitos, 'no lanche')
})
Then('as calorias de hoje passam a contar esses biscoitos pelo catálogo de alimentos', async function () {
  const b = await this.page.evaluate(() => foodById('biscrok'))
  const esperado = this.antes + Math.round(MASSA.biscoitos * b.gUnit * b.kcal100 / 100)
  await this.nav.abrir('Hoje')
  await expect(this.hoje.numero('Calorias hoje')).toContainText(new RegExp('(^|\\D)' + esperado + '\\s*kcal'))
})
When('eu registro que dei apenas um dos remédios em uso', async function () { await this.registrar.remedioDado(MASSA.remedioAvulso) })
Then('esse remédio aparece como dado nas últimas 48 horas', async function () {
  await this.nav.abrir('Hoje')
  await expect(this.hoje.registro48(MASSA.remedioAvulso)).toBeVisible()
})
Then('nenhum remédio aparece como pulado', async function () {
  await expect(this.hoje.ultimas48().getByRole('button', { name: 'Dei depois' })).toHaveCount(0)
})
When('eu registro o peso dele', async function () { await this.registrar.peso(MASSA.pesoKg) })
Then('o peso mais recente em Hoje é o que eu registrei', async function () {
  await this.nav.abrir('Hoje')
  await expect(this.page.getByRole('region', { name: 'Últimos valores' })).toContainText('19,4')
})
When('eu registro um xixi com escape', async function () { await this.registrar.xixi('com escape') })
Then('esse xixi aparece nas últimas 48 horas', async function () {
  await this.nav.abrir('Hoje')
  await expect(this.hoje.registro48('Xixi com escape')).toBeVisible()
})
When('eu agendo uma consulta para hoje', async function () { await this.registrar.consulta(MASSA.consulta, today, MASSA.consultaHora) })
Then('a consulta aparece no calendário de hoje', async function () {
  await this.nav.abrir('Histórico', 'Linha do tempo')
  await this.historico.verCalendario()
  await expect(this.historico.compromisso('Consulta: ' + MASSA.consulta)).toBeVisible()
})

Then(/^eu vejo a confirmação de que (?:a|o) (comida|xixi|água) foi registrad[ao]$/, async function (oque) {
  const marca = { comida: '🍽', xixi: 'Xixi', 'água': '💧' }[oque]
  await expect(this.page.getByRole('status').filter({ hasText: 'Registrado' })).toContainText(marca)
})

Then('o formulário fica limpo pra um novo registro', async function () {
  const f = this.registrar.formulario('Comida')
  await expect(f.getByLabel('Quanto ele comeu (g ou unidades)')).toHaveValue('')
  await expect(f.getByLabel('Obs.')).toHaveValue('')
})
Then('o formulário de peso fica limpo pra um novo registro', async function () {
  await expect(this.registrar.caixa('Peso').getByLabel('Peso (kg)')).toHaveValue('')
})

/* ---------- Lembretes ---------- */
When('eu respondo o lembrete de água dizendo que ele bebeu água de coco', async function () {
  await this.abrir()
  await this.hoje.responderAgua('Água de coco natural', MASSA.cocoMl)
})
Then('a água de hoje soma só a parte de água da água de coco', async function () {
  const coco = await this.page.evaluate(() => foodById('coco'))
  await expect(this.hoje.numero('Água hoje')).toContainText(new RegExp('(^|\\D)' + Math.round(MASSA.cocoMl * coco.water) + '\\s*mL'))
})
When('eu confirmo o lembrete da manhã deixando de fora um dos remédios', async function () {
  await this.abrir()
  await this.hoje.confirmarBloco(MASSA.blocoManha, MASSA.outroRemedio)
})
Then('o remédio que eu deixei de fora aparece como pulado nas últimas 48 horas', async function () {
  await expect(this.hoje.registro48(MASSA.outroRemedio).getByRole('button', { name: 'Dei depois' })).toBeVisible()
})
Then('o lembrete da manhã sai da lista do que está pendente agora', async function () {
  await expect(this.hoje.lembrete(MASSA.blocoManha)).toHaveCount(0)
})
Given('que eu pulei um remédio no lembrete da manhã', async function () {
  await this.abrir()
  await this.hoje.confirmarBloco(MASSA.blocoManha, MASSA.outroRemedio)
  await expect(this.hoje.registro48(MASSA.outroRemedio).getByRole('button', { name: 'Dei depois' })).toBeVisible()
})
When('eu informo que dei esse remédio mais tarde', async function () { await this.hoje.deiDepois(MASSA.outroRemedio, MASSA.horaDepois) })
Then('ele aparece como dado no horário que eu informei', async function () {
  await expect(this.hoje.registro48(MASSA.outroRemedio)).toContainText(MASSA.horaDepois)
})
Then('ele não aparece mais como pulado', async function () {
  await expect(this.hoje.registro48(MASSA.outroRemedio).getByRole('button', { name: 'Dei depois' })).toHaveCount(0)
})
When('eu pulo o lembrete de um remédio', async function () { await this.abrir(); await this.hoje.pular(MASSA.remedio) })
Then('esse lembrete sai da lista do que está pendente agora', async function () {
  await expect(this.hoje.lembrete(MASSA.remedio)).toHaveCount(0)
})

When('eu marco como visto o aviso de compra de um remédio', async function () { await this.abrir(); await this.hoje.visto('Comprar ' + MASSA.outroRemedio) })
Then('esse aviso sai da lista do que está pendente agora', async function () {
  await expect(this.hoje.lembrete('Comprar ' + MASSA.outroRemedio)).toHaveCount(0)
  expect(this.erros).toEqual([])
})

/* ---------- Notificações ---------- */
When('eu ligo os avisos de troca de decúbito e de água', async function () {
  await this.admin.configurar({ ligar: ['Troca de decúbito', 'Oferecer água'] })
})
Then('troca de decúbito e oferecer água aparecem entre os horários dos lembretes', async function () {
  await this.nav.abrir('Mais', 'Lembretes')
  await expect(this.lembretes.horario('Troca de decúbito')).toBeVisible()
  await expect(this.lembretes.horario('Oferecer água')).toBeVisible()
})
When('eu desligo os avisos de compra de remédio', async function () { await this.admin.configurar({ desligar: ['Comprar remédio'] }) })
When('eu volto mais tarde à administração', async function () { await this.nav.abrir('Hoje'); await this.nav.abrir('Mais', 'Admin') })
Then('os avisos de compra de remédio continuam desligados', async function () {
  await expect(this.admin.notificacoes.getByRole('checkbox', { name: /Comprar remédio/ })).not.toBeChecked()
})

When('eu deixo o alerta de remédios no celular como insistente', async function () { await this.admin.alertaNoCelular('Remédios', 'insistente') })
Then('o alerta de remédios no celular continua insistente', async function () { await expect(this.admin.alertaCelular('Remédios')).toHaveValue('insistente') })
Then('o alerta de água no celular continua normal', async function () { await expect(this.admin.alertaCelular('Água')).toHaveValue('normal') })

/* ---------- Permissões ---------- */
Then('eu não encontro a seção Registrar', async function () { await expect(this.nav.secao('Registrar')).toBeHidden() })
Then('os lembretes aparecem sem opção de resposta', async function () {
  await expect(this.hoje.lembrete(MASSA.remedio)).toBeVisible()
  await expect(this.hoje.lembrete(MASSA.remedio).getByRole('button')).toHaveCount(0)
})
Then(/^a administração (aparece|não aparece)$/, async function (r) {
  await expect(this.nav.parte('Admin')).toHaveCount(r === 'aparece' ? 1 : 0)
})

/* ---------- Medicamentos ---------- */
Then('a lista do que ele já usou fica recolhida', async function () {
  await expect(this.medicamentos.jaUsou()).toBeVisible()
  await expect(this.medicamentos.lista('Já usou')).toBeHidden()
})
When('eu pauso um remédio em uso informando o motivo', async function () { await this.medicamentos.pausar(MASSA.remedio, MASSA.motivoPausa) })
Then('ele aparece entre os pausados com o motivo', async function () {
  const r = await this.medicamentos.abrir('Pausados', MASSA.remedio)
  await expect(r).toContainText(MASSA.motivoPausa)
})
Given('que um remédio em uso foi pausado', async function () {
  await this.medicamentos.pausar(MASSA.remedio, MASSA.motivoPausa)
  await expect(this.medicamentos.remedio('Pausados', MASSA.remedio)).toBeVisible()
})
When('eu retomo esse remédio', async function () { await this.medicamentos.retomar(MASSA.remedio) })
Then('ele volta para os remédios em uso', async function () { await expect(this.medicamentos.remedio('Em uso', MASSA.remedio)).toBeVisible() })
Then('o histórico dele mostra a pausa', async function () {
  const r = await this.medicamentos.abrir('Em uso', MASSA.remedio)
  await expect(r).toContainText('Pausas anteriores')
  expect(this.dialogos).toEqual([])
})

/* ---------- Site público ---------- */
Given('que eu visito o site público no celular', async function () { this.largura = TELA.celular; await this.abrirSite() })
Given('que eu visito o site público no computador', async function () { this.largura = TELA.computador; await this.abrirSite() })
When('eu abro {string} em {string} no site', async function (parte, secao) { await this.nav.abrir(secao, parte) })
When('eu abro {string} no site', async function (secao) { await this.nav.abrir(secao) })
Then('eu vejo as seções Hoje, Evolução, Histórico e Mais', async function () {
  for (const s of ['Hoje', 'Evolução', 'Histórico', 'Mais']) await expect(this.nav.secao(s)).toBeVisible()
})
Then('a página não registra erro', function () { expect([...this.erros, ...this.consoleErros]).toEqual([]) })
Then('eu não encontro Lembretes nem Admin', async function () {
  await expect(this.nav.partes.getByRole('tab')).toHaveText(['Medicamentos', 'Vacinas e vermífugos'])
})
Then('não aparece nenhum endereço de e-mail na página', async function () {
  expect(await this.page.locator('body').innerText()).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
})
Then('todo o conteúdo da página está dentro do cabeçalho, do menu ou de uma seção', async function () {
  const soltos = await this.page.evaluate(() => [...document.body.childNodes]
    .filter(n => (n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && !/^(SCRIPT|STYLE|HEADER|NAV|MAIN|FOOTER|DIV|SECTION|TEMPLATE|DIALOG|P)$/.test(n.tagName) && n.offsetParent !== null && n.innerText?.trim()))
    .map(n => (n.textContent || '').trim().slice(0, 40)))
  expect(soltos).toEqual([])
})

Given('que um suplemento foi pausado antes de começar', async function () {
  await this.page.evaluate(t => db.collection('meds').doc('m9').set({ name: 'Suplemento em espera', start: t, paused: true, pausedAt: t, pauseReason: 'aguardando a neuro', dose: '8 g' }), today)
  await expect(this.medicamentos.remedio('Pausados', 'Suplemento em espera')).toBeVisible()
})
When('eu abro o histórico', async function () { if (!this.page) await this.abrir(); await this.nav.abrir('Histórico', 'Linha do tempo') })
Then('ele não aparece no histórico como começado', async function () {
  await expect(this.page.getByRole('tabpanel').filter({ visible: true })).not.toContainText('Suplemento em espera')
})

/* ---------- Estoque ---------- */
When('eu abro o estoque', async function () { if (!this.page) await this.abrir(); await this.nav.abrir('Mais', 'Estoque') })
Then('o remédio e a gaze aparecem na lista de compras', async function () {
  await expect(this.estoque.naLista(MASSA.outroRemedio)).toBeVisible()
  await expect(this.estoque.naLista('Gaze')).toBeVisible()
})
Then('a luva não aparece na lista de compras', async function () { await expect(this.estoque.naLista('Luva')).toHaveCount(0) })
When('eu cadastro no estoque uma seringa que dura poucos dias', async function () {
  await this.registrar.escolher('Item de estoque')
  await this.estoque.cadastrar({ nome: 'Seringa 20 mL', tipo: 'suprimento', qtd: 6, unidade: 'un', porDia: 2 })
  await expect(this.page.getByRole('status').filter({ hasText: 'Adicionado ao estoque' })).toBeVisible()
})
Then('a seringa aparece nos suprimentos e na lista de compras', async function () {
  await expect(this.estoque.item('Suprimentos', 'Seringa 20 mL')).toBeVisible()
  await expect(this.estoque.naLista('Seringa 20 mL')).toBeVisible()
})
When('eu conto a gaze depois de comprar mais', async function () { await this.estoque.contar('Suprimentos', 'Gaze', { qtd: 10 }) })
Then('a gaze sai da lista de compras', async function () {
  await expect(this.estoque.naLista('Gaze')).toHaveCount(0)
  await expect(this.estoque.item('Suprimentos', 'Gaze')).toContainText('10 pct')
})
Then('eu vejo a lista de compras sem opção de contar', async function () {
  await expect(this.estoque.naLista('Gaze')).toBeVisible()
  await expect(this.estoque.item('Suprimentos', 'Gaze').getByRole('button')).toHaveCount(0)
  await expect(this.page.getByRole('form', { name: 'Contar Gaze' })).toHaveCount(0)
})

/* ---------- Horários e ordem ---------- */
const emOrdem = xs => [...xs].sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }))
When('eu passo um remédio do horário da manhã para um horário próprio às 17:00', async function () {
  await this.abrir(); await this.nav.abrir('Mais', 'Lembretes')
  await this.lembretes.novoHorario({ nome: 'Outro em uso 17h', remedio: MASSA.outroRemedio, horarios: '17:00' })
})
Then('eu vejo a confirmação de que o horário foi criado', async function () { await expect(this.page.getByRole('status').filter({ hasText: 'Horário criado' })).toBeVisible() })
Then('o horário novo aparece na lista de horários', async function () { await expect(this.lembretes.horario('Outro em uso 17h')).toContainText('17:00') })
Then('o remédio não aparece mais no horário da manhã', async function () { await expect(this.lembretes.horario('^Manhã$')).not.toContainText(MASSA.outroRemedio) })
Then('os horários aparecem em ordem alfabética', async function () {
  const nomes = await this.page.getByRole('list', { name: 'Horários' }).getByRole('listitem').evaluateAll(xs => xs.map(x => x.getAttribute('aria-label')))
  expect(nomes.length).toBeGreaterThan(1); expect(nomes).toEqual(emOrdem(nomes))
})
Then('os remédios em uso aparecem em ordem alfabética', async function () {
  const nomes = await this.page.getByRole('list', { name: 'Em uso' }).getByRole('listitem').evaluateAll(xs => xs.map(x => x.getAttribute('aria-label')))
  expect(nomes.length).toBeGreaterThan(1); expect(nomes).toEqual(emOrdem(nomes))
})
When('eu amplio o gráfico de temperatura', async function () { await this.page.getByRole('button', { name: 'Ampliar temperatura' }).click() })
Then('eu vejo a temperatura ampliada', async function () {
  const d = this.page.getByRole('dialog', { name: 'Temperatura' })
  await expect(d).toBeVisible(); await expect(d.getByRole('img', { name: /ampliado/ }).or(d.locator('canvas'))).toBeVisible()
})

/* ---------- Metas ---------- */
When('eu defino a água em 5 mL por kg por hora', async function () { await this.admin.metas({ 'Água por hora (mL por kg)': 5 }) })
When('eu defino a meta de comida em 680 g', async function () { await this.admin.metas({ 'Meta de comida (g/dia)': 680 }) })
Then('a meta de água de hoje é 1.600 mL e mostra quanto falta beber', async function () {
  await expect(this.page.getByRole('group', { name: 'Água hoje' })).toContainText('meta 1.600 mL · falta beber 1.600 mL')
})
Then('eu vejo quanto ele comeu hoje contra a meta de 680 g', async function () { await expect(this.page.getByRole('group', { name: 'Comida hoje' })).toContainText('meta 680 g') })
When('eu volto para Hoje', async function () { await this.nav.abrir('Hoje') })

/* ---------- Comida caseira ---------- */
const formComida = page => page.getByRole('region', { name: 'Registrar Comida' })
When('eu vou anotar uma comida caseira', async function () {
  await this.registrar.escolher('Comida')
  await formComida(this.page).getByLabel('Alimento').selectOption({ label: '🥕 Comida caseira (descrever a receita)' })
})
When('eu vou anotar uma comida do catálogo', async function () { await this.registrar.escolher('Comida') })
Then('o app pede a receita da comida caseira', async function () { await expect(formComida(this.page).getByLabel('Receita da comida caseira')).toBeVisible() })
Then('o app não pede receita', async function () { await expect(formComida(this.page).getByLabel('Receita da comida caseira')).toBeHidden() })

/* ---------- Histórico ---------- */
const diaDeHoje = page => page.getByRole('list', { name: /^Registros de / }).first()
Then('o dia de hoje mostra o remédio dado e a temperatura', async function () {
  await expect(diaDeHoje(this.page)).toContainText('Deu Vitamina teste')
  await expect(diaDeHoje(this.page)).toContainText('38,4 °C')
})
Then('o registro mais recente aparece primeiro', async function () {
  const horas = await diaDeHoje(this.page).getByRole('listitem').evaluateAll(xs => xs.map(x => (x.querySelector('.hh') || {}).textContent).filter(Boolean))
  expect(horas.length).toBeGreaterThan(1); expect(horas).toEqual([...horas].sort().reverse())
})
When('eu filtro o histórico por remédio', async function () { await this.page.getByRole('button', { name: /^Remédio \d/ }).click() })
Then('só aparecem registros de remédio', async function () {
  await expect.poll(async () => { const t = await diaDeHoje(this.page).getByRole('listitem').allTextContents(); return t.length > 0 && t.every(x => /Deu|Pulou/.test(x)) }).toBe(true)
})
Then('eu não vejo a seção de últimos acontecimentos', async function () { await expect(this.page.getByRole('heading', { name: 'Últimos acontecimentos' })).toHaveCount(0) })

/* ---------- Atividade ---------- */
const itensAtividade = page => page.getByRole('list', { name: /^Atividade de / }).getByRole('listitem')
Then('eu vejo que a Elis lançou a água de coco e a Brenda apagou o evento', async function () {
  await expect(itensAtividade(this.page).filter({ hasText: 'Elis' })).toContainText('água de coco')
  await expect(itensAtividade(this.page).filter({ hasText: 'Brenda' })).toContainText('apagou')
})
When('eu filtro a atividade pela Brenda', async function () { await this.page.getByRole('group', { name: 'Filtrar por pessoa' }).getByRole('button', { name: 'Brenda' }).click() })
Then('só aparece o que a Brenda fez', async function () {
  await expect(itensAtividade(this.page)).toHaveCount(1); await expect(itensAtividade(this.page)).toContainText('Brenda')
})
Then('eu não encontro a parte de atividade', async function () { await expect(this.nav.partes.getByRole('tab', { name: 'Atividade' })).toHaveCount(0) })

/* ---------- Temperatura ---------- */
When('a última temperatura anotada é {int},{int} °C', async function (a, b) {
  if (!this.page) await this.abrir()
  const t = Number(`${a}.${b}`)
  await this.page.evaluate(t => window.ODIN_FB.fs.collection('vitals').add({ date: new Date().toLocaleDateString('sv'), time: '23:59', temp: t }), t)
})
Then('o quadro de temperatura mostra {string}', async function (sit) {
  await this.nav.abrir('Hoje')
  await expect(this.page.locator('#tiles .tile').first().locator('.pill')).toHaveText(sit)
})

/* ---------- Próximas 12 h ---------- */
async function programar(world, min) {
  if (!world.page) await world.abrir()
  await world.page.evaluate(min => {
    const d = new Date(Date.now() + min * 6e4), hm = d.toTimeString().slice(0, 5), date = d.toLocaleDateString('sv')
    return window.ODIN_FB.fs.collection('schedule').doc('prox').set({ kind: 'med', label: 'Lanche de teste', times: [hm], active: true, items: [{ medId: 'm2', name: 'Outro em uso', dose: '1 comp.' }], from_date: date, until: date })
  }, min)
}
Given('tem um remédio programado pra daqui a meia hora', async function () { await programar(this, 30) })
Given('tem um remédio programado pra daqui a 5 horas', async function () { await programar(this, 300) })
const proxItem = page => page.getByRole('list', { name: 'Próximas 12 h' }).getByRole('listitem', { name: /Lanche de teste/ })
When('eu adianto esse remédio', async function () { await proxItem(this.page).getByRole('button', { name: 'Adiantar' }).click() })
Then('ele aparece em {string} pra eu responder', async function (_) {
  await expect(this.page.getByRole('group', { name: 'Lembrete Lanche de teste' })).toBeVisible()
  await expect(proxItem(this.page)).toHaveCount(0)
})
Then('eu vejo esse remédio nas próximas 12 horas sem opção de adiantar', async function () {
  await expect(proxItem(this.page)).toBeVisible()
  await expect(proxItem(this.page).getByRole('button', { name: 'Adiantar' })).toHaveCount(0)
})
When('eu vou anotar fezes', async function () { await this.registrar.escolher('Fezes') })
Then('a consistência começa em {string}', async function (t) {
  await expect(this.page.getByRole('region', { name: 'Registrar Fezes' }).getByLabel('Consistência')).toHaveValue('')
  await expect(this.page.getByRole('region', { name: 'Registrar Fezes' }).getByLabel('Consistência').locator('option:checked')).toHaveText(t)
})

/* ---------- Refeição planejada ---------- */
const refeicao = page => page.getByRole('group', { name: 'Lembrete Café da manhã' })
Given('está na hora do café da manhã planejado', async function () {
  if (!this.page) await this.abrir()
  await this.page.evaluate(() => {
    const fs = window.ODIN_FB.fs, d = new Date().toLocaleDateString('sv')
    fs.collection('foods').doc('umida1').set({ name: 'Pet Delícia', kind: 'comida', unit: 'g', kcal100: 133, tipo: 'umida' })
    fs.collection('foods').doc('seca1').set({ name: 'Ração seca', kind: 'comida', unit: 'g', kcal100: 355, tipo: 'seca' })
    return fs.collection('notifs').doc('cafe_' + d + '_0940').set({ kind: 'comida', label: 'Café da manhã', date: d, time: '09:40', status: 'pending', schedId: 'cafe',
      plan: 'aprox. 100 g de ração úmida + aprox. 75 g de ração seca', meal: [{ nome: 'Ração úmida', tipo: 'umida', quanto: 'aprox. 100 g', ex: 'ex.: 100' }, { nome: 'Ração seca', tipo: 'seca', quanto: 'aprox. 75 g', ex: 'ex.: 75' }] })
  })
  await this.nav.abrir('Hoje')
})
When('eu confirmo que dei o café da manhã', async function () { await refeicao(this.page).getByRole('button', { name: 'Dei ✓' }).click() })
Then('o app pede quanto ele comeu de cada parte', async function () {
  await expect(refeicao(this.page).getByRole('group', { name: 'Ração úmida' })).toBeVisible()
  await expect(refeicao(this.page).getByRole('group', { name: 'Ração seca' })).toBeVisible()
})
When('eu anoto 95 g de ração úmida e 70 g de ração seca', async function () {
  const r = refeicao(this.page)
  await r.getByRole('group', { name: 'Ração úmida' }).getByLabel('Quanto comeu (g)').fill('95')
  await r.getByRole('group', { name: 'Ração seca' }).getByLabel('Quanto comeu (g)').fill('70')
  await r.getByRole('button', { name: 'Salvar refeição ✓' }).click()
})
Then('as duas partes ficam registradas como comida de hoje', async function () {
  await expect(this.page.getByRole('status').filter({ hasText: 'Registrado' })).toBeVisible()
  await expect(this.page.getByRole('list', { name: 'Últimas 48 h' })).toContainText('95 g')
  await expect(this.page.getByRole('list', { name: 'Últimas 48 h' })).toContainText('70 g')
})

/* ---------- Lembrete de pesar ---------- */
Given('está na hora de pesar o Odin', async function () {
  if (!this.page) await this.abrir()
  await this.page.evaluate(() => { const d = new Date().toLocaleDateString('sv'); return window.ODIN_FB.fs.collection('notifs').doc('peso_' + d + '_0915').set({ kind: 'peso', label: 'Ver o peso', date: d, time: '09:15', status: 'pending', schedId: 'peso' }) })
  await this.nav.abrir('Hoje')
})
When('eu lanço {int},{int} kg no lembrete', async function (a, b) {
  const g = this.page.getByRole('group', { name: 'Lembrete Ver o peso' })
  await g.getByLabel('Peso (kg)').fill(`${a},${b}`)
  await g.getByRole('button', { name: 'Salvar' }).click()
  await expect(this.page.getByRole('status').filter({ hasText: 'kg' })).toBeVisible()
})
Then('o peso de {int},{int} kg aparece em Hoje', async function (a, b) {
  await expect(this.page.locator('#tiles .tile').filter({ hasText: 'Peso' })).toContainText(`${a},${b}`)
})
Given('está na hora de medir a glicemia', async function () {
  if (!this.page) await this.abrir()
  await this.page.evaluate(() => { const d = new Date().toLocaleDateString('sv'); return window.ODIN_FB.fs.collection('notifs').doc('glic_' + d + '_0830').set({ kind: 'glic', label: 'Glicemia em jejum', date: d, time: '08:30', status: 'pending', schedId: 'glic' }) })
  await this.nav.abrir('Hoje')
})
When('eu lanço a glicemia de {int} no lembrete', async function (v) {
  const g = this.page.getByRole('group', { name: 'Lembrete Glicemia em jejum' })
  await g.getByLabel('Glicemia (mg/dL)').fill(String(v))
  await g.getByRole('button', { name: 'Salvar' }).click()
})
Then('a glicemia fica registrada em jejum', async function () {
  await expect(this.page.getByRole('status').filter({ hasText: 'glicemia 92 mg/dL' })).toBeVisible()
  await expect.poll(() => this.page.evaluate(() => Object.values(window.__store.exams).some(e => e.params && e.params.glic === 92 && e.other.includes('em jejum')))).toBe(true)
})

/* ---------- Zoom ---------- */
const faixaX = page => page.evaluate(() => { const c = Chart.getChart(document.querySelector('[role=dialog] canvas')); return { min: c.scales.x.min, max: c.scales.x.max } })
When('eu escolho ver só os últimos 7 dias', async function () {
  this.faixaInicial = await faixaX(this.page)
  await this.page.getByRole('group', { name: 'Período do gráfico' }).getByRole('button', { name: '7 dias' }).click()
})
Then('o gráfico mostra só a última semana', async function () {
  await expect.poll(async () => { const f = await faixaX(this.page); return Math.round(f.max - f.min) }).toBeLessThanOrEqual(8)
})
When('eu volto a ver tudo', async function () { await this.page.getByRole('group', { name: 'Período do gráfico' }).getByRole('button', { name: 'tudo' }).click() })
Then('o gráfico volta a mostrar o período completo', async function () {
  await expect.poll(async () => (await faixaX(this.page)).min).toBe(this.faixaInicial.min)
})
