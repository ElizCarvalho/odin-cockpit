// Configuração pública do app web (não é segredo; o acesso é controlado pelas regras do Firestore/Storage)
export const firebaseConfig = {
  apiKey: "AIzaSyBRLkioO0Xqf5JsATxOmsFhlaIQYEcSL3g",
  authDomain: "odin-cockpit.firebaseapp.com",
  projectId: "odin-cockpit",
  storageBucket: "odin-cockpit.firebasestorage.app",
  messagingSenderId: "516260936928",
  appId: "1:516260936928:web:c13a9882aaf4d3e3b16485"
};

// Chave pública do Web Push (VAPID) — pode ficar no código do cliente.
export const vapidKey = "BM5hv4OZSq_FtG5rTNDvrBRSiQjpFtYMa2-isgbSOBGYq8BLE4gaDNbc9TLs_hTvgBVwybytSp3avD9f0wQS0G0";
