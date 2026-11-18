#!/usr/bin/env node
// Conferência em produção, só leitura: abre o app no ar (login e modo teste) e o site público
// no Chrome (computador) e no Safari simulando iPhone. Procura erro de JavaScript, menu fora do lugar
// e tela estourando pro lado. Não loga nem grava nada no Odin real.
// Uso: npm run producao:conferir   (também roda no fim do npm run deploy:verificar)
import { chromium, webkit, devices } from 'playwright';

const APP = 'https://odin-cockpit.web.app/';
const ALVOS = [
  { nome: 'app · tela de login', url: APP, login: true },
  { nome: 'app · modo teste (Hoje)', url: APP + 'teste/?as=admin%40teste.com#hoje', menu: 5 },
  { nome: 'app · modo teste (Registrar)', url: APP + 'teste/?as=edita%40teste.com#registrar', menu: 5 },
  { nome: 'site público (Hoje)', url: 'https://elizcarvalho.github.io/odin-cockpit/', menu: 4 },
  { nome: 'site público (Medicamentos)', url: 'https://elizcarvalho.github.io/odin-cockpit/#remedios', menu: 4 }
];
const MOTORES = [
  { nome: 'iPhone/Safari', motor: webkit, ctx: devices['iPhone 15'] },
  { nome: 'computador/Chrome', motor: chromium, ctx: { viewport: { width: 1440, height: 900 } } }
];
const ignorar = /fonts\.g|favicon|Failed to load resource|ERR_|net::/;

let falhas = 0;
for (const m of MOTORES) {
  const browser = await m.motor.launch();
  for (const a of ALVOS) {
    const page = await browser.newPage(m.ctx);
    const erros = [];
    page.on('pageerror', e => erros.push('JS: ' + e.message));
    page.on('console', c => { if (c.type() === 'error' && !ignorar.test(c.text())) erros.push('console: ' + c.text()); });
    try {
      await page.goto(a.url, { waitUntil: 'load', timeout: 30000 });
      if (a.login) await page.getByRole('button', { name: /Entrar com Google/i }).waitFor({ timeout: 15000 });
      else await page.getByRole('tablist', { name: 'Seções' }).waitFor({ timeout: 15000 });
      await page.waitForTimeout(800);
      const r = await page.evaluate(() => {
        const nav = document.querySelector('.tabs'), b = nav && nav.getBoundingClientRect();
        return { sobra: document.scrollingElement.scrollWidth - innerWidth, secoes: nav ? [...nav.querySelectorAll('.tab')].filter(t => t.offsetParent).length : 0, fundo: b ? Math.round(innerHeight - b.bottom) : null, topo: b ? Math.round(b.top) : null, celular: innerWidth <= 760 };
      });
      if (r.sobra > 1) erros.push(`tela estoura ${r.sobra}px pro lado`);
      if (a.menu && r.secoes !== a.menu) erros.push(`menu com ${r.secoes} seções (esperado ${a.menu})`);
      if (a.menu && r.celular && Math.abs(r.fundo) > 1) erros.push(`menu não está colado embaixo (sobra ${r.fundo}px)`);
      if (a.menu && !r.celular && r.topo > 200) erros.push('menu não está no topo');
    } catch (e) { erros.push('não abriu: ' + e.message.split('\n')[0]); }
    console.log(`${erros.length ? '✗' : '✓'} ${m.nome} · ${a.nome}${erros.length ? '\n    ' + erros.join('\n    ') : ''}`);
    falhas += erros.length ? 1 : 0;
    await page.close();
  }
  await browser.close();
}
if (falhas) { console.error(`\n✗ produção: ${falhas} tela(s) com problema`); process.exit(1); }
console.log('\n✓ produção conferida no iPhone e no computador');
