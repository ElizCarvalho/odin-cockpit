import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 2 });
const db = getFirestore();
const APP_URL = 'https://odin-cockpit.web.app';
const TZ = 'America/Sao_Paulo';
const RENOTIFY_MIN = 15;

const KIND = {
  med: { emoji: '💊', title: 'Remédio' },
  agua: { emoji: '💧', title: 'Água' },
  comida: { emoji: '🍽', title: 'Comida' },
  decubito: { emoji: '🔄', title: 'Troca de decúbito' },
  temp: { emoji: '🌡', title: 'Temperatura' },
  compra: { emoji: '🛒', title: 'Comprar remédio' },
  consulta: { emoji: '📅', title: 'Compromisso' },
  outro: { emoji: '🐶', title: 'Odin' }
};

function nowSP(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}
const mins = hm => { const [h, m] = String(hm || '').split(':').map(Number); return h * 60 + m; };
const dayNum = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
const dayIso = n => new Date(n * 864e5).toISOString().slice(0, 10);
const dmBr = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7);

// Estoque: qty unidades em countedAt (já descontada a dose daquele dia), gastando perDay por dia.
// Devolve o último dia coberto pelo estoque, ou null se não há como calcular.
export function stockEnd(stock) {
  if (!stock || !(stock.qty >= 0) || !(stock.perDay > 0) || !stock.countedAt) return null;
  return dayIso(dayNum(stock.countedAt) + Math.floor(stock.qty / stock.perDay));
}

export function isDue(s, date, hm) {
  if (!s.active) return false;
  if (s.from_date && date < s.from_date) return false;
  if (s.until && date > s.until) return false;
  if (Array.isArray(s.days) && s.days.length && !s.days.includes(new Date(dayNum(date) * 864e5).getUTCDay())) return false;
  const ed = Number(s.everyDays);
  if (ed > 1) { const diff = dayNum(date) - dayNum(s.anchor || date); if (diff < 0 || diff % ed !== 0) return false; }
  if (Array.isArray(s.times) && s.times.includes(hm)) return true;
  const every = Number(s.every);
  if (every > 0) {
    const t = mins(hm), a = mins(s.from || '00:00'), b = mins(s.to || '23:59');
    if (t >= a && t <= b && (t - a) % every === 0) return true;
  }
  return false;
}

