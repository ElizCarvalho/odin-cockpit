// "Mundo" de cada cenário: um navegador com o app montado (app/public), Firebase falso e os dados de tests/seed.mjs.
import { setWorldConstructor, BeforeAll, AfterAll, Before, After, setDefaultTimeout, World } from '@cucumber/cucumber';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { SEED } from '../../tests/seed.mjs';
import { Navegacao, Hoje, Registrar, Historico, Medicamentos, Admin, Lembretes } from './paginas.mjs';

setDefaultTimeout(30_000);
const root = new URL('../..', import.meta.url).pathname;
const pub = join(root, 'app/public');
const fake = readFileSync(join(root, 'tests/fakefb.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let server, base, browser;

export const PAPEL = { admin: 'admin@teste.com', 'quem edita': 'edita@teste.com', 'quem só vê': 've@teste.com' };
export const TELA = { celular: 390, computador: 1440 };

BeforeAll(async () => {
  if (!existsSync(join(pub, 'index.html'))) throw new Error('app não montado: rode npm run app:build');
  server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = join(pub, p === '/' ? 'index.html' : p);
    if (!f.startsWith(pub) || !existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  }).listen(0);
  base = `http://localhost:${server.address().port}`;
  browser = await chromium.launch();
});
AfterAll(async () => { await browser?.close(); server?.close(); });

class Mundo extends World {
  // Abre o app como a pessoa do cenário (this.email), no tamanho de tela do cenário (this.largura).
  async abrir({ hash = '#hoje' } = {}) {
    if (this.page) await this.page.close()
    this.page = await browser.newPage({ viewport: { width: this.largura, height: 900 } })
    this.erros = []; this.dialogos = []
    this.page.on('pageerror', e => this.erros.push(String(e)))
    this.page.on('dialog', d => { this.dialogos.push(d.message()); d.dismiss() })
    await this.page.route('**/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
    await this.page.addInitScript(`window.ODIN_SEED = ${JSON.stringify(SEED)};\n${fake}`)
    await this.page.goto(`${base}/?as=${encodeURIComponent(this.email)}${hash}`)
    await this.page.waitForFunction(() => window.ODIN_FB && document.body.classList.contains('app') && document.querySelector('.tab[data-sec=hoje]'))
    this.nav = new Navegacao(this.page); this.hoje = new Hoje(this.page); this.registrar = new Registrar(this.page)
    this.historico = new Historico(this.page); this.medicamentos = new Medicamentos(this.page); this.admin = new Admin(this.page); this.lembretes = new Lembretes(this.page)
  }
}
setWorldConstructor(Mundo);

Before(function () { this.largura = TELA.celular; this.email = PAPEL.admin; });
After(async function ({ result }) {
  if (this.page) {
    if (result?.status === 'FAILED') this.attach(await this.page.screenshot(), 'image/png');
    else if (this.erros.length) throw new Error('erro de JavaScript na página: ' + this.erros[0]);
    await this.page.close();
  }
});
