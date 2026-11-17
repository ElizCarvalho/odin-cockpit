// Monta o app (Firebase Hosting) a partir do cockpit: artifact/index.html + app/src + app/static -> app/public
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { firebaseConfig, vapidKey } from '../app/firebase-config.js';

const root = new URL('..', import.meta.url).pathname;
const out = root + 'app/public/';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(root + 'app/static', out, { recursive: true });
cpSync(root + 'app/src', out, { recursive: true });
writeFileSync(out + 'config.js', `self.ODIN_FIREBASE = ${JSON.stringify({ config: firebaseConfig, vapidKey })};\n`);

let h = readFileSync(root + 'artifact/index.html', 'utf8');
const swap = (from, to) => { if (!h.includes(from)) throw new Error('não achei no cockpit: ' + from.slice(0, 80)); h = h.replace(from, to); };
const V = '10.14.1', G = `https://www.gstatic.com/firebasejs/${V}/`;

swap('<title>Odin - Cockpit</title>', `<title>Odin - Cockpit</title>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" href="/icon-192.png">
<meta name="theme-color" content="#2b6c7d">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Odin">`);
swap('<button class="tab" role="tab" data-tab="exames">', '<button class="tab" role="tab" data-tab="rotina">Rotina</button>\n    <button class="tab" role="tab" data-tab="exames">');
swap('\n  <p class="note">Esta página organiza', '\n  <div class="panel" id="p-rotina" role="tabpanel" hidden></div>\n  <div class="panel" id="p-admin" role="tabpanel" hidden></div>\n\n  <p class="note">Esta página organiza');
swap("const TABS = ['painel',", "const TABS = ['painel','rotina',");
swap("'linha'];", "'linha','admin'];");
swap('<button class="tab" role="tab" data-tab="linha">Linha do tempo</button>', '<button class="tab" role="tab" data-tab="linha">Linha do tempo</button>\n    <button class="tab" role="tab" data-tab="admin" hidden>Admin</button>');
swap('renderPhotos(); renderUpdated(); }', 'renderPhotos(); renderUpdated(); if (window.renderRotina) renderRotina(); }');
swap(": '/_blob/' + encodeURIComponent(id); }", ': blobUrl(id); }');
swap("await fetch('/_blob/' + encodeURIComponent(p.assetId))", 'await fetch(await blobUrlAsync(p.assetId))');
const libs = ['app', 'auth', 'firestore', 'storage', 'functions', 'messaging'].map(m => `<script src="${G}firebase-${m}-compat.js"></script>`).join('\n');
swap('<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>',
  `<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>\n${libs}\n<script src="/config.js"></script>\n<script src="/shim.js"></script>`);
const end = h.lastIndexOf('</body>');
h = h.slice(0, end) + '<script src="/rotina.js"></script>\n' + h.slice(end);
if (h.includes('/_blob/')) throw new Error('sobrou /_blob/ no app');
writeFileSync(out + 'index.html', h);
console.log('app montado em app/public');
