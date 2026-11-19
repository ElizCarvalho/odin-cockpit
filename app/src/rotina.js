/* Aba Rotina: horários, notificações push e resposta rápida que vira registro no cockpit. */
(function () {
  const css = document.createElement('style');
  css.textContent = `.tab[hidden]{display:none!important}.tab{position:relative}.tab .badge{display:inline-block;margin-left:6px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--warn);color:#fff;font-size:11px;font-weight:700;line-height:18px;text-align:center;vertical-align:middle}@media (max-width:760px){.tab .badge{position:absolute;top:2px;right:calc(50% - 24px);margin:0}}.tab .badge[hidden]{display:none}.rt .rItems{grid-column:1/-1;display:grid;gap:6px}.rt .rItems label.chk{align-items:center;gap:8px;font-size:14px;color:var(--ink)}.rt .rItems input{width:20px;height:20px;accent-color:var(--accent)}.rt .rToday{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}.rt .rN{display:block}.rt .vform > .row{grid-column:1/-1}.rt .rN .vform{margin-top:4px}
    .rt input[type=email]{font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px}
    .rt .rFocus{box-shadow:0 0 0 2px var(--accent);border-radius:10px;padding:10px}
    .rt .rMore{grid-column:1/-1}.rt .rMore summary{font-size:13px;font-weight:500;color:var(--muted)}
    #p-admin .nGrp{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px 10px;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin:4px 0}#p-admin .nGrp > label.chk,#p-admin .nGrp > span{grid-column:1/-1}#p-admin #aNotif > label.chk{grid-column:1/-1}#p-admin .aFood{border-top:1px solid var(--line);padding-top:8px;margin-top:8px}#p-admin .aFood .wide{grid-column:1/-1}#p-admin .aRow{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center}#p-admin .aMail{overflow-wrap:anywhere}#p-admin select{width:auto}#p-admin .vform > .row{grid-column:1/-1}#p-admin input[type=email]{font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px}#p-admin label.chk,.rt label.chk{display:flex;gap:6px;align-items:center;align-self:center}
    .rt details summary{cursor:pointer;font-weight:600;color:var(--accent)}`;
  document.head.appendChild(css);
  const KIND = {
    med: { e: '💊', t: 'Remédio' }, agua: { e: '💧', t: 'Água' }, comida: { e: '🍽', t: 'Comida' },
    decubito: { e: '🔄', t: 'Troca de decúbito' }, temp: { e: '🌡', t: 'Temperatura' },
    fezes: { e: '💩', t: 'Fezes' }, urina: { e: '🟡', t: 'Xixi' }, compra: { e: '🛒', t: 'Comprar' }, consulta: { e: '📅', t: 'Compromisso' }, outro: { e: '🐶', t: 'Outro' }
  };
  let ncfg = {}, lateId = null, scheds = [], notifs = [], logs = [], aclDoc = { emails: [], roles: {}, notify: {} }, fb = null, freeKind = null, impMsg = '';
  document.addEventListener('focusout', () => setTimeout(() => { if (render.dirty) { render.dirty = false; render(); } }, 300));
  const focusId = new URLSearchParams(location.search).get('n');
  const hhmm = () => new Date().toTimeString().slice(0, 5);
  const daysAgo = n => new Date(Date.now() - n * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const me = () => (window.ODIN_USER && window.ODIN_USER.email) || '';
  const role = () => (aclDoc.roles || {})[me()] || 'view';
  const canEdit = () => role() === 'admin' || role() === 'edit';
  // ícone: remédio usa o mesmo ícone da aba Medicamentos (forma + medicamento/suplemento); o resto, emoji
  const ic = x => {
    if (Array.isArray(x.items) && x.items.length > 1) return '💊 ';
    if (Array.isArray(x.items) && x.items.length === 1) x = { kind: 'med', medId: x.items[0].medId, label: x.items[0].name };
    if (x.kind !== 'med' || typeof medIcon !== 'function') return (KIND[x.kind] || KIND.outro).e + ' ';
    const first = String(x.label || '').toLowerCase().split(/[\s·(]/)[0];
    const m = meds.find(y => y.id === x.medId) || (first && meds.find(y => (y.name || '').toLowerCase().startsWith(first)));
    return medIcon(m || { name: x.label || '', dose: x.label || '' }, true);
  };
  const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const schedDays = s => Array.isArray(s.days) && s.days.length ? ' · ' + s.days.map(d => DOW[d]).join(', ') : Number(s.everyDays) > 1 ? ` · a cada ${s.everyDays} dias (desde ${dm(s.anchor || '')})` : '';
  const ROLE = { admin: 'Admin', edit: 'Edita', view: 'Só vê' };

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
    const t = form?.querySelector('[name=time]')?.value || hhmm(); // aviso de compra/consulta não tem campo de hora
    const note = form ? form.querySelector('[name=note]')?.value.trim() || '' : '';
    const base = { date: n.date, time: t, source: 'rotina', createdAt: Date.now(), by: me() };
    if (n.kind === 'compra' || n.kind === 'consulta') { // aviso: só marca como visto
      await fb.fs.collection('notifs').doc(n.id).update({ status: 'done', doneAt: Date.now(), by: me() }); return;
    }
    if (Array.isArray(n.items) && n.items.length) {
      // bloco: um registro por remédio, marcado como dado ou pulado
      const given = new Set(form && !skipped ? [...form.querySelectorAll('[name=it]:checked')].map(x => +x.value) : []);
      if (!n.id && !given.size) throw new Error('marque pelo menos um');
      for (const [i, it] of n.items.entries()) {
        if (!n.id && !given.has(i)) continue; // registro avulso: só o que foi dado
        await fb.fs.collection('rotina_log').add({ ...base, kind: 'med', label: it.name + (it.dose ? ' · ' + it.dose : ''), medId: it.medId || null, note, status: given.has(i) ? 'done' : 'skipped', block: n.label || '' });
      }
      const st = given.size === n.items.length ? 'done' : given.size ? 'partial' : 'skipped';
      if (n.id) await fb.fs.collection('notifs').doc(n.id).update({ status: st, doneAt: Date.now(), by: me() });
      return;
    }
    if (!skipped) {
      if (n.kind === 'agua') {
        const ml = parseFloat(form.querySelector('[name=v]').value.replace(',', '.'));
        if (!(ml > 0)) throw new Error('quantos mL?');
        const d = foodById(form.querySelector('[name=fid]')?.value) || foodById('agua');
        await db.collection('vitals').add({ ...base, water_ml: ml, drinkId: d ? d.id : 'agua', note: [d && d.id !== 'agua' ? d.name.toLowerCase() : '', note].filter(Boolean).join(' · ') });
      } else if (n.kind === 'comida') {
        const q = parseFloat(form.querySelector('[name=v]').value.replace(',', '.'));
        if (!(q > 0)) throw new Error('quanto ele comeu?');
        const f = foodById(form.querySelector('[name=fid]')?.value);
        const doc = { ...base, food: true, note: [f ? f.name : '', note].filter(Boolean).join(' · ') };
        if (f) doc.foodId = f.id;
        if (f && f.unit === 'un') { doc.qty = q; doc.unit = 'un'; doc.food_g = q * (f.gUnit || 0); } else doc.food_g = q;
        await db.collection('vitals').add(doc);
      } else if (n.kind === 'temp') {
        const c = parseFloat(form.querySelector('[name=v]').value.replace(',', '.'));
        if (!(c > 30 && c < 45)) throw new Error('temperatura em °C, ex.: 38,4');
        await db.collection('vitals').add({ ...base, temp: c, note });
      } else if (n.kind === 'fezes' || n.kind === 'urina') {
        // vira acontecimento: aparece na linha do tempo e nos últimos acontecimentos
        const get = k => form.querySelector(`[name=${k}]`)?.value || '';
        const det = n.kind === 'fezes' ? { consistencia: get('cons'), cor: get('cor') } : { como: get('como'), cor: get('cor'), quantidade: get('qtd') };
        const text = n.kind === 'fezes'
          ? `Fezes ${det.consistencia}${det.cor ? ', ' + det.cor : ''}.${note ? ' ' + note : ''}`
          : `Xixi ${det.como}${det.cor ? ', ' + det.cor : ''}${det.quantidade ? ', ' + det.quantidade : ''}.${note ? ' ' + note : ''}`;
        await db.collection('events').add({ ...base, kind: n.kind, details: det, text, mark: false });
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
    if (n.kind === 'consulta') return `<form class="vform rForm" data-n="${esc(n.id || '')}"><p class="muted" style="grid-column:1/-1;margin:0">${esc(n.note || '')}</p><div class="row"><button type="submit">Ok</button></div></form>`;
    if (n.kind === 'compra') return `<form class="vform rForm" data-n="${esc(n.id || '')}"><p class="muted" style="grid-column:1/-1;margin:0">${esc(n.note || '')}. Quando comprar, atualize o estoque em Mais → Medicamentos.</p><div class="row"><button type="submit">Ok, visto</button></div></form>`;
    if (Array.isArray(n.items) && n.items.length) f = `<div class="rItems">${n.items.map((it, i) => `<label class="chk"><input type="checkbox" name="it" value="${i}"${n.free ? '' : ' checked'}> ${ic({ kind: 'med', medId: it.medId, label: it.name })}<span><b>${esc(it.name)}</b>${it.dose ? ' <span class="muted">' + esc(it.dose) + '</span>' : ''}</span></label>`).join('')}</div>`;
    else if (n.kind === 'agua') f = `<label>Bebida<select name="fid">${foodList().filter(x => x.kind === 'bebida').map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>Quanto (mL)<input type="text" name="v" inputmode="decimal" required></label>`;
    else if (n.kind === 'comida') f = `<label>Alimento<select name="fid">${foodList().filter(x => x.kind === 'comida').map(x => `<option value="${esc(x.id)}">${esc(x.name)}${x.unit === 'un' ? ' (unid.)' : ''}</option>`).join('')}<option value="">outro</option></select></label><label>Quanto (g ou unidades)<input type="text" name="v" inputmode="decimal" required></label>`;
    else if (n.kind === 'temp') f = `<label>Temperatura (°C)<input type="text" name="v" inputmode="decimal" required></label>`;
    else if (n.kind === 'fezes') f = `<label>Consistência<select name="cons"><option>normal (firme)</option><option>pastosa</option><option>mole</option><option>líquida (diarreia)</option><option>ressecada / dura</option></select></label>
      <label>Cor<select name="cor"><option>marrom</option><option>marrom escura</option><option>preta</option><option>amarelada</option><option>esverdeada</option><option>com sangue</option><option>com muco</option></select></label>`;
    else if (n.kind === 'urina') f = `<label>Como<select name="como"><option>espontâneo</option><option>com escape</option><option>ao pressionar a bexiga</option><option>na sonda</option></select></label>
      <label>Cor<select name="cor"><option>clarinho</option><option>amarelo</option><option>amarelo escuro</option><option>rosado / com sangue</option></select></label>
      <label>Quantidade<select name="qtd"><option>pouco</option><option>normal</option><option>bastante</option></select></label>`;
    else if (n.kind === 'decubito') f = `<label>Posição<select name="side">${['lado esquerdo', 'esternal (de bruços)', 'lado direito', 'em pé / andando'].map(o => `<option${n.suggest === o ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
    const ok = n.kind === 'med' ? (n.items && n.items.length > 1 ? 'Dei os marcados ✓' : 'Dei ✓') : 'Salvar';
    const extra = n.id ? `<details class="rMore" data-k="m-${esc(n.id)}"><summary>mudar hora ou anotar</summary><div class="vform" style="margin-top:6px">${time}${note}</div></details>` : time + note;
    return `<form class="vform rForm" data-n="${esc(n.id || '')}">${f}${extra}
      <div class="row"><button type="submit">${ok}</button>${n.id ? '<button type="button" class="ghost" data-skip>Pulei</button>' : ''}</div></form>`;
  }

  /* ---------- Render ---------- */
  // Cada pedaço da rotina mora num lugar: "Agora" e "Últimas 48 h" em Hoje, o formulário em Registrar, horários em Mais → Lembretes.
  function paint(id, html, after) {
    const host = document.getElementById(id);
    if (!host) return;
    const ae = document.activeElement;
    if (ae && host.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) { render.dirty = true; return; }
    const openK = new Set([...host.querySelectorAll('details[open]')].map(d => d.dataset.k));
    // guarda o que a pessoa já escolheu nos formulários (um dado novo chegando não pode apagar a seleção)
    const fkey = f => (f.dataset.n || '') + '|' + (f.dataset.kind || '');
    const kept = new Map([...host.querySelectorAll('form.rForm')].map(f => [fkey(f), [...f.elements].filter(e => e.name && e.dataset.touched).map(e => [e.name, e.type === 'checkbox' ? e.checked : e.value, e.value])]));
    host.innerHTML = html;
    host.querySelectorAll('form.rForm').forEach(f => (kept.get(fkey(f)) || []).forEach(([n, v, raw]) => {
      const el = [...f.elements].find(e => e.name === n && (e.type !== 'checkbox' || e.value === raw));
      if (el) { if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dataset.touched = '1'; }
    }));
    host.querySelectorAll('details').forEach(d => { if (openK.has(d.dataset.k)) d.open = true; });
    if (after) after(host);
  }
  const activeMeds = () => meds.filter(m => !m.paused && (!m.end || m.end >= todayIso()) && (!m.start || m.start <= todayIso()));
  function render() {
    if (!fb) return;
    const pend = notifs.filter(n => n.status === 'pending').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const today = todayIso();
    const done = [
      ...logs.map(l => ({ ...l, src: 'log' })),
      ...vitals.filter(v => ['rotina', 'chat'].includes(v.source) && v.date >= daysAgo(1)).map(v => ({ ...v, src: 'v' })),
      ...events.filter(e => ['fezes', 'urina'].includes(e.kind) && e.date >= daysAgo(1)).map(e => ({ ...e, src: 'e' }))
    ].filter(x => x.date >= daysAgo(1)).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const vtxt = v => v.water_ml ? `💧 ${fmt(v.water_ml)} mL` : v.food_g ? `🍽 ${fmt(v.food_g)} g` : v.temp ? `🌡 ${fmt(v.temp)} °C` : '';
    const ltxt = l => `${ic(l)}${esc(l.label || (KIND[l.kind] || KIND.outro).t)}${l.side ? ' · ' + esc(l.side) : ''}${l.status === 'skipped' ? ' <span class="pill lo">pulou</span>' : ''}`;
    const isOn = localStorage.getItem('odinPush') === '1';

    paint('hojeAgora', `
    <section class="card">
      <div class="row between"><h2>Agora</h2><span class="pill">${pend.length ? pend.length + ' pendente' + (pend.length > 1 ? 's' : '') : 'nada pendente'}</span></div>
      <div class="list" style="margin-top:8px">${pend.map(n => `
        <div class="item rN${n.id === focusId ? ' rFocus' : ''}" id="rn-${esc(n.id)}" role="group" aria-label="Lembrete ${esc(n.label || (KIND[n.kind] || KIND.outro).t)}">
          <div class="row between"><b>${ic(n)}${esc(n.label || (KIND[n.kind] || KIND.outro).t)}</b>
          <span class="muted">${n.date === today ? '' : dm(n.date) + ' '}${esc(n.time)}${n.renotified ? ' · avisado 2x' : ''}</span></div>
          ${canEdit() ? entryForm(n) : ''}
        </div>`).join('') || '<p class="muted">Nada pendente agora. Quando chegar a hora de um remédio, da água ou do decúbito, aparece aqui.</p>'}</div>
      ${canEdit() ? '' : '<p class="note" style="margin-top:8px">Você está com acesso só de visualização.</p>'}
    </section>

`, () => { if (focusId) { const el = document.getElementById('rn-' + focusId); if (el && !render.scrolled) { render.scrolled = true; el.scrollIntoView({ block: 'center' }); } } });
    paint('hoje48', `
    <section class="card">
      <div class="row between"><h2>Últimas 48 h</h2><button type="button" class="ghost tiny" data-go="registrar">＋ registrar</button></div>
      <div class="list" role="list" aria-label="Últimas 48 h" style="margin-top:6px">${done.slice(0, 40).map(x => `<div class="item" role="listitem" aria-label="${esc(x.src === 'v' ? vtxt(x) : x.src === 'e' ? x.text : (x.label || (KIND[x.kind] || KIND.outro).t))}"><div class="row between"><span>${x.src === 'v' ? vtxt(x) + (x.note ? ' · ' + esc(x.note) : '') : x.src === 'e' ? (KIND[x.kind] || KIND.outro).e + ' ' + esc(x.text) : ltxt(x)}</span><span class="row"><span class="muted">${x.date === today ? '' : dm(x.date) + ' '}${esc(x.time || '')}</span>${x.src === 'log' && x.status === 'skipped' && canEdit() && lateId !== x.id ? `<button type="button" class="ghost tiny" data-late="${esc(x.id)}">Dei depois</button>` : ''}</span></div>${lateId === x.id ? `<div class="row rLate" style="margin-top:6px"><label>Que horas deu?<input type="time" name="lt" value="${hhmm()}"></label><button type="button" class="tiny" data-latego="${esc(x.id)}">Salvar ✓</button><button type="button" class="ghost tiny" data-latex>Cancelar</button></div>` : ''}</div>`).join('') || '<p class="muted">Nada ainda.</p>'}</div>
    </section>

`);
    const fk = freeKind;
    paint('regFree', fk ? `<section class="card rFreeBox" aria-label="Registrar ${esc(fk === 'med' ? 'Remédio dado' : KIND[fk].t)}"><div class="row between"><h2>${KIND[fk].e} ${esc(fk === 'med' ? 'Remédio dado' : KIND[fk].t)}</h2><button type="button" class="ghost tiny" data-freex>fechar</button></div>
      ${fk === 'med' ? '<p class="note" style="margin:4px 0 0">Marque o que deu agora. Remédio que estava pendente num lembrete, responda por lá, em Hoje.</p>' : ''}
      ${entryForm(fk === 'med' ? { kind: 'med', label: 'Remédio', items: activeMeds().map(m => ({ medId: m.id, name: m.name, dose: '' })), free: true } : { kind: fk, label: KIND[fk].t }).replace('data-n=""', `data-n="" data-kind="${fk}"`)}</section>` : '');
    paint('p-lembretes', `
    <section class="card">
      <h2>Horários</h2>
      <div class="list" role="list" aria-label="Horários" style="margin-top:6px">${scheds.sort((a, b) => ((a.times || [])[0] || a.from || '').localeCompare((b.times || [])[0] || b.from || '') || (a.label || '').localeCompare(b.label || '')).map(s => `
        <div class="item row between" role="listitem" aria-label="${esc(s.label)}">
          <span>${ic(s)}<b>${esc(s.label)}</b><br><span class="muted">${s.every ? `a cada ${s.every >= 60 && s.every % 60 === 0 ? s.every / 60 + ' h' : s.every + ' min'}, das ${esc(s.from)} às ${esc(s.to)}` : esc((s.times || []).join(' · '))}${schedDays(s)}${s.until ? ' · até ' + dm(s.until) : ''}${Array.isArray(s.items) && s.items.length ? '<br>' + s.items.map(i => { const m = meds.find(x => x.id === i.medId); const off = m && (m.paused || (m.end && m.end < todayIso())); return off ? `<s>${esc(i.name)}</s> <span class="pill hi">${m.paused ? 'pausado' : 'terminou'}</span>` : esc(i.name + (i.dose ? ' ' + i.dose : '')); }).join(' · ') : ''}</span></span>
          <span class="row"${canEdit() ? '' : ' hidden'}><button class="ghost tiny" data-tog="${esc(s.id)}">${s.active ? 'Pausar' : 'Ativar'}</button><button class="tiny danger" data-del="${esc(s.id)}">Apagar</button></span>
        </div>`).join('') || '<p class="muted">Nenhum horário ainda.</p>'}</div>
      <details data-k="new" style="margin-top:10px${canEdit() ? '' : ';display:none'}"><summary>Novo horário</summary>
        <form id="rNew" class="vform">
          <label>Tipo<select name="kind">${Object.entries(KIND).filter(([k]) => !['compra', 'consulta'].includes(k)).map(([k, v]) => `<option value="${k}">${v.e} ${v.t}</option>`).join('')}</select></label>
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
`);
  }
  window.renderRotina = () => { render(); renderAdmin(); };
  window.rotinaFree = k => { freeKind = k || null; render(); };
  // "Mais": Lembretes pra todo mundo do app; Admin só pra admin
  window.panelHidden = p => p === 'admin' && role() !== 'admin';
  document.body.classList.add('app');

  /* ---------- Admin ---------- */
  function renderAdmin() {
    const isAdmin = role() === 'admin';
    const host = document.getElementById('p-admin');
    if (!host || host.hidden || !fb) return;
    if (!isAdmin) { host.innerHTML = '<section class="card"><p class="muted">Só quem é admin vê esta aba.</p></section>'; return; }
    const ae = document.activeElement;
    if (ae && host.contains(ae) && /INPUT|TEXTAREA/.test(ae.tagName)) { renderAdmin.dirty = true; return; }
    const openK = new Set([...host.querySelectorAll('details[open]')].map(d => d.dataset.k));
    const G = goalsNow();
    const roleSel = (e, r) => `<select data-role="${esc(e)}"${e === me() ? ' disabled' : ''}>${Object.entries(ROLE).map(([k, v]) => `<option value="${k}"${k === r ? ' selected' : ''}>${v}</option>`).join('')}</select>`;
    host.innerHTML = `
    <section class="card">
      <h2>Acesso</h2>
      <p class="note" style="margin:4px 0 8px"><b>Admin</b>: tudo, inclusive esta aba. <b>Edita</b>: vê, registra, responde lembretes e mexe nos horários. <b>Só vê</b>: vê tudo, não altera nada.<br>
      <b>Lembretes</b>: se a pessoa recebe push (ela também precisa ativar no aparelho dela, em Mais → Lembretes).</p>
      <div class="list">${(aclDoc.emails || []).map(e => `<div class="item aRow">
        <span class="aMail">${esc(e)}${e === me() ? ' <span class="muted">(você)</span>' : ''}</span>
        <span class="row">${roleSel(e, (aclDoc.roles || {})[e] || 'view')}
          <label class="chk"><input type="checkbox" data-notify="${esc(e)}"${(aclDoc.notify || {})[e] === false ? '' : ' checked'}> lembretes</label>
          ${e !== me() ? `<button class="tiny danger" data-rmacl="${esc(e)}">Tirar</button>` : ''}</span></div>`).join('')}</div>
      <form id="rAcl" class="vform" style="margin-top:8px">
        <label>E-mail Google<input name="email" type="email" placeholder="email@gmail.com" required></label>
        <label>Papel<select name="role"><option value="view">Só vê</option><option value="edit">Edita</option><option value="admin">Admin</option></select></label>
        <label class="chk"><input type="checkbox" name="notify" checked> recebe lembretes</label>
        <div class="row"><button type="submit">Adicionar</button></div>
      </form>
    </section>

    <section class="card" aria-label="Notificações">
      <h2>Notificações</h2>
      <p class="note" style="margin:4px 0 8px">O que vira lembrete (push pra quem está marcado em "lembretes" acima). Decúbito e água viram horários em Mais → Lembretes.</p>
      <form id="aNotif" class="vform">
        <label class="chk"><input type="checkbox" name="med"${ncfg.med === false ? '' : ' checked'}> 💊 Remédios</label>
        <label class="chk"><input type="checkbox" name="compra"${ncfg.compra === false ? '' : ' checked'}> 🛒 Comprar remédio (estoque acabando)</label>
        <label class="chk"><input type="checkbox" name="consulta"${ncfg.consulta === false ? '' : ' checked'}> 📅 Compromissos (consulta, fisio, exame)</label>
        ${[['decubito', '🔄 Troca de decúbito', 'avisa qual é o próximo lado (esquerdo → esternal → direito → esternal)', { every: 240, from: '08:00', to: '22:00' }], ['agua', '💧 Oferecer água', 'diz quanto falta pra meta do dia e para de avisar quando bate', { every: 120, from: '08:00', to: '22:00' }]].map(([k, t, sub, def]) => {
          const sc = scheds.find(x => x.id === k) || {}, ev = sc.every || def.every;
          return `<fieldset class="nGrp" aria-label="${t.replace(/^\S+ /, '')}"><label class="chk"><input type="checkbox" name="${k}_on"${sc.active ? ' checked' : ''}> <b>${t}</b></label><span class="muted" style="font-size:12px">${sub}</span>
          <label>A cada<select name="${k}_every">${[60, 90, 120, 180, 240, 360].map(m => `<option value="${m}"${m === ev ? ' selected' : ''}>${m === 90 ? '1,5' : m / 60} h</option>`).join('')}</select></label>
          <label>Das<input type="time" name="${k}_from" value="${esc(sc.from || def.from)}"></label><label>Às<input type="time" name="${k}_to" value="${esc(sc.to || def.to)}"></label></fieldset>`; }).join('')}
        <div class="row"><button type="submit">Salvar notificações</button></div>
      </form>
    </section>

    <section class="card">
      <h2>Metas de água e calorias</h2>
      <p class="note" style="margin:4px 0 8px">Sugestão pelo peso ${G.kg ? `(${fmt(G.kg)} kg em ${dm(G.wDate)})` : ''}: água ${G.sugWater ? fmt(G.sugWater) + ' mL/dia (50 mL/kg, somando bebida e a água da comida)' : '—'} · calorias ${G.sugKcal ? fmt(G.sugKcal) + ' kcal/dia (1,6 × 70 × peso^0,75)' : '—'}. <b>Confirme os números com a veterinária</b>; como ele precisa ganhar peso, ela pode querer mais.</p>
      <form id="aGoals" class="vform"><label>Meta de água (mL/dia)<input type="text" inputmode="numeric" name="water" value="${goals?.water_ml || ''}" placeholder="${G.sugWater || ''}"></label>
        <label>Meta de calorias (kcal/dia)<input type="text" inputmode="numeric" name="kcal" value="${goals?.kcal || ''}" placeholder="${G.sugKcal || ''}"></label>
        <div class="row"><button type="submit">Salvar metas</button>${goals ? '<button type="button" class="ghost" data-goalsclr>voltar pra sugestão</button>' : ''}</div></form>
    </section>
    <section class="card">
      <details data-k="foods"><summary>Alimentos e bebidas (${foodList().length})</summary>
        <p class="note" style="margin:6px 0 8px">kcal e % de água de cada um. Os marcados com * são estimados: confira no rótulo e corrija aqui. Pra quem é por unidade (biscoito, petisco), informe o peso de 1 unidade.</p>
        ${foods.length ? '' : '<p class="muted">Usando a lista inicial. <button type="button" class="tiny" data-foodseed>salvar lista inicial pra poder editar</button></p>'}
        <div class="aFoods">${foodList().map(f => `<form class="vform aFood" data-fid="${esc(f.id)}">
          <label class="wide">Nome${f.est ? ' *' : ''}<input type="text" name="name" value="${esc(f.name)}"${foods.length ? '' : ' disabled'}></label>
          <label>Tipo<select name="kind"${foods.length ? '' : ' disabled'}><option value="comida"${f.kind === 'comida' ? ' selected' : ''}>comida</option><option value="bebida"${f.kind === 'bebida' ? ' selected' : ''}>bebida</option></select></label>
          <label>kcal por 100 ${f.unit === 'mL' ? 'mL' : 'g'}<input type="text" inputmode="decimal" name="kcal100" value="${f.kcal100 ?? ''}"${foods.length ? '' : ' disabled'}></label>
          <label>% de água<input type="text" inputmode="decimal" name="water" value="${f.water != null ? Math.round(f.water * 100) : ''}"${foods.length ? '' : ' disabled'}></label>
          <label>Medida<select name="unit"${foods.length ? '' : ' disabled'}><option value="g"${f.unit === 'g' ? ' selected' : ''}>gramas</option><option value="mL"${f.unit === 'mL' ? ' selected' : ''}>mL</option><option value="un"${f.unit === 'un' ? ' selected' : ''}>unidade</option></select></label>
          <label>g por unidade<input type="text" inputmode="decimal" name="gUnit" value="${f.gUnit ?? ''}"${foods.length ? '' : ' disabled'}></label>
          ${f.src ? `<p class="muted" style="grid-column:1/-1;margin:0;font-size:12px">fonte: ${esc(f.src)}</p>` : ''}
          ${foods.length ? '<div class="row"><button type="submit" class="tiny">salvar</button></div>' : ''}</form>`).join('')}</div>
        ${foods.length ? `<form class="vform aFood" data-fid="" style="margin-top:10px;border-top:1px dashed var(--line);padding-top:10px"><label class="wide">Novo alimento<input type="text" name="name" placeholder="ex.: frango cozido" required></label>
          <label>Tipo<select name="kind"><option value="comida">comida</option><option value="bebida">bebida</option></select></label>
          <label>kcal por 100 g/mL<input type="text" inputmode="decimal" name="kcal100"></label><label>% de água<input type="text" inputmode="decimal" name="water"></label>
          <label>Medida<select name="unit"><option value="g">gramas</option><option value="mL">mL</option><option value="un">unidade</option></select></label><label>g por unidade<input type="text" inputmode="decimal" name="gUnit"></label>
          <div class="row"><button type="submit" class="tiny">adicionar</button></div></form>` : ''}
      </details>
    </section>

    <section class="card"${exams.length ? '' : ' style="border-color:var(--accent)"'}>
      <details data-k="imp"${exams.length ? '' : ' open'}><summary>Trazer dados do cockpit antigo</summary>
        <p class="note" style="margin:6px 0 8px">No cockpit antigo (claude.ai), use <b>Exportar para o site</b> no Painel. Depois escolha aqui o arquivo <code>odin-export-….json</code> que foi pro Downloads. Pode repetir: o que já existe é atualizado, nada é duplicado.</p>
        <input type="file" id="rImp" accept=".json,application/json">
        <p class="muted" id="rImpMsg" style="margin-top:6px">${esc(impMsg)}</p>
      </details>
    </section>`;
    host.querySelectorAll('details').forEach(d => { if (openK.has(d.dataset.k)) d.open = true; });
  }
  document.addEventListener('focusout', () => setTimeout(() => { if (renderAdmin.dirty) { renderAdmin.dirty = false; renderAdmin(); } }, 300));
  const aclRef = () => fb.fs.collection('acl').doc('users');
  document.addEventListener('change', async ev => {
    const t = ev.target;
    if (t.matches('[data-role]')) await aclRef().update(new firebase.firestore.FieldPath('roles', t.dataset.role), t.value).catch(e => alert(e.message));
    if (t.matches('[data-notify]')) await aclRef().update(new firebase.firestore.FieldPath('notify', t.dataset.notify), t.checked).catch(e => alert(e.message));
  });

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

  // confirmação em dois toques (sem caixa de diálogo, que o app instalado bloqueia)
  const arm = b => { if (b.dataset.armed === '1') return true; const t0 = b.textContent; b.dataset.armed = '1'; b.textContent = 'confirmar?'; setTimeout(() => { b.dataset.armed = ''; b.textContent = t0; }, 4000); return false; };

  /* ---------- Eventos ---------- */
  // confirmação visível mesmo quando o formulário é redesenhado (toast do cockpit; sem ele, mensagem no próprio form)
  const feito = (el, msg) => { if (typeof window.toast === 'function') window.toast(msg); else say(el, msg); };
  const descreve = (n, f) => {
    const g = k => f.querySelector(`[name=${k}]`), hora = g('time')?.value || hhmm();
    if (n.kind === 'comida') { const fd = foodList().find(x => x.id === g('fid')?.value); return `🍽 ${g('v')?.value || ''} ${fd ? (fd.unit === 'un' ? 'un. de ' : 'g de ') + fd.name : ''} às ${hora}`.replace(/\s+/g, ' '); }
    if (n.kind === 'agua') { const fd = foodList().find(x => x.id === g('fid')?.value); return `💧 ${g('v')?.value || ''} mL de ${fd ? fd.name : 'água'} às ${hora}`; }
    if (n.kind === 'med') { const k = f.querySelectorAll('[name=it]:checked').length; return `💊 ${k || ''} remédio${k === 1 ? '' : 's'} dado${k === 1 ? '' : 's'} às ${hora}`.replace(/^💊\s+r/, '💊 R'); }
    return `${(KIND[n.kind] || KIND.outro).e} ${(KIND[n.kind] || KIND.outro).t} às ${hora}`;
  };
  const say = (el, msg) => { let p = el.querySelector('.rMsg'); if (!p) { p = document.createElement('p'); p.className = 'muted rMsg'; el.appendChild(p); } p.textContent = msg; };
  document.addEventListener('input', ev => { if (ev.target.closest && ev.target.closest('form.rForm')) ev.target.dataset.touched = '1'; }, true);
  document.addEventListener('change', ev => { if (ev.target.closest && ev.target.closest('form.rForm')) ev.target.dataset.touched = '1'; }, true);
  document.addEventListener('submit', async ev => {
    const f = ev.target;
    if (f.classList.contains('rForm')) {
      ev.preventDefault();
      const n = notifs.find(x => x.id === f.dataset.n) || { kind: f.dataset.kind, label: (KIND[f.dataset.kind] || KIND.outro).t, date: todayIso() };
      if (!f.dataset.n && n.kind === 'med') { n.items = activeMeds().map(m => ({ medId: m.id, name: m.name, dose: '' })); n.label = 'Fora de hora'; }
      const b = f.querySelector('[type=submit]'); b.disabled = true;
      const msg = descreve(n, f);
      try {
        await answer(n, f, false); feito(f, '✓ Registrado: ' + msg);
        // limpa os campos — inclusive no formulário redesenhado enquanto salvava (o antigo pode já ter saído da tela)
        if (!f.dataset.n) document.querySelectorAll(`form.rForm[data-n=""][data-kind="${f.dataset.kind}"]`).forEach(x => { [...x.elements].forEach(e => delete e.dataset.touched); x.reset(); });
      }
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
    if (f.id === 'aNotif') {
      ev.preventDefault();
      try {
        await fb.fs.collection('meta').doc('notificacoes').set({ med: f.med.checked, compra: f.compra.checked, consulta: f.consulta.checked, at: Date.now(), by: me() });
        for (const [k, label] of [['decubito', 'Troca de decúbito'], ['agua', 'Oferecer água']]) {
          await fb.fs.collection('schedule').doc(k).set({ kind: k, label, times: [], every: +f[k + '_every'].value, from: f[k + '_from'].value || '08:00', to: f[k + '_to'].value || '22:00', active: f[k + '_on'].checked, by: me(), at: Date.now() }, { merge: true });
        }
        say(f, 'Notificações salvas ✓');
      } catch (x) { say(f, x.message); }
      return;
    }
    if (f.id === 'aGoals') {
      ev.preventDefault();
      const w = parseFloat((f.water.value || '').replace(',', '.')) || null, k = parseFloat((f.kcal.value || '').replace(',', '.')) || null;
      await fb.fs.collection('meta').doc('goals').set({ water_ml: w, kcal: k, at: Date.now(), by: me() }).catch(x => say(f, x.message)); say(f, 'Metas salvas ✓'); return;
    }
    if (f.classList.contains('aFood')) {
      ev.preventDefault();
      const n = x => { const v = parseFloat(String(f[x].value || '').replace(',', '.')); return isFinite(v) ? v : null; };
      const d = { name: f.name.value.trim(), kind: f.kind.value, unit: f.unit.value, kcal100: n('kcal100') ?? 0, water: n('water') != null ? n('water') / 100 : 0, gUnit: n('gUnit'), est: false, src: 'ajustado no app' };
      if (!d.name) return;
      const id = f.dataset.fid || d.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      const prev = foods.find(x => x.id === id) || {};
      await fb.fs.collection('foods').doc(id).set({ ...prev, ...d, match: prev.match || '' }).catch(x => say(f, x.message)); say(f, 'Salvo ✓'); return;
    }
    if (f.id === 'rAcl') {
      ev.preventDefault();
      const e = f.email.value.trim().toLowerCase();
      if (!e) return;
      const roles = { ...(aclDoc.roles || {}), [e]: f.role.value }, notify = { ...(aclDoc.notify || {}), [e]: f.notify.checked };
      await aclRef().update({ emails: firebase.firestore.FieldValue.arrayUnion(e), roles, notify }).then(() => f.reset()).catch(x => say(f, x.message));
    }
  });
  document.addEventListener('click', async ev => {
    const t = ev.target;
    if (t.matches('[data-skip]')) {
      const f = t.closest('form'); const n = notifs.find(x => x.id === f.dataset.n);
      if (n) { t.disabled = true; await answer(n, f, true).then(() => feito(f, '⏭ Pulado: ' + (n.label || (KIND[n.kind] || KIND.outro).t))).catch(e => say(f, e.message)); }
    }
    if (t.matches('[data-late]')) { lateId = t.dataset.late; render(); }
    if (t.matches('[data-latex]')) { lateId = null; render(); }
    if (t.matches('[data-latego]')) {
      const l = logs.find(x => x.id === t.dataset.latego); if (!l) return;
      const tm = t.closest('.rLate').querySelector('[name=lt]').value || hhmm();
      t.disabled = true;
      await fb.fs.collection('rotina_log').doc(l.id).update({ status: 'done', time: tm, planned: l.time || '', note: ['dado com atraso' + (l.time ? ' (era ' + l.time + ')' : ''), l.note].filter(Boolean).join(' · '), lateBy: me(), lateAt: Date.now() });
      lateId = null; t.blur(); render(); feito(t, '✓ Registrado como dado às ' + tm);
    }
    if (t.closest('[data-freex]')) { freeKind = null; render(); document.querySelectorAll('#regGrid .regb').forEach(b => b.classList.remove('on')); }
    const fr = t.closest('[data-free]');
    if (fr) {
      freeKind = fr.dataset.free;
      if (typeof go === 'function' && activeTab !== 'registrar') go('registrar');
      document.querySelectorAll('[data-regbox]').forEach(b => b.classList.add('hidden'));
      document.querySelectorAll('#regGrid .regb').forEach(b => b.classList.toggle('on', b.dataset.free === freeKind));
      render(); setTimeout(() => document.getElementById('regFree')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    }
    if (t.matches('[data-tog]')) { const s = scheds.find(x => x.id === t.dataset.tog); if (s) await fb.fs.collection('schedule').doc(s.id).update({ active: !s.active }); }
    if (t.matches('[data-del]')) { const s = scheds.find(x => x.id === t.dataset.del); if (s && arm(t)) await fb.fs.collection('schedule').doc(s.id).delete(); }
    if (t.matches('[data-rmacl]')) { const e = t.dataset.rmacl; if (arm(t)) { const roles = { ...(aclDoc.roles || {}) }, notify = { ...(aclDoc.notify || {}) }; delete roles[e]; delete notify[e];
      await aclRef().update({ emails: firebase.firestore.FieldValue.arrayRemove(e), roles, notify }); } }
    if (t.id === 'rPush') enablePush(t);
    if (t.matches('[data-foodseed]')) { t.disabled = true; for (const x of FOOD_DEFAULTS) { const { id, ...d } = x; await fb.fs.collection('foods').doc(id).set(d); } }
    if (t.matches('[data-goalsclr]')) await fb.fs.collection('meta').doc('goals').delete();
  });

  /* ---------- Dados ---------- */
  window.ODIN_READY.then(() => {
    fb = window.ODIN_FB;
    const rr = () => { if (typeof scheduleRender === 'function') scheduleRender(); };
    fb.fs.collection('schedule').onSnapshot(s => { scheds = s.docs.map(d => ({ id: d.id, ...d.data() })); rr(); });
    fb.fs.collection('notifs').where('date', '>=', daysAgo(2)).onSnapshot(s => { notifs = s.docs.map(d => ({ id: d.id, ...d.data() })); rr(); updateBadge(); });
    fb.fs.collection('rotina_log').where('date', '>=', daysAgo(1)).onSnapshot(s => { logs = s.docs.map(d => ({ id: d.id, ...d.data() })); rr(); });
    fb.fs.collection('meta').doc('notificacoes').onSnapshot(s => { ncfg = s.data() || {}; rr(); });
    fb.fs.collection('acl').doc('users').onSnapshot(s => { aclDoc = { emails: [], roles: {}, notify: {}, ...(s.data() || {}) }; if (typeof go === 'function') go(activeTab, false); rr(); });
    if (localStorage.getItem('odinPush') === '1' && Notification.permission === 'granted') {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').then(reg =>
        firebase.messaging().getToken({ vapidKey: fb.vapidKey, serviceWorkerRegistration: reg })
          .then(tok => fb.fs.collection('tokens').doc(tok).set({ email: me(), ua: navigator.userAgent.slice(0, 160), at: Date.now() }, { merge: true }))).catch(() => {});
    }
    try { firebase.messaging().onMessage(() => {}); } catch {}
  });
  function updateBadge() {
    const n = notifs.filter(x => x.status === 'pending').length;
    const tab = document.querySelector('.tab[data-sec="hoje"]');
    if (tab) { let b = tab.querySelector('.badge'); if (!b) { b = document.createElement('span'); b.className = 'badge'; tab.appendChild(b); } b.textContent = n || ''; b.hidden = !n; b.setAttribute('aria-label', n + ' pendente' + (n > 1 ? 's' : '')); }
    try { if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch {}
  }
})();
