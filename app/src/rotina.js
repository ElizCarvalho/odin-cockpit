/* Aba Rotina: horários, notificações push e resposta rápida que vira registro no cockpit. */
(function () {
  const css = document.createElement('style');
  css.textContent = `#p-rotina .rN{display:block}#p-rotina .vform > .row{grid-column:1/-1}#p-rotina .rN .vform{margin-top:4px}
    #p-rotina input[type=email]{font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px}
    #p-rotina .rFocus{box-shadow:0 0 0 2px var(--accent);border-radius:10px;padding:10px}
    #p-rotina label.chk{display:flex;gap:6px;align-items:center;align-self:center}
    #p-rotina details summary{cursor:pointer;font-weight:600;color:var(--accent)}`;
  document.head.appendChild(css);
  const KIND = {
    med: { e: '💊', t: 'Remédio' }, agua: { e: '💧', t: 'Água' }, comida: { e: '🍽', t: 'Comida' },
    decubito: { e: '🔄', t: 'Troca de decúbito' }, temp: { e: '🌡', t: 'Temperatura' }, outro: { e: '🐶', t: 'Outro' }
  };
  let scheds = [], notifs = [], logs = [], acl = [], fb = null, freeKind = null, impMsg = '';
  document.addEventListener('focusout', () => setTimeout(() => { if (render.dirty) { render.dirty = false; render(); } }, 300));
  const focusId = new URLSearchParams(location.search).get('n');
  const hhmm = () => new Date().toTimeString().slice(0, 5);
  const daysAgo = n => new Date(Date.now() - n * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const me = () => (window.ODIN_USER && window.ODIN_USER.email) || '';

  /* ---------- Ativar push neste aparelho ---------- */
  async function enablePush(btn) {
    const out = document.getElementById('rPushMsg');
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (/iPhone|iPad/.test(navigator.userAgent) && !standalone) {
      out.textContent = 'No iPhone, primeiro adicione o app à Tela de Início (Safari → Compartilhar → Adicionar à Tela de Início) e abra por lá.';
      return;
    }
    if (!('Notification' in window) || !firebase.messaging.isSupported()) { out.textContent = 'Este navegador não recebe notificações.'; return; }
    btn.disabled = true;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('permissão negada nas configurações do aparelho');
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await firebase.messaging().getToken({ vapidKey: fb.vapidKey, serviceWorkerRegistration: reg });
      await fb.fs.collection('tokens').doc(token).set({ email: me(), ua: navigator.userAgent.slice(0, 160), at: Date.now() });
      localStorage.setItem('odinPush', '1');
      out.textContent = 'Pronto: este aparelho vai receber os lembretes.';
    } catch (e) { out.textContent = 'Não consegui ativar: ' + (e.message || e.code); }
    finally { btn.disabled = false; }
  }

  /* ---------- Registrar a resposta ---------- */
  async function answer(n, form, skipped) {
    const t = form ? (form.querySelector('[name=time]').value || hhmm()) : hhmm();
    const note = form ? form.querySelector('[name=note]')?.value.trim() || '' : '';
    const base = { date: n.date, time: t, source: 'rotina', createdAt: Date.now(), by: me() };
    if (!skipped) {
      if (n.kind === 'agua') {
        const ml = parseFloat(form.querySelector('[name=v]').value.replace(',', '.'));
        if (!(ml > 0)) throw new Error('quantos mL?');
        const coco = form.querySelector('[name=coco]')?.checked;
        await db.collection('vitals').add({ ...base, water_ml: ml, note: [coco ? 'água de coco' : '', note].filter(Boolean).join(' · ') });
      } else if (n.kind === 'comida') {
        const g = parseFloat(form.querySelector('[name=v]').value.replace(',', '.'));
        if (!(g > 0)) throw new Error('quantos gramas?');
        await db.collection('vitals').add({ ...base, food_g: g, food: true, note });
      } else if (n.kind === 'temp') {
        const c = parseFloat(form.querySelector('[name=v]').value.replace(',', '.'));
        if (!(c > 30 && c < 45)) throw new Error('temperatura em °C, ex.: 38,4');
        await db.collection('vitals').add({ ...base, temp: c, note });
      } else {
        const side = form?.querySelector('[name=side]')?.value || '';
        await fb.fs.collection('rotina_log').add({ ...base, kind: n.kind, label: n.label, medId: n.medId || null, side, note, status: 'done' });
      }
    } else {
      await fb.fs.collection('rotina_log').add({ ...base, kind: n.kind, label: n.label, medId: n.medId || null, note, status: 'skipped' });
    }
    if (n.id) await fb.fs.collection('notifs').doc(n.id).update({ status: skipped ? 'skipped' : 'done', doneAt: Date.now(), by: me() });
  }

  function entryForm(n) {
    const time = `<label>Hora<input type="time" name="time" value="${hhmm()}"></label>`;
    const note = `<label>Obs.<input type="text" name="note" placeholder="opcional"></label>`;
    let f = '';
    if (n.kind === 'agua') f = `<label>Água (mL)<input type="text" name="v" inputmode="decimal" required></label><label class="chk"><input type="checkbox" name="coco"> água de coco</label>`;
    else if (n.kind === 'comida') f = `<label>Comida (g)<input type="text" name="v" inputmode="decimal" required></label>`;
    else if (n.kind === 'temp') f = `<label>Temperatura (°C)<input type="text" name="v" inputmode="decimal" required></label>`;
    else if (n.kind === 'decubito') f = `<label>Posição<select name="side"><option>lado esquerdo</option><option>lado direito</option><option>esfinge</option><option>em pé / andando</option></select></label>`;
    const ok = n.kind === 'med' ? 'Dei ✓' : 'Salvar';
    return `<form class="vform rForm" data-n="${esc(n.id || '')}">${f}${time}${note}
      <div class="row"><button type="submit">${ok}</button>${n.id ? '<button type="button" class="ghost" data-skip>Pulei</button>' : ''}</div></form>`;
  }

  /* ---------- Render ---------- */
  function render() {
    const host = document.getElementById('p-rotina');
    if (!host || host.hidden || !fb) return;
    const ae = document.activeElement;
    if (ae && host.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) { render.dirty = true; return; }
    const openK = new Set([...host.querySelectorAll('details[open]')].map(d => d.dataset.k));
    const pend = notifs.filter(n => n.status === 'pending').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const today = todayIso();
    const done = [
      ...logs.map(l => ({ ...l, src: 'log' })),
      ...vitals.filter(v => v.source === 'rotina' && v.date >= daysAgo(1)).map(v => ({ ...v, src: 'v' }))
    ].filter(x => x.date >= daysAgo(1)).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const vtxt = v => v.water_ml ? `💧 ${fmt(v.water_ml)} mL` : v.food_g ? `🍽 ${fmt(v.food_g)} g` : v.temp ? `🌡 ${fmt(v.temp)} °C` : '';
    const ltxt = l => `${(KIND[l.kind] || KIND.outro).e} ${esc(l.label || (KIND[l.kind] || KIND.outro).t)}${l.side ? ' · ' + esc(l.side) : ''}${l.status === 'skipped' ? ' <span class="pill lo">pulou</span>' : ''}`;
    const isOn = localStorage.getItem('odinPush') === '1';

    host.innerHTML = `
    <section class="card">
      <div class="row between"><h2>Agora</h2><span class="pill">${pend.length ? pend.length + ' pendente' + (pend.length > 1 ? 's' : '') : 'nada pendente'}</span></div>
      <div class="list" style="margin-top:8px">${pend.map(n => `
        <div class="item rN${n.id === focusId ? ' rFocus' : ''}" id="rn-${esc(n.id)}">
          <div class="row between"><b>${(KIND[n.kind] || KIND.outro).e} ${esc(n.label || (KIND[n.kind] || KIND.outro).t)}</b>
          <span class="muted">${n.date === today ? '' : dm(n.date) + ' '}${esc(n.time)}${n.renotified ? ' · avisado 2x' : ''}</span></div>
          ${entryForm(n)}
        </div>`).join('') || '<p class="muted">Quando chegar a hora de algo, aparece aqui pra você marcar.</p>'}</div>
      <details data-k="free" style="margin-top:10px"><summary>Registrar fora de hora</summary>
        <div class="row" style="margin-top:8px">${Object.entries(KIND).filter(([k]) => k !== 'outro').map(([k, v]) => `<button type="button" class="ghost tiny" data-free="${k}">${v.e} ${v.t}</button>`).join('')}</div>
        <div id="rFree">${freeKind ? entryForm({ kind: freeKind, label: KIND[freeKind].t }).replace('data-n=""', `data-n="" data-kind="${freeKind}"`) : ''}</div>
      </details>
    </section>

    <section class="card">
      <h2>Últimas 48 h</h2>
      <div class="list" style="margin-top:6px">${done.slice(0, 40).map(x => `<div class="item row between"><span>${x.src === 'v' ? vtxt(x) + (x.note ? ' · ' + esc(x.note) : '') : ltxt(x)}</span><span class="muted">${x.date === today ? '' : dm(x.date) + ' '}${esc(x.time || '')}</span></div>`).join('') || '<p class="muted">Nada ainda.</p>'}</div>
    </section>

    <section class="card">
      <h2>Horários</h2>
      <div class="list" style="margin-top:6px">${scheds.sort((a, b) => (a.kind + a.label).localeCompare(b.kind + b.label)).map(s => `
        <div class="item row between">
          <span>${(KIND[s.kind] || KIND.outro).e} <b>${esc(s.label)}</b><br><span class="muted">${s.every ? `a cada ${s.every >= 60 && s.every % 60 === 0 ? s.every / 60 + ' h' : s.every + ' min'}, das ${esc(s.from)} às ${esc(s.to)}` : esc((s.times || []).join(' · '))}${s.until ? ' · até ' + dm(s.until) : ''}</span></span>
          <span class="row"><button class="ghost tiny" data-tog="${esc(s.id)}">${s.active ? 'Pausar' : 'Ativar'}</button><button class="tiny danger" data-del="${esc(s.id)}">Apagar</button></span>
        </div>`).join('') || '<p class="muted">Nenhum horário ainda.</p>'}</div>
      <details data-k="new" style="margin-top:10px"><summary>Novo horário</summary>
        <form id="rNew" class="vform">
          <label>Tipo<select name="kind">${Object.entries(KIND).map(([k, v]) => `<option value="${k}">${v.e} ${v.t}</option>`).join('')}</select></label>
          <label>Nome<input type="text" name="label" placeholder="ex.: Gardenal 1 comp." required></label>
          <label>Remédio da lista<select name="medId"><option value="">—</option>${meds.filter(m => !m.end || m.end >= today).map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></label>
          <label>Horários fixos<input type="text" name="times" placeholder="08:00, 20:00"></label>
          <label>ou a cada (min)<input type="text" name="every" inputmode="numeric" placeholder="120"></label>
          <label>das<input type="time" name="from" value="08:00"></label>
          <label>até<input type="time" name="to" value="22:00"></label>
          <label>Termina em<input type="date" name="until"></label>
          <div><button type="submit">Criar</button></div>
        </form>
      </details>
    </section>

    <section class="card">
      <h2>Notificações neste aparelho</h2>
      <p class="note" style="margin:4px 0 8px">${isOn ? 'Ativadas aqui.' : 'Ainda não ativadas aqui.'} Se não responder em ${15} min, o lembrete chega de novo.</p>
      <button id="rPush" class="${isOn ? 'ghost' : ''}">${isOn ? 'Ativar de novo' : 'Ativar notificações'}</button>
      <p class="muted" id="rPushMsg" style="margin-top:6px"></p>
    </section>

    <section class="card">
      <h2>Acesso</h2>
      <p class="note" style="margin:4px 0 8px">Quem pode ver, registrar e receber lembretes (conta Google).</p>
      <div class="list">${acl.map(e => `<div class="item row between"><span>${esc(e)}</span>${e !== me() ? `<button class="tiny danger" data-rmacl="${esc(e)}">Tirar</button>` : '<span class="muted">você</span>'}</div>`).join('')}</div>
      <form id="rAcl" class="row" style="margin-top:8px"><input name="email" type="email" placeholder="email@gmail.com" required style="flex:1"><button type="submit">Adicionar</button></form>
    </section>

    <section class="card"${exams.length ? '' : ' style="border-color:var(--accent)"'}>
      <details data-k="imp"${exams.length ? '' : ' open'}><summary>Trazer dados do cockpit antigo</summary>
        <p class="note" style="margin:6px 0 8px">No cockpit antigo (claude.ai), use <b>Exportar para o site</b> no Painel. Depois escolha aqui o arquivo <code>odin-export-….json</code> que foi pro Downloads. Pode repetir: o que já existe é atualizado, nada é duplicado.</p>
        <input type="file" id="rImp" accept=".json,application/json">
        <p class="muted" id="rImpMsg" style="margin-top:6px">${esc(impMsg)}</p>
      </details>
    </section>`;
    host.querySelectorAll('details').forEach(d => { if (openK.has(d.dataset.k)) d.open = true; });
    if (focusId) { const el = document.getElementById('rn-' + focusId); if (el && !render.scrolled) { render.scrolled = true; el.scrollIntoView({ block: 'center' }); } }
  }
  window.renderRotina = render;

  /* ---------- Importar o export do cockpit antigo ---------- */
  async function importExport(file) {
    const msg = t => { impMsg = t; const el = document.getElementById('rImpMsg'); if (el) el.textContent = t; };
    try {
      msg('Lendo o arquivo…');
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.exams) || !Array.isArray(d.photos)) throw new Error('não parece um export do cockpit');
      let n = 0;
      for (const col of ['exams', 'events', 'analyses', 'meds', 'prevent', 'vitals']) {
        const list = d[col] || [];
        for (let i = 0; i < list.length; i += 400) {
          const b = fb.fs.batch();
          for (const x of list.slice(i, i + 400)) { const { id, ...rest } = x; b.set(fb.fs.collection(col).doc(String(id || fb.fs.collection(col).doc().id)), rest); n++; }
          await b.commit();
        }
        msg(`Dados: ${n} registros…`);
      }
      let ok = 0, sem = 0;
      for (const [i, p] of d.photos.entries()) {
        const { id, dataUrl, ...rest } = p;
        if (dataUrl && rest.assetId) {
          const blob = await (await fetch(dataUrl)).blob();
          await fb.st.ref('blobs/' + rest.assetId).put(blob, { contentType: blob.type || 'image/jpeg' });
          ok++;
        } else sem++;
        await fb.fs.collection('photos').doc(String(id)).set(rest);
        msg(`Fotos: ${i + 1} de ${d.photos.length}…`);
      }
      await fb.fs.collection('meta').doc('status').set({ updatedAt: d.updatedAt || Date.now() });
      msg(`Pronto: ${n} registros e ${ok} fotos.` + (sem ? ` ${sem} vídeo(s)/foto(s) sem arquivo no export: dá pra subir de novo na aba Fotos.` : ''));
    } catch (e) { msg('Não consegui importar: ' + (e.message || e.code)); }
  }
  document.addEventListener('change', ev => { if (ev.target.id === 'rImp' && ev.target.files[0]) importExport(ev.target.files[0]); });

  /* ---------- Eventos ---------- */
  const say = (el, msg) => { let p = el.querySelector('.rMsg'); if (!p) { p = document.createElement('p'); p.className = 'muted rMsg'; el.appendChild(p); } p.textContent = msg; };
  document.addEventListener('submit', async ev => {
    const f = ev.target;
    if (f.classList.contains('rForm')) {
      ev.preventDefault();
      const n = notifs.find(x => x.id === f.dataset.n) || { kind: f.dataset.kind, label: (KIND[f.dataset.kind] || KIND.outro).t, date: todayIso() };
      const b = f.querySelector('[type=submit]'); b.disabled = true;
      try { await answer(n, f, false); if (!f.dataset.n) { say(f, 'Salvo ✓'); f.reset(); } }
      catch (e) { say(f, 'Não salvou: ' + (e.message || e.code)); }
      finally { b.disabled = false; }
    }
    if (f.id === 'rNew') {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const times = (d.times || '').split(/[,; ]+/).map(x => x.trim()).filter(x => /^\d{1,2}:\d{2}$/.test(x)).map(x => x.padStart(5, '0'));
      const every = parseInt(d.every, 10) || null;
      if (!times.length && !every) { say(f, 'Diga os horários (08:00, 20:00) ou o intervalo em minutos.'); return; }
      await fb.fs.collection('schedule').add({ kind: d.kind, label: d.label.trim(), medId: d.medId || null, times, every, from: d.from || '00:00', to: d.to || '23:59',
        until: d.until || null, active: true, createdAt: Date.now(), by: me() });
    }
    if (f.id === 'rAcl') {
      ev.preventDefault();
      const e = f.email.value.trim().toLowerCase();
      if (e) await fb.fs.collection('acl').doc('users').update({ emails: firebase.firestore.FieldValue.arrayUnion(e) }).catch(x => say(f, x.message));
    }
  });
  document.addEventListener('click', async ev => {
    const t = ev.target;
    if (t.matches('[data-skip]')) {
      const f = t.closest('form'); const n = notifs.find(x => x.id === f.dataset.n);
      if (n) { t.disabled = true; await answer(n, f, true).catch(e => say(f, e.message)); }
    }
    if (t.matches('[data-free]')) {
      freeKind = t.dataset.free; render();
    }
    if (t.matches('[data-tog]')) { const s = scheds.find(x => x.id === t.dataset.tog); if (s) await fb.fs.collection('schedule').doc(s.id).update({ active: !s.active }); }
    if (t.matches('[data-del]')) { const s = scheds.find(x => x.id === t.dataset.del); if (s && confirm(`Apagar o horário "${s.label}"?`)) await fb.fs.collection('schedule').doc(s.id).delete(); }
    if (t.matches('[data-rmacl]')) { if (confirm(`Tirar o acesso de ${t.dataset.rmacl}?`)) await fb.fs.collection('acl').doc('users').update({ emails: firebase.firestore.FieldValue.arrayRemove(t.dataset.rmacl) }); }
    if (t.id === 'rPush') enablePush(t);
  });

  /* ---------- Dados ---------- */
  window.ODIN_READY.then(() => {
    fb = window.ODIN_FB;
    const rr = () => { if (typeof scheduleRender === 'function') scheduleRender(); };
    fb.fs.collection('schedule').onSnapshot(s => { scheds = s.docs.map(d => ({ id: d.id, ...d.data() })); rr(); });
    fb.fs.collection('notifs').where('date', '>=', daysAgo(2)).onSnapshot(s => { notifs = s.docs.map(d => ({ id: d.id, ...d.data() })); rr(); updateBadge(); });
    fb.fs.collection('rotina_log').where('date', '>=', daysAgo(1)).onSnapshot(s => { logs = s.docs.map(d => ({ id: d.id, ...d.data() })); rr(); });
    fb.fs.collection('acl').doc('users').onSnapshot(s => { acl = (s.data() && s.data().emails) || []; rr(); });
    if (localStorage.getItem('odinPush') === '1' && Notification.permission === 'granted') {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').then(reg =>
        firebase.messaging().getToken({ vapidKey: fb.vapidKey, serviceWorkerRegistration: reg })
          .then(tok => fb.fs.collection('tokens').doc(tok).set({ email: me(), ua: navigator.userAgent.slice(0, 160), at: Date.now() }, { merge: true }))).catch(() => {});
    }
    try { firebase.messaging().onMessage(() => {}); } catch {}
  });
  function updateBadge() {
    const n = notifs.filter(x => x.status === 'pending').length;
    const tab = document.querySelector('.tab[data-tab="rotina"]');
    if (tab) tab.textContent = n ? `Rotina (${n})` : 'Rotina';
    try { if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch {}
  }
})();
