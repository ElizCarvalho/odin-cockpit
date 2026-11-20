import { expect } from '@playwright/test'
// Page Objects do cockpit. Um por área da tela; os passos só falam com eles.
// Locators na ordem: getByRole → getByLabel → getByPlaceholder → getByTestId (sem classe CSS, XPath ou getByText).
// Page Object não tem dado de teste nem asserção (asserção fica nos passos).

export class Navegacao {
  constructor(page) {
    this.page = page
    this.menu = page.getByRole('tablist', { name: 'Seções' })
    this.partes = page.getByRole('tablist', { name: 'Partes da seção' })
  }
  secao(nome) { return this.menu.getByRole('tab', { name: new RegExp('^' + nome) }) }
  parte(nome) { return this.partes.getByRole('tab', { name: nome, exact: true }) }
  async abrir(secao, parte) {
    await this.secao(secao).click()
    if (parte && parte !== secao && await this.partes.isVisible()) await this.parte(parte).click()
  }
  pendentes() { return this.secao('Hoje').getByLabel(/pendentes?$/) }
}

export class Hoje {
  constructor(page) { this.page = page }
  lembrete(nome) { return this.page.getByRole('group', { name: new RegExp('^Lembrete ' + nome) }) }
  async responderAgua(bebida, ml) {
    const l = this.lembrete('Água')
    await l.getByLabel('Bebida').selectOption({ label: bebida })
    await l.getByLabel('Quanto (mL)').fill(String(ml))
    await l.getByRole('button', { name: 'Salvar' }).click()
  }
  async confirmarBloco(nome, deixarDeFora) {
    const l = this.lembrete(nome)
    if (deixarDeFora) await l.getByRole('checkbox', { name: new RegExp('^' + deixarDeFora) }).uncheck()
    await l.getByRole('button', { name: /^Dei/ }).click()
  }
  async visto(nome) { await this.lembrete(nome).getByRole('button', { name: 'Ok, visto' }).click() }
  async pular(nome) { await this.lembrete(nome).getByRole('button', { name: 'Pulei' }).click() }
  ultimas48() { return this.page.getByRole('list', { name: 'Últimas 48 h' }) }
  registro48(nome) { return this.ultimas48().getByRole('listitem', { name: new RegExp(nome) }) }
  async deiDepois(nome, hora) {
    const item = this.registro48(nome)
    await item.getByRole('button', { name: 'Dei depois' }).click()
    await item.getByLabel('Que horas deu?').fill(hora)
    await item.getByRole('button', { name: /^Salvar/ }).click()
  }
  numero(nome) { return this.page.getByRole('group', { name: nome }) }
}

export class Registrar {
  constructor(page) {
    this.page = page
    this.opcoes = page.getByRole('region', { name: 'O que você quer registrar?' })
  }
  async escolher(tipo) { await this.opcoes.getByRole('button', { name: tipo, exact: true }).click() }
  formulario(tipo) { return this.page.getByRole('region', { name: 'Registrar ' + tipo }) }
  caixa(nome) { return this.page.getByRole('region', { name: nome }) }
  async comida(alimento, quanto, obs) {
    await this.escolher('Comida')
    const f = this.formulario('Comida')
    await f.getByLabel('Alimento').selectOption({ label: alimento })
    await f.getByLabel('Quanto (g ou unidades)').fill(String(quanto))
    if (obs) await f.getByLabel('Obs.').fill(obs)
    await f.getByRole('button', { name: 'Salvar' }).click()
  }
  async remedioDado(nome) {
    await this.escolher('Remédio dado')
    const f = this.formulario('Remédio dado')
    await f.getByRole('checkbox', { name: new RegExp('^' + nome) }).check()
    await f.getByRole('button', { name: /^Dei/ }).click()
  }
  async peso(kg) {
    await this.escolher('Peso')
    const f = this.caixa('Peso')
    await f.getByLabel('Peso (kg)').fill(String(kg))
    await f.getByRole('button', { name: 'Salvar' }).click()
  }
  async xixi(como) {
    await this.escolher('Xixi')
    const f = this.formulario('Xixi')
    await f.getByLabel('Como').selectOption(como)
    await f.getByRole('button', { name: 'Salvar' }).click()
  }
  async consulta(oque, data, hora) {
    await this.escolher('Agendar consulta')
    const f = this.caixa('Agendar consulta')
    await f.getByLabel('O quê / onde').fill(oque)
    await f.getByLabel('Data').fill(data)
    await f.getByLabel('Hora').fill(hora)
    await f.getByRole('button', { name: 'Salvar' }).click()
  }
}

export class Historico {
  constructor(page) { this.page = page }
  async verCalendario() { await this.page.getByRole('button', { name: 'Calendário' }).click() }
  compromisso(texto) { return this.page.getByRole('button', { name: new RegExp(texto) }) }
}

