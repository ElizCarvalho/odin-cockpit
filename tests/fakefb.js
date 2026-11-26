(function(){
const store = {}; const subs = [];
const col = n => (store[n] = store[n] || {});
const notify = () => subs.forEach(s => s());
function snapOf(n, filt){ const docs = Object.entries(col(n)).filter(([id,d])=>!filt||filt(d)).map(([id,d])=>({id, data:()=>({...d}), exists:true})); return {docs, metadata:{fromCache:false}}; }
function query(n, filt){ return {
  where(f,op,v){ const g = d => op==='>=' ? d[f] >= v : d[f] === v; return query(n, d => (!filt||filt(d)) && g(d)); },
  get: async()=>snapOf(n,filt),
  onSnapshot(cb){ const s=()=>cb(snapOf(n,filt)); subs.push(s); setTimeout(s,0); return ()=>{}; },
  add: async d => { const id = 'x'+Math.random().toString(36).slice(2,8); col(n)[id]={...d}; setTimeout(notify,0); return {id}; },
  doc(id){ id = id || 'auto'+Math.random().toString(36).slice(2,8); return { id,
    get: async()=>({exists: id in col(n), data:()=>col(n)[id] && {...col(n)[id]}}),
    set: async (d,o)=>{ col(n)[id] = o&&o.merge ? {...col(n)[id],...d} : {...d}; setTimeout(notify,0); },
    update: async (d,v)=>{ if (d && d.__fp) { const cur=col(n)[id]; cur[d.__fp[0]]={...(cur[d.__fp[0]]||{}),[d.__fp[1]]:v}; setTimeout(notify,0); return; } const cur = col(n)[id]||{}; for (const [k,v] of Object.entries(d)) cur[k] = v && v.__au ? [...new Set([...(cur[k]||[]),...v.__au])] : v && v.__ar ? (cur[k]||[]).filter(x=>!v.__ar.includes(x)) : v; col(n)[id]=cur; setTimeout(notify,0); },
    delete: async()=>{ delete col(n)[id]; setTimeout(notify,0); },
    onSnapshot(cb){ const s=()=>cb({exists: id in col(n), data:()=>col(n)[id]}); subs.push(s); setTimeout(s,0); } }; }
}; }
const fs = { collection: n => query(n), batch(){ const ops=[]; return { set(ref,d){ops.push(()=>ref.set(d));}, commit: async()=>{ for(const o of ops) await o(); } }; } };
const fsFn = () => fs; fsFn.FieldPath = function(a,b){ this.__fp=[a,b]; }; fsFn.FieldValue = { arrayUnion:(...a)=>({__au:a}), arrayRemove:(...a)=>({__ar:a}), increment:x=>x };
window.firebase = {
  initializeApp: () => ({ functions: () => ({ httpsCallable: () => async () => ({data:{text: window.ODIN_IA_RESPOSTA || '{}'}}) }) }),
  auth: Object.assign(() => ({ onAuthStateChanged: cb => setTimeout(()=>cb({email:(new URLSearchParams(location.search).get('as')||'teste@x.com'), displayName:'T'}),0), signOut(){} }), { GoogleAuthProvider: function(){ this.setCustomParameters=()=>{}; } }),
  firestore: fsFn,
  storage: () => ({ ref: p => ({ put: async (b)=>{ window.__puts=(window.__puts||[]).concat(p); }, getDownloadURL: async () => '/blob0.jpg', put: async()=>{}, delete: async()=>{} }) }),
  messaging: Object.assign(() => ({ getToken: async()=>'tok', onMessage(){} }), { isSupported: () => true })
};
window.__store = store;
// seed: dados de teste montados pelo smoke (nada de dado real)
const seed = window.ODIN_SEED || {};
for (const [c, docs] of Object.entries(seed)) for (const [id, d] of Object.entries(docs)) col(c)[id] = d;
})();