/* ---------- Pushover: alerta crítico no iPhone (passa por cima do silencioso) ---------- */
// Nível por tipo, escolhido no Admin: desligado · normal · critico (prioridade 1) · insistente (2: repete até tocar em "Acknowledge").
export const PUSHOVER_PADRAO = { med: 'critico', consulta: 'critico', decubito: 'normal', agua: 'normal', compra: 'normal', temp: 'normal', comida: 'normal', outro: 'normal' };
export function pushoverPrioridade(kind, cfg = {}) {
  const lv = (cfg.pushover || {})[kind] || PUSHOVER_PADRAO[kind] || 'normal';
  const P = { desligado: null, normal: 0, critico: 1, insistente: 2 };
  return lv in P ? P[lv] : 0;
}
export function pushoverMensagem(notifId, n, again, prio) {
  const k = KIND[n.kind] || KIND.outro;
  const m = {
    title: `${k.emoji} ${again ? 'Ainda pendente: ' : ''}${k.title} · ${n.time}`,
    message: Array.isArray(n.items) && n.items.length ? n.items.map(i => i.name + (i.dose ? ' ' + i.dose : '')).join(' · ') : (n.label || k.title),
    priority: prio, url: `${APP_URL}/?n=${encodeURIComponent(notifId)}#rotina`, url_title: 'Abrir no Cockpit'
  };
  if (prio === 2) Object.assign(m, { retry: 60, expire: 1800, tags: notifId.replace(/[^\w-]/g, '_') }); // repete a cada 1 min por até 30 min
  return m;
}
async function pushover(notifId, n, again, cfg) {
  const token = process.env.PUSHOVER_TOKEN, user = process.env.PUSHOVER_USER;
  if (!token || !user) return;
  const prio = pushoverPrioridade(n.kind || 'outro', cfg);
  if (prio == null) return;
  try {
    const r = await fetch('https://api.pushover.net/1/messages.json', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, user, ...pushoverMensagem(notifId, n, again, prio) }) });
    if (!r.ok) console.error('pushover:', r.status, (await r.text()).slice(0, 200));
    else if (prio === 2) await db.collection('notifs').doc(notifId).set({ pushoverTag: notifId.replace(/[^\w-]/g, '_') }, { merge: true });
  } catch (e) { console.error('pushover:', e.message); }
}
// Respondeu no app (feito/pulei/visto): para o alarme insistente no celular.
async function pararPushover(tag) {
  const token = process.env.PUSHOVER_TOKEN;
  if (!token || !tag) return;
  const r = await fetch(`https://api.pushover.net/1/receipts/cancel_by_tag/${encodeURIComponent(tag)}.json`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
  if (!r.ok) console.error('pushover cancel:', r.status);
}

async function push(notifId, n, again, cfg = {}) {
  await pushover(notifId, n, again, cfg);
  const [toks, acl] = await Promise.all([db.collection('tokens').get(), db.collection('acl').doc('users').get()]);
  const a = acl.data() || {}, emails = a.emails || [], notify = a.notify || {};
  const list = toks.docs.filter(d => { const e = d.data().email; return emails.includes(e) && notify[e] !== false; }).map(d => d.id);
  if (!list.length) return 0;
  const k = KIND[n.kind] || KIND.outro;
  const res = await getMessaging().sendEachForMulticast({
    tokens: list,
    data: { notifId, kind: n.kind || 'outro' },
    webpush: {
      notification: {
        title: `${k.emoji} ${again ? 'Ainda pendente: ' : ''}${k.title} · ${n.time}`,
        body: Array.isArray(n.items) && n.items.length ? n.items.map(i => i.name + (i.dose ? ' ' + i.dose : '')).join(' · ') : (n.label || k.title),
        icon: `${APP_URL}/icon-192.png`,
        tag: notifId,
        renotify: true
      },
      fcmOptions: { link: `${APP_URL}/?n=${encodeURIComponent(notifId)}#rotina` }
    }
  });
  await Promise.all(res.responses.map((r, i) => {
    const c = r.error && r.error.code;
    if (c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-registration-token') return db.collection('tokens').doc(list[i]).delete();
  }));
  return res.successCount;
}

/* ---------- Decúbito e água: lembretes que dizem o que fazer ---------- */
const LATERAIS = ['lado esquerdo', 'lado direito'];
const isEsternal = s => /esternal|esfinge|bru[çc]os/i.test(s || '');
// Próximo lado: depois de um lateral vem esternal; depois do esternal, o lateral oposto ao último.
export function proximoLado(sides) { // sides: do mais recente pro mais antigo
  const s = sides.filter(x => LATERAIS.includes(x) || isEsternal(x));
  if (!s.length) return 'lado esquerdo';
  if (LATERAIS.includes(s[0])) return 'esternal (de bruços)';
  const lat = s.find(x => LATERAIS.includes(x));
  return lat === 'lado esquerdo' ? 'lado direito' : 'lado esquerdo';
}
async function ladosRecentes(date) {
  const l = await db.collection('rotina_log').where('date', '>=', dayIso(dayNum(date) - 1)).get();
  return l.docs.map(d => d.data()).filter(x => x.kind === 'decubito' && x.status !== 'skipped' && x.side)
    .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))).map(x => x.side);
}
// Água do dia (bebida + água da comida), igual ao cockpit; meta = meta/goals ou 50 mL/kg do último peso.
export function aguaDoDia(vitals, foods) {
  const byId = new Map(foods.map(f => [f.id, f]));
  const match = (note, kind) => foods.find(f => f.kind === kind && f.match && new RegExp(f.match, 'i').test(note || ''));
  let w = 0;
  for (const v of vitals) {
    if (v.water_ml) { const f = byId.get(v.drinkId) || match(v.note, 'bebida') || byId.get('agua'); w += v.water_ml * (f && f.water != null ? f.water : 1); }
    if (v.food_g) { const f = byId.get(v.foodId) || match(v.note, 'comida'); if (f) w += v.food_g * (f.water || 0); }
  }
  return Math.round(w);
}
async function aguaHoje(date) {
  const [v, f, g, ex] = await Promise.all([db.collection('vitals').where('date', '==', date).get(), db.collection('foods').get(), db.doc('meta/goals').get(), db.collection('exams').get()]);
  const water = aguaDoDia(v.docs.map(d => d.data()), f.docs.map(d => ({ id: d.id, ...d.data() })));
  let goal = (g.data() || {}).water_ml || null;
  if (!goal) {
    const w = ex.docs.map(d => d.data()).filter(e => e.params && typeof e.params.peso === 'number').sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).pop();
    if (w) goal = Math.round(w.params.peso * 50 / 10) * 10;
  }
  return { water, goal };
}

