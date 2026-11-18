#!/usr/bin/env node
// Gera o site público a partir dos DADOS DE TESTE (tests/seed.mjs), pelo mesmo caminho da publicação de verdade
// (scripts/publicar.mjs: anonimizador + modo só leitura). Sai em relatorios/site-teste/. Usado pelos cenários do site público.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SEED } from '../tests/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(ROOT, 'relatorios/site-teste');
const lista = c => Object.entries(SEED[c] || {}).map(([id, d]) => ({ id, ...d }));
const exp = {
  exportedAt: new Date().toISOString(), updatedAt: Date.now(),
  exams: lista('exams'), events: lista('events'), analyses: [], meds: lista('meds'), prevent: lista('prevent'),
  vitals: lista('vitals'), foods: [], goals: null, photos: []
};
fs.mkdirSync(path.join(ROOT, 'relatorios'), { recursive: true });
const tmp = path.join(ROOT, 'relatorios/export-de-teste.json');
fs.writeFileSync(tmp, JSON.stringify(exp));
execFileSync('node', [path.join(ROOT, 'scripts/publicar.mjs'), tmp, '--saida', out], { stdio: 'inherit' });
console.log('site de teste em', out);
