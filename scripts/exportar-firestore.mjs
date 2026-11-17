// Gera exports/odin-export-AAAA-MM-DD_HHhMM.json a partir do Firebase (mesmo formato do export do cockpit),
// pra o scripts/publicar.mjs anonimizar e montar o site público.
// Precisa de credencial do Google (GOOGLE_APPLICATION_CREDENTIALS) com acesso ao projeto odin-cockpit.
// Uso: npm ci --prefix functions && node scripts/exportar-firestore.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const require = createRequire(path.join(ROOT, 'functions/package.json'));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

initializeApp({ projectId: 'odin-cockpit', storageBucket: 'odin-cockpit.firebasestorage.app' });
const db = getFirestore(), bucket = getStorage().bucket();

// só o que é do cockpit; acesso, tokens, lembretes e registros da rotina (com e-mails) ficam de fora
const COLS = ['exams', 'events', 'analyses', 'meds', 'prevent', 'vitals', 'photos', 'foods'];
const out = { exportedAt: new Date().toISOString() };
for (const c of COLS) out[c] = (await db.collection(c).get()).docs.map(d => ({ id: d.id, ...d.data() }));
const meta = await db.collection('meta').get();
const st = meta.docs.find(d => d.id === 'status'), gl = meta.docs.find(d => d.id === 'goals');
out.updatedAt = st ? st.data().updatedAt || null : null;
out.goals = gl ? { water_ml: gl.data().water_ml || null, kcal: gl.data().kcal || null } : null;

let ok = 0, miss = 0;
for (const p of out.photos) {
  if (p.video || !p.assetId) continue;
  try {
    const f = bucket.file('blobs/' + p.assetId);
    const [buf] = await f.download(); const [md] = await f.getMetadata();
    p.dataUrl = `data:${md.contentType || 'image/jpeg'};base64,${buf.toString('base64')}`; ok++;
  } catch { miss++; }
}

const now = new Date(Date.now() - 3 * 3600e3); // horário de Brasília
const stamp = now.toISOString().slice(0, 10) + '_' + now.toISOString().slice(11, 13) + 'h' + now.toISOString().slice(14, 16);
fs.mkdirSync(path.join(ROOT, 'exports'), { recursive: true });
const file = path.join(ROOT, 'exports', `odin-export-${stamp}.json`);
fs.writeFileSync(file, JSON.stringify(out));
console.log(`Export: ${file} · ${COLS.map(c => `${c} ${out[c].length}`).join(', ')} · fotos baixadas ${ok}${miss ? `, sem arquivo ${miss}` : ''}`);