export const tick = onSchedule({ schedule: '* * * * *', timeZone: TZ, retryCount: 0, memory: '256MiB' }, async () => {
  const { date, hm } = nowSP();
  const scheds = await db.collection('schedule').where('active', '==', true).get();
  const due = scheds.docs.filter(d => isDue(d.data(), date, hm));
  const meds = due.length || hm === '10:00' ? new Map((await db.collection('meds').get()).docs.map(d => [d.id, d.data()])) : new Map();
  // remédio vale no dia se existe, não está pausado, já começou e não terminou
  const onToday = id => { const m = meds.get(id); return m && !m.paused && (!m.start || m.start <= date) && (!m.end || m.end >= date); };
  const cfg = (await db.doc('meta/notificacoes').get()).data() || {}; // o que a Elis ligou no Admin
  for (const doc of due) {
    const s = doc.data();
    if ((s.kind || 'outro') === 'med' && cfg.med === false) continue;
    if (s.medId && !onToday(s.medId)) continue; // remédio pausado ou fora do período: sem lembrete
    let items = null;
    if (Array.isArray(s.items) && s.items.length) {
      items = s.items.filter(i => !i.medId || onToday(i.medId)).map(i => ({ medId: i.medId || null, name: i.name, dose: i.dose || '' }));
      if (!items.length) continue; // bloco sem nenhum remédio valendo hoje
    }
    const id = `${doc.id}_${date}_${hm.replace(':', '')}`;
    const n = { schedId: doc.id, kind: s.kind || 'outro', label: s.label || '', medId: s.medId || null, items, date, time: hm, status: 'pending', sentAt: Date.now(), renotified: false };
    if (n.kind === 'agua') {
      const a = await aguaHoje(date);
      if (a.goal && a.water >= a.goal) continue; // meta batida: não incomoda
      n.label = a.goal ? `Oferecer água · faltam ${Math.max(0, Math.round((a.goal - a.water) / 10) * 10)} mL (${a.water} de ${a.goal})` : 'Oferecer água';
    }
    if (n.kind === 'decubito') { n.suggest = proximoLado(await ladosRecentes(date)); n.label = `Troca de decúbito · agora: ${n.suggest}`; }
    try { await db.collection('notifs').doc(id).create(n); } catch { continue; } // já criado
    await push(id, n, false, cfg);
  }
  // compromissos agendados (consulta, fisioterapia, coleta…): lembrete X minutos antes
  const appts = await db.collection('events').where('kind', '==', 'consulta').get();
  const nowAbs = dayNum(date) * 1440 + mins(hm);
  for (const doc of appts.docs) {
    const e = doc.data(); if (cfg.consulta === false || !e.remind || !e.date || e.date < date) continue;
    if (dayNum(e.date) * 1440 + mins(e.time || '09:00') - Number(e.remind) !== nowAbs) continue;
    const nid = `appt_${doc.id}`, quando = e.date === date ? 'hoje' : 'amanhã';
    const n = { kind: 'consulta', label: e.text, date, time: hm, status: 'pending', sentAt: Date.now(), renotified: true, note: `${quando}${e.time ? ' às ' + e.time : ''}` };
    try { await db.collection('notifs').doc(nid).create(n); } catch { continue; }
    await push(nid, { ...n, items: [{ name: e.text, dose: '— ' + n.note }] }, false, cfg);
  }
  // estoque: uma vez por dia, avisa quem precisa comprar
  if (hm === '10:00' && cfg.compra !== false) {
    for (const [id, m] of meds) {
      const end = stockEnd(m.stock);
      if (!end || m.paused || (m.end && m.end < date) || (m.end && end >= m.end)) continue;
      const left = dayNum(end) - dayNum(date), lead = Number(m.stock.lead) || 5;
      if (left > lead || m.stock.alertedFor === end) continue;
      const nid = `stock_${id}_${end}`, label = `Comprar ${m.name}`;
      const n = { kind: 'compra', label, medId: id, date, time: hm, status: 'pending', sentAt: Date.now(), renotified: true,
        note: left < 0 ? 'o estoque já acabou' : `o estoque acaba por volta de ${dmBr(end)} (${left} dia${left === 1 ? '' : 's'})` };
      try { await db.collection('notifs').doc(nid).create(n); } catch { continue; }
      await db.collection('meds').doc(id).update({ 'stock.alertedFor': end });
      await push(nid, { ...n, items: [{ name: m.name, dose: '— ' + n.note }] }, false, cfg);
    }
  }
  const limit = Date.now() - RENOTIFY_MIN * 60e3;
  const pend = await db.collection('notifs').where('status', '==', 'pending').get();
  for (const doc of pend.docs) {
    const n = doc.data();
    if (n.renotified || !n.sentAt || n.sentAt > limit) continue;
    await doc.ref.update({ renotified: true });
    await push(doc.id, n, true, cfg);
  }
  try { await publicarSeMudou(); } catch (e) { console.error('publicar site:', e.message); }
});

/* ---------- Site público: publica quando os dados mudam ---------- */
// Coleções que vão pro site público (as mesmas de scripts/exportar-firestore.mjs).
export const PUBLIC_COLS = ['exams', 'events', 'analyses', 'meds', 'prevent', 'vitals', 'photos', 'foods'];
export const isPublicDoc = (col, id) => PUBLIC_COLS.includes(col) || (col === 'meta' && ['goals', 'status'].includes(id));
const QUIET_MS = 3 * 60e3;   // espera 3 min sem mudança (junta várias edições num envio só)
const MIN_GAP_MS = 10 * 60e3; // e no máximo um envio a cada 10 min

