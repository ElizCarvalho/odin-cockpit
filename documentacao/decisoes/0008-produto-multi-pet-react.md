# 0008 · Produto multi-pet em React + TypeScript (branch `modularizacao`)

**Status:** proposta (em andamento na branch `modularizacao`).

**Contexto.** O Odin - Cockpit nasceu como um HTML único (`artifact/index.html`, ~2.600 linhas) com injeções do app (`shim.js`, `rotina.js`, `estoque.js`). Funciona bem pro Odin, mas tem o pet, as internações, as faixas clínicas e os prompts da IA escritos no código, e não separa regra de negócio de tela. A Elis quer transformar isso num produto pra várias famílias e vários pets.

**Decisão.**
- Monorepo com `apps/web` (React + Vite + TypeScript, PWA), `functions` (TS), `packages/core` (regras puras com testes), `packages/data` (Firestore tipado) e `packages/ui`.
- Dados por família e pet (`familias/{id}`, `pets/{id}/…`), com regras de acesso por membro.
- Os cenários Gherkin atuais viram a régua de aceite: uma tela nova só está pronta quando os cenários dela passam.
- A `main` segue com o app do Odin até o corte; a branch não publica no app em produção.

**Consequências.** Durante a migração existem dois apps. Mudanças da `main` precisam ser trazidas pra branch (`git merge main`) com frequência. O plano por fases está em `documentacao/produto/plano-modularizacao.md`.