export class Medicamentos {
  constructor(page) { this.page = page }
  lista(nome) { return this.page.getByRole('list', { name: nome }) }
  remedio(lista, nome) { return this.lista(lista).getByRole('listitem', { name: nome, exact: true }) }
  jaUsou() { return this.page.getByRole('group', { name: 'Já usou' }) }
  // Abre os detalhes do remédio. A lista pode ser redesenhada quando chega dado novo (e fechar o que estava aberto),
  // então confere e tenta de novo, até o conteúdo dos detalhes estar visível.
  async abrir(lista, nome, botao) {
    const r = this.remedio(lista, nome)
    const detalhes = r.getByRole('group').first()
    for (let i = 0; i < 8; i++) {
      if (!(await detalhes.evaluate(d => d.open).catch(() => false))) await detalhes.locator(':scope > summary').click()
      const alvo = botao ? r.getByRole('button', { name: botao }) : detalhes
      if (await alvo.isVisible().catch(() => false) && await detalhes.evaluate(d => d.open).catch(() => false)) return r
      await this.page.waitForLoadState('domcontentloaded')
    }
    return r
  }
  async pausar(nome, motivo) {
    const r = await this.abrir('Em uso', nome, 'pausar')
    await r.getByRole('button', { name: 'pausar' }).click()
    await r.getByLabel('Motivo da pausa').fill(motivo)
    await r.getByRole('button', { name: 'confirmar pausa' }).click()
  }
  async retomar(nome) {
    const r = await this.abrir('Pausados', nome, 'retomar')
    await r.getByRole('button', { name: 'retomar' }).click()
  }
}

export class Admin {
  constructor(page) {
    this.page = page
    this.notificacoes = page.getByRole('region', { name: 'Notificações' })
  }
  tipo(nome) { return this.notificacoes.getByRole('group', { name: nome }) }
  async metas(campos) {
    const f = this.page.getByRole('form', { name: 'Metas' })
    for (const [rotulo, valor] of Object.entries(campos)) await f.getByLabel(rotulo).fill(String(valor))
    await f.getByRole('button', { name: 'Salvar metas' }).click()
    await expect(this.page.getByRole('status').filter({ hasText: 'Metas salvas' })).toBeVisible()
  }
  alertaCelular(tipo) { return this.tipo('Alerta no celular (Pushover)').getByRole('combobox', { name: new RegExp(tipo) }) }
  async alertaNoCelular(tipo, nivel) {
    await this.alertaCelular(tipo).selectOption({ label: nivel })
    await this.notificacoes.getByRole('button', { name: 'Salvar notificações' }).click()
  }
  async configurar({ ligar = [], desligar = [] }) {
    for (const n of desligar) await this.notificacoes.getByRole('checkbox', { name: new RegExp(n) }).uncheck()
    for (const n of ligar) await this.tipo(n).getByRole('checkbox', { name: new RegExp(n) }).check()
    await this.notificacoes.getByRole('button', { name: 'Salvar notificações' }).click()
  }
}

export class Lembretes {
  constructor(page) { this.page = page }
  horario(nome) { return this.page.getByRole('list', { name: 'Horários' }).getByRole('listitem', { name: new RegExp(nome) }) }
  async novoHorario({ nome, remedio, horarios }) {
    await this.page.getByText('Novo horário').click()
    const f = this.page.locator('#rNew')
    await f.getByLabel('Nome').fill(nome)
    await f.getByLabel('Remédio da lista').selectOption({ label: remedio })
    await f.getByLabel('Horários fixos').fill(horarios)
    await f.getByRole('button', { name: 'Criar' }).click()
  }
}

export class Estoque {
  constructor(page) {
    this.page = page
    this.compras = page.getByRole('list', { name: 'Pra comprar' })
  }
  naLista(nome) { return this.compras.getByRole('listitem', { name: nome }) }
  item(grupo, nome) { return this.page.getByRole('list', { name: grupo }).getByRole('listitem', { name: nome }) }
  async contar(grupo, nome, { qtd, porDia }) {
    const it = this.item(grupo, nome)
    await it.getByText(/contar/).click()
    const f = it.getByRole('form', { name: 'Contar ' + nome })
    await f.getByLabel('Quanto tem agora').fill(String(qtd))
    if (porDia != null) await f.getByLabel('Gasta por dia').fill(String(porDia))
    await f.getByRole('button', { name: 'salvar contagem' }).click()
  }
  async cadastrar({ nome, tipo, qtd, unidade, porDia }) {
    const f = this.page.getByRole('form', { name: 'Novo item de estoque' })
    await f.getByLabel('Nome').fill(nome)
    await f.getByLabel('Tipo').selectOption(tipo)
    await f.getByLabel('Quanto tem').fill(String(qtd))
    await f.getByLabel('Unidade').fill(unidade)
    await f.getByLabel('Gasta por dia').fill(String(porDia))
    await f.getByRole('button', { name: 'Adicionar ao estoque' }).click()
  }
}