// Toda escrita numa coleção pública marca o site como "desatualizado".
export const marcarSitePublico = onDocumentWritten({ document: '{col}/{id}', memory: '256MiB' }, async ev => {
  const { col, id } = ev.params;
  if (col === 'notifs') {
    const a = ev.data?.before?.data(), b = ev.data?.after?.data();
    if (a && b && b.pushoverTag && a.status === 'pending' && b.status !== 'pending') await pararPushover(b.pushoverTag).catch(e => console.error(e.message));
    return;
  }
  if (!isPublicDoc(col, id)) return;
  await db.doc('meta/publico').set({ dirtyAt: Date.now() }, { merge: true });
});

// Chamado pelo tick: se o site está desatualizado e as edições pararam, dispara o Action "Publicar site público".
export function devePublicar(d, now) {
  if (!d || !d.dirtyAt) return false;
  if (d.sentAt && d.sentAt >= d.dirtyAt) return false;
  if (now - d.dirtyAt < QUIET_MS) return false;
  if (d.sentAt && now - d.sentAt < MIN_GAP_MS) return false;
  return true;
}
async function publicarSeMudou() {
  const tok = process.env.GH_DISPATCH_TOKEN;
  if (!tok) return;
  const ref = db.doc('meta/publico'), now = Date.now();
  if (!devePublicar((await ref.get()).data(), now)) return;
  const r = await fetch('https://api.github.com/repos/ElizCarvalho/odin-cockpit/actions/workflows/publicar-site.yml/dispatches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'odin-cockpit' },
    body: JSON.stringify({ ref: 'main' })
  });
  await ref.set({ sentAt: now, lastStatus: r.status }, { merge: true });
  if (!r.ok) console.error('dispatch do site público:', r.status, (await r.text()).slice(0, 200));
}

async function canEdit(email) {
  if (!email) return false;
  const acl = await db.collection('acl').doc('users').get();
  const e = String(email).toLowerCase(), d = acl.exists ? acl.data() : {};
  return (d.emails || []).includes(e) && ['admin', 'edit'].includes((d.roles || {})[e]);
}

// Botão "Testar no celular" do Admin: manda um alerta de teste no nível escolhido.
export const testarAlerta = onCall({ timeoutSeconds: 30, memory: '256MiB' }, async req => {
  const t = req.auth && req.auth.token;
  if (!t || !t.email_verified || !(await canEdit(t.email))) throw new HttpsError('permission-denied', 'sem acesso');
  const token = process.env.PUSHOVER_TOKEN, user = process.env.PUSHOVER_USER;
  if (!token || !user) throw new HttpsError('failed-precondition', 'Pushover não configurado (faltam PUSHOVER_TOKEN/PUSHOVER_USER)');
  const nivel = ['normal', 'critico', 'insistente'].includes(req.data && req.data.nivel) ? req.data.nivel : 'critico';
  const prio = { normal: 0, critico: 1, insistente: 2 }[nivel];
  const msg = pushoverMensagem('teste_' + Date.now(), { kind: 'outro', time: nowSP().hm, label: `Teste de alerta ${nivel} — se tocou, tá funcionando 💛` }, false, prio);
  if (prio === 2) msg.expire = 180; // teste insistente: no máximo 3 min
  const r = await fetch('https://api.pushover.net/1/messages.json', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, user, ...msg }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpsError('internal', 'Pushover recusou: ' + ((j.errors || []).join('; ') || r.status));
  return { ok: true, nivel };
});

// Lê texto/imagens com a IA da Anthropic e devolve o texto da resposta (o app faz o parse do JSON).
export const registrar = onCall({ timeoutSeconds: 120, memory: '512MiB' }, async req => {
  const t = req.auth && req.auth.token;
  if (!t || !t.email_verified || !(await canEdit(t.email))) throw new HttpsError('permission-denied', 'sem acesso');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new HttpsError('failed-precondition', 'IA não configurada (falta ANTHROPIC_API_KEY)');
  const { prompt, images = [] } = req.data || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 200000) throw new HttpsError('invalid-argument', 'prompt inválido');
  const content = [];
  for (const im of images.slice(0, 8)) {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(im || '');
    if (m) content.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
  }
  content.push({ type: 'text', text: prompt });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 8000, messages: [{ role: 'user', content }] })
  });
  const j = await r.json();
  if (!r.ok) throw new HttpsError('internal', (j.error && j.error.message) || 'erro na IA');
  await db.collection('meta').doc('usage').set({ registrar: FieldValue.increment(1), lastAt: Date.now() }, { merge: true });
  return { text: (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('') };
});
