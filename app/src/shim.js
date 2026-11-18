/* Odin Cockpit (app): liga o cockpit ao Firebase.
   O cockpit foi escrito pra window.claude.use('db' | 'assets' | 'sample' | ...). Aqui cada um vira um serviço do Firebase. */
(function () {
  const cfg = window.ODIN_FIREBASE;
  const app = firebase.initializeApp(cfg.config);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  const st = firebase.storage();
  const fn = app.functions('southamerica-east1');
  window.ODIN_FB = { app, auth, fs, st, fn, vapidKey: cfg.vapidKey };

  /* ---------- Login + lista de acesso ---------- */
  const gate = document.createElement('div');
  gate.id = 'gate';
  gate.innerHTML = `<div class="gbox"><h1>Odin - Cockpit</h1><p id="gMsg">Entre com sua conta Google pra ver e registrar.</p>
    <button id="gBtn" class="btn">Entrar com Google</button><button id="gOut" class="ghost hidden">Sair</button></div>`;
  const css = document.createElement('style');
  css.textContent = `#gate{position:fixed;inset:0;z-index:999;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px}
    #gate .gbox{max-width:360px;text-align:center;display:grid;gap:14px}#gate h1{font-family:var(--font-display);margin:0}
    #gate .hidden{display:none}`;
  document.head.appendChild(css);
  const showGate = (msg, out) => {
    if (!gate.isConnected) document.body.appendChild(gate);
    gate.querySelector('#gMsg').textContent = msg;
    gate.querySelector('#gBtn').classList.toggle('hidden', !!out);
    gate.querySelector('#gOut').classList.toggle('hidden', !out);
  };
  document.addEventListener('click', ev => {
    if (ev.target.id === 'gBtn') {
      const p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      (standalone ? auth.signInWithRedirect(p) : auth.signInWithPopup(p)).catch(e => showGate('Não consegui entrar: ' + (e.message || e.code)));
    }
    if (ev.target.id === 'gOut') auth.signOut();
  });

  let readyResolve;
  const ready = new Promise(r => { readyResolve = r; });
  window.ODIN_READY = ready;
  auth.onAuthStateChanged(async u => {
    if (!u) { showGate('Entre com sua conta Google pra ver e registrar.'); return; }
    const email = (u.email || '').toLowerCase();
    const ref = fs.collection('acl').doc('users');
    try {
      let snap = await ref.get();
      if (!snap.exists) { await ref.set({ emails: [email], roles: { [email]: 'admin' }, notify: { [email]: true }, createdAt: Date.now() }); snap = await ref.get(); }
      if (!(snap.data().emails || []).includes(email)) throw { code: 'permission-denied' };
      if (!snap.data().roles) { await ref.update({ roles: { [email]: 'admin' }, notify: { [email]: true } }); snap = await ref.get(); }
      const role = (snap.data().roles || {})[email] || 'view';
      gate.remove();
      window.ODIN_USER = { email, name: u.displayName || email, role };
      readyResolve(u);
    } catch (e) {
      showGate(e.code === 'permission-denied'
        ? `A conta ${email} ainda não tem acesso. Peça pra quem já usa o app te adicionar na aba Rotina → Acesso.`
        : 'Erro ao conferir acesso: ' + (e.message || e.code), true);
    }
  });

  /* ---------- Fotos (Storage) ---------- */
  const urls = new Map(), asking = new Set();
  const PIX = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  window.blobUrl = id => {
    if (urls.has(id)) return urls.get(id);
    if (!asking.has(id)) {
      asking.add(id);
      st.ref('blobs/' + id).getDownloadURL()
        .then(u => { urls.set(id, u); if (typeof scheduleRender === 'function') scheduleRender(); })
        .catch(() => urls.set(id, PIX));
    }
    return PIX;
  };
  window.blobUrlAsync = async id => urls.get(id) && urls.get(id) !== PIX ? urls.get(id) : st.ref('blobs/' + id).getDownloadURL();
  const assets = {
    async upload(blob, opts) {
      const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
      await st.ref('blobs/' + id).put(blob, { contentType: (opts && opts.type) || blob.type || 'application/octet-stream' });
      return { id };
    },
    async delete(id) { await st.ref('blobs/' + id).delete(); }
  };

  /* ---------- IA (function registrar) ---------- */
  const toDataUrl = b => typeof b === 'string' ? Promise.resolve(b) : new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(b); });
  const call = fn.httpsCallable('registrar', { timeout: 130000 });
  const sample = async (prompt, opts = {}) => {
    const images = await Promise.all((opts.images || []).map(toDataUrl));
    try { const r = await call({ prompt, images }); return { text: r.data.text }; }
    catch (e) { const err = new Error(e.message || 'erro na IA'); err.code = e.code; throw err; }
  };
  sample.limits = async () => ({ images: true });

  /* ---------- Ditado (Web Speech) ---------- */
  function dictation() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    let rec = null; const h = { partial: () => {}, final: () => {}, state: () => {} };
    return {
      onPartial(f) { h.partial = f; }, onFinal(f) { h.final = f; }, onState(f) { h.state = f; },
      async start() {
        rec = new SR(); rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true;
        rec.onresult = ev => {
          let part = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const r = ev.results[i];
            if (r.isFinal) h.final({ text: r[0].transcript.trim() }); else part += r[0].transcript;
          }
          if (part) h.partial({ text: part.trim() });
        };
        rec.onstart = () => h.state({ state: 'listening' });
        rec.onend = () => h.state({ state: 'idle' });
        rec.onerror = () => h.state({ state: 'idle' });
        rec.start();
      },
      async stop() { if (rec) rec.stop(); }
    };
  }

  /* ---------- Downloads ---------- */
  const downloads = {
    async save({ filename, data }) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
  };

  window.claude = {
    async use(name) {
      await ready;
      if (name === 'db') return fs;
      if (name === 'assets') return assets;
      if (name === 'sample') return sample;
      if (name === 'user') return { can: async () => window.ODIN_USER.role !== 'view' };
      if (name === 'dictation') return dictation();
      if (name === 'downloads') return downloads;
      return null;
    }
  };
})();

/* ---------- Aviso de versão nova ---------- */
// Compara o build desta página com o publicado; se mudou, mostra uma faixa pra atualizar.
(function () {
  const mine = document.querySelector('meta[name="odin-build"]')?.content || '';
  if (!mine || location.protocol === 'file:') return;
  let shown = false, last = 0;
  async function check() {
    if (shown || document.hidden || Date.now() - last < 60e3) return;
    last = Date.now();
    try {
      const html = await fetch('/index.html?b=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '');
      const live = (html.match(/<meta name="odin-build" content="([0-9a-f]*)"/) || [])[1] || '';
      if (live && live !== mine) show();
    } catch {}
  }
  function show() {
    shown = true;
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'odinUpd';
    b.textContent = '✨ Nova versão disponível · tocar pra atualizar';
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));z-index:9999;max-width:calc(100% - 24px);padding:12px 18px;border:0;border-radius:999px;background:#2b6c7d;color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer';
    b.onclick = () => location.reload();
    document.body.appendChild(b);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.addEventListener('focus', check);
  setInterval(check, 5 * 60e3);
  setTimeout(check, 15e3);
  window.ODIN_UPD_CHECK = () => { last = 0; return check(); };
})();
