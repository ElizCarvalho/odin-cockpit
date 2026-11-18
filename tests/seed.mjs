// Dados de teste usados pelo smoke e pelos cenários Gherkin (Firebase falso, nada real).
export const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const SEED = {
  acl: { users: { emails: ['admin@teste.com', 'edita@teste.com', 've@teste.com'], roles: { 'admin@teste.com': 'admin', 'edita@teste.com': 'edit', 've@teste.com': 'view' }, notify: {} } },
  exams: { e1: { date: today, kind: 'Hemograma', lab: 'Lab teste', params: { hb: 9.1, ht: 27 }, other: [], createdAt: 1 } },
  events: { v1: { date: today, time: '08:10', text: 'Evento de teste', mark: false } },
  meds: { m0: { name: 'Remédio antigo', start: '2026-01-01', end: '2026-01-10' }, m1: { name: 'Remédio teste', start: today, dose: '1 comp.' }, m2: { name: 'Outro em uso', start: '2026-01-05', dose: '1 comp.', stock: { qty: 4, unit: 'comp.', perDay: 1, countedAt: today } } },
  photos: { p1: { assetId: 'a1', date: today, caption: 'Foto teste', createdAt: 1 } },
  vitals: { t1: { date: today, time: '07:00', temp: 38.4 } },
  schedule: { s1: { kind: 'med', label: 'Remédio teste', times: ['09:00'], active: true }, s2: { kind: 'agua', label: 'Água', every: 120, from: '08:00', to: '22:00', active: true } },
  notifs: {
    [`s1_${today}_0900`]: { schedId: 's1', kind: 'med', label: 'Remédio teste', date: today, time: '09:00', status: 'pending', sentAt: 1 },
    [`s3_${today}_0930`]: { schedId: 's3', kind: 'med', label: 'Manhã', date: today, time: '09:30', status: 'pending', sentAt: 1, items: [{ medId: 'm1', name: 'Remédio teste', dose: '1 comp.' }, { medId: 'm2', name: 'Outro em uso', dose: '1 comp.' }] },
    [`s2_${today}_1000`]: { schedId: 's2', kind: 'agua', label: 'Água', date: today, time: '10:00', status: 'pending', sentAt: 1 },
    [`stock_m2_${today}`]: { schedId: 'stock_m2', kind: 'compra', label: 'Comprar Outro em uso', medId: 'm2', date: today, time: '10:00', status: 'pending', sentAt: 1, note: 'o estoque acaba em breve' }
  }
};
