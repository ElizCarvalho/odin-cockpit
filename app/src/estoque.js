/* Estoque: remédios, comida e suprimentos num lugar só, com a lista do que comprar.
   Remédio guarda o estoque em meds/{id}.stock; comida e suprimento em supplies/{id}.
   Formato do estoque: { qty, unit, perDay, countedAt, lead, onList }. "Dura até" = countedAt + qty/perDay. */
(() => {
  let supplies = [], fb = null, openK = new Set();
  const SUGESTOES = [
    ['suprimento', 'Gaze', 'pct'], ['suprimento', 'Sonda uretral 8FR', 'un'], ['suprimento', 'Seringa 10 mL', 'un'],
    ['suprimento', 'Seringa 20 mL', 'un'], ['suprimento', 'Luva de procedimento', 'pares'], ['suprimento', 'Tapete higiênico', 'un']
  ];
  const CATS = [['med', '💊 Remédios e suplementos'], ['comida', '🍽 Comida'], ['suprimento', '🩹 Suprimentos']];
  const today = () => todayIso();
  const dNum = iso => Math.round(Date.parse(iso + 'T12:00:00Z') / 864e5);
  const dIso = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const fim = st => st && st.qty >= 0 && st.perDay > 0 && st.countedAt ? dIso(dNum(st.countedAt) + Math.floor(st.qty / st.perDay)) : null;

  // Cada item do estoque, venha de remédio ou de suprimento, no mesmo formato.
  function itens() {
    const ms = (typeof meds !== 'undefined' ? meds : []).filter(m => m.id && inUse(m)).map(m => ({ src: 'med', id: m.id, cat: 'med', name: m.name, st: m.stock || null, endUse: m.end || null }));
    const ss = supplies.map(s => ({ src: 'sup', id: s.id, cat: s.cat || 'suprimento', name: s.name, st: s.qty != null || s.onList ? s : null, endUse: null }));
    return [...ms, ...ss].map(i => {
      const e = fim(i.st), left = e ? dNum(e) - dNum(today()) : null, lead = Number(i.st && i.st.lead) || 5;
      let why = null;
      if (i.st && i.st.onList) why = 'você pôs na lista';
      else if (i.st && i.st.qty === 0) why = 'acabou';
      else if (e && left <= lead && !(i.endUse && e >= i.endUse)) why = left < 0 ? 'já deve ter acabado' : `acaba por volta de ${dm(e)} (${left} dia${left === 1 ? '' : 's'})`;
      return { ...i, fim: e, left, why };
    });
  }

  function linha(i) {
    const st = i.st, k = i.src + ':' + i.id;
    const qtd = st && st.qty != null ? `${fmt(st.qty)} ${esc(st.unit || 'un.')}` : '<span class="muted">sem contagem</span>';
    const dura = i.fim ? ` · dura até <b>${dm(i.fim)}</b>${i.endUse && i.fim >= i.endUse ? ' <span class="pill ok">dá até o fim</span>' : ''}` : st && st.qty != null && !st.perDay ? ' · <span class="muted">diga quanto gasta por dia pra prever</span>' : '';
    const form = canWrite ? `<details data-k="${esc(k)}"${openK.has(k) ? ' open' : ''}><summary class="muted" style="cursor:pointer;font-size:12.5px">${i.why ? 'comprei / contar' : 'contar'}</summary>
      <form class="vform eCount" data-src="${i.src}" data-id="${esc(i.id)}" aria-label="Contar ${esc(i.name)}">
        <label>Quanto tem agora<input type="text" inputmode="decimal" name="qty" value="${st && st.qty != null ? st.qty : ''}"></label>
        <label>Unidade<input type="text" name="unit" value="${esc(st && st.unit || '')}" placeholder="comp., mL, g, un, pct"></label>
        <label>Gasta por dia<input type="text" inputmode="decimal" name="perDay" value="${st && st.perDay || ''}" placeholder="ex.: 2"></label>
        <label>Avisar com (dias)<input type="text" inputmode="numeric" name="lead" value="${st && st.lead || 5}"></label>
        <div class="row"><button type="submit" class="tiny">salvar contagem</button>
        ${i.src === 'sup' ? `<button type="button" class="ghost tiny" data-edel="${esc(i.id)}">excluir item</button>` : ''}</div></form></details>` : '';
    const lista = canWrite ? (st && st.onList ? `<button type="button" class="ghost tiny" data-elist="${esc(k)}" data-on="0">tirar da lista</button>` : i.why ? '' : `<button type="button" class="ghost tiny" data-elist="${esc(k)}" data-on="1">pôr na lista</button>`) : '';
    return `<div class="mrow" role="listitem" aria-label="${esc(i.name)}"><div class="row between"><div><b>${esc(i.name)}</b><div class="s">${qtd}${dura}</div></div>${lista}</div>${form}</div>`;
  }

  window.renderEstoque = function () {
    const el = document.getElementById('p-estoque');
    if (!el || !fb) return;
    if (el.contains(document.activeElement) && document.activeElement.matches('input,select,textarea')) return; // não apaga o que está sendo digitado
    el.querySelectorAll('details[data-k]').forEach(d => d.open ? openK.add(d.dataset.k) : openK.delete(d.dataset.k));
    const all = itens().sort((a, b) => a.name.localeCompare(b.name, 'pt'));
    const comprar = all.filter(i => i.why);
    const semConta = all.filter(i => i.cat === 'med' && !(i.st && i.st.qty != null)).length;
    el.innerHTML = `
    <section class="card" aria-label="Lista de compras">
      <div class="row between"><h2>🛒 Lista de compras</h2>${comprar.length ? '<button type="button" class="ghost tiny" data-ecopy>copiar lista</button>' : ''}</div>
      ${comprar.length ? `<div class="list" role="list" aria-label="Pra comprar">${comprar.map(i => `<div class="mrow" role="listitem" aria-label="${esc(i.name)}"><b>${esc(i.name)}</b> <span class="muted">· ${esc(i.why)}</span></div>`).join('')}</div>
        <p class="note" style="margin:8px 0 0">Comprou? Abra o item lá embaixo e salve a contagem nova: ele sai da lista.</p>`
        : '<p class="muted">Nada pra comprar agora, pelo que está contado.</p>'}
      ${semConta ? `<p class="note" style="margin:8px 0 0">⚠ ${semConta} remédio${semConta > 1 ? 's' : ''} em uso sem contagem: sem contar, o app não sabe quando acaba.</p>` : ''}
    </section>
    ${CATS.map(([c, t]) => { const xs = all.filter(i => i.cat === c); return `<section class="card" aria-label="${t.replace(/^\S+ /, '')}"><h2>${t}</h2>
      ${xs.length ? `<div class="list" role="list" aria-label="${t.replace(/^\S+ /, '')}">${xs.map(linha).join('')}</div>` : `<p class="muted">${c === 'med' ? 'Nenhum remédio em uso.' : 'Nada cadastrado ainda.'}</p>`}</section>`; }).join('')}
    ${canWrite ? `<div class="row" style="justify-content:flex-end"><button class="ghost tiny" data-reg="estoque">＋ Novo item de comida ou suprimento</button></div>` : ''}`;
    renderForm();
  };

  // Formulário de item novo: mora em Registrar (regra do projeto), no quadro "Item de estoque".
  function renderForm() {
    const box = document.getElementById('regEstoque');
    if (!box || box.dataset.ok) return;
    box.dataset.ok = '1';
    box.innerHTML = `<h2>Item de estoque</h2>
      <p class="note" style="margin:4px 0 8px">Comida ou suprimento (gaze, sonda, seringa, luva…). Remédio entra sozinho no estoque quando está em uso. <button type="button" class="tiny" data-esug>adicionar os de sempre</button></p>
      <form class="vform" id="eNovo" aria-label="Novo item de estoque">
        <label class="wide">Nome<input type="text" name="name" required placeholder="ex.: Pet Delícia frango"></label>
        <label>Tipo<select name="cat"><option value="suprimento">suprimento</option><option value="comida">comida</option></select></label>
        <label>Quanto tem<input type="text" inputmode="decimal" name="qty"></label>
        <label>Unidade<input type="text" name="unit" placeholder="un, pct, g, sachê"></label>
        <label>Gasta por dia<input type="text" inputmode="decimal" name="perDay"></label>
        <label>Avisar com (dias)<input type="text" inputmode="numeric" name="lead" value="5"></label>
        <div class="row"><button type="submit">Adicionar ao estoque</button></div>
      </form>`;
  }

  const num = v => { const n = parseFloat(String(v || '').replace(',', '.')); return isNaN(n) ? null : n; };
  const ref = (src, id) => fb.fs.collection(src === 'med' ? 'meds' : 'supplies').doc(id);
  const curSt = (src, id) => src === 'med' ? ((meds.find(m => m.id === id) || {}).stock || {}) : (supplies.find(s => s.id === id) || {});

  document.addEventListener('submit', async ev => {
    const f = ev.target;
    if (f.matches('.eCount')) {
      ev.preventDefault();
      const st = { qty: num(f.qty.value), unit: f.unit.value.trim(), perDay: num(f.perDay.value), lead: num(f.lead.value) || 5, countedAt: today(), onList: false };
      if (st.qty == null) { toast('Diga quanto tem agora (pode ser 0).'); return; }
      try {
        if (f.dataset.src === 'med') await ref('med', f.dataset.id).update({ stock: st });
        else await ref('sup', f.dataset.id).set(st, { merge: true });
        openK.delete(f.dataset.src + ':' + f.dataset.id); document.activeElement && document.activeElement.blur();
        toast('✓ Contagem salva'); renderEstoque();
      } catch (e) { toast(e.message, 'err'); }
    }
    if (f.id === 'eNovo') {
      ev.preventDefault();
      const d = { name: f.name.value.trim(), cat: f.cat.value, unit: f.unit.value.trim(), qty: num(f.qty.value), perDay: num(f.perDay.value), lead: num(f.lead.value) || 5, countedAt: today(), onList: false, createdAt: Date.now() };
      if (!d.name) return;
      try { await fb.fs.collection('supplies').add(d); f.reset(); document.activeElement && document.activeElement.blur(); toast('✓ Adicionado ao estoque: ' + d.name); } catch (e) { toast(e.message, 'err'); }
    }
  });

  document.addEventListener('click', async ev => {
    const t = ev.target;
    if (t.matches('[data-elist]')) {
      const [src, id] = t.dataset.elist.split(':'), on = t.dataset.on === '1';
      try { src === 'med' ? await ref('med', id).update({ stock: { ...curSt('med', id), onList: on } }) : await ref('sup', id).set({ onList: on }, { merge: true }); toast(on ? '🛒 Na lista' : 'Saiu da lista'); } catch (e) { toast(e.message, 'err'); }
    }
    if (t.matches('[data-edel]') && armed(t, 'excluir')) { try { await ref('sup', t.dataset.edel).delete(); } catch (e) { toast(e.message, 'err'); } }
    if (t.matches('[data-esug]')) {
      t.disabled = true;
      const comidas = (typeof foods !== 'undefined' ? foods : []).filter(x => x.kind === 'comida').map(x => ['comida', x.name, x.unit === 'un' ? 'un' : 'g']);
      const tem = new Set(supplies.map(x => x.name.toLowerCase()));
      for (const [cat, name, unit] of [...SUGESTOES, ...comidas]) if (!tem.has(name.toLowerCase())) await fb.fs.collection('supplies').add({ cat, name, unit, createdAt: Date.now() });
      t.disabled = false;
      toast('✓ Itens adicionados: agora é só contar');
    }
    if (t.matches('[data-ecopy]')) {
      const txt = '🛒 Comprar pro Odin:\n' + itens().filter(i => i.why).map(i => `- ${i.name} (${i.why})`).join('\n');
      try { await navigator.clipboard.writeText(txt); toast('✓ Lista copiada'); } catch { toast('Não consegui copiar aqui'); }
    }
  });

  window.ODIN_READY.then(() => {
    fb = window.ODIN_FB;
    fb.fs.collection('supplies').onSnapshot(s => { supplies = s.docs.map(d => ({ id: d.id, ...d.data() })); if (typeof scheduleRender === 'function') scheduleRender(); });
  });
})();
