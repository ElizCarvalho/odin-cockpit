# Plano: modularização e produtização

Branch: `modularizacao`. A `main` continua sendo o app do Odin em produção e recebe os ajustes do dia a dia; esta branch só volta pra `main` no corte final (fase 6).

## Para onde vamos

**Produto:** um app onde qualquer tutor cria conta, monta a família (quem cuida) e cadastra os pets, cada um com exames, remédios, rotina, lembretes, estoque e histórico, como o Odin tem hoje.

**Tecnologia:** React + Vite + TypeScript no front (PWA), Firebase continua no back (Auth, Firestore, Functions, Storage, FCM). Monorepo com pnpm workspaces.

```
apps/
  web/            React + Vite + TS (PWA). Telas: Hoje, Registrar, Evolução, Histórico, Mais
functions/        Cloud Functions em TS (tick, IA do Registrar, Pushover, auditoria, site público)
packages/
  core/           regras puras, sem Firebase: marcadores e faixas, isDue, metas de água/comida,
                  estoque, linha do tempo, temperatura/febre, anonimizador. Testes com Vitest
  data/           acesso ao Firestore tipado (repositórios por coleção), regras e índices
  ui/             componentes visuais (cards, gráficos com zoom, formulários, toasts)
features/         cenários Gherkin (os mesmos de hoje, que viram a régua de aceite da migração)
```

## O que hoje está "chumbado" no Odin e vira dado do pet

| Hoje no código | Vira |
|---|---|
| Nome, raça, nascimento, "cinomose e anemia" | `pets/{id}` (nome, espécie, raça, nascimento, condições) |
| `STAYS` (internações) e cores das clínicas | coleção `internacoes` + cadastro de clínicas |
| Faixa de temperatura 39,4 / 39,5 / 39,6 | configuração por pet, com padrão por espécie |
| Referências dos marcadores (cão) | tabela por espécie, sobrescrevível por laudo/laboratório |
| Prompts da IA citando o Odin | prompt montado com os dados do pet |
| Metas (água mL/kg/h, comida, kcal) | `pets/{id}/config/metas` |
| Nomes no anonimizador | lista por família |

## Modelo de dados (multi-família, multi-pet)

```
users/{uid}                         perfil, famílias de que participa
familias/{familiaId}                nome, membros {uid: admin|edita|ve}, convites
pets/{petId}                        familiaId, nome, espécie, raça, nascimento, condições, config
pets/{petId}/exams | vitals | meds | schedule | notifs | events | photos | supplies
             | rotina_log | foods | auditoria | analyses
```

Regras: quem é membro da família do pet lê; `edita`/`admin` escrevem; `auditoria` só admin lê. O `tick` passa por todos os pets ativos.

## Fases

| # | Fase | Pronto quando |
|---|---|---|
| 0 | **Fundação**: monorepo, TS, lint, Vitest, CI da branch, preview do Firebase por branch | `pnpm check` verde na CI da branch |
| 1 | **`packages/core`**: extrair as regras puras do app atual com testes unitários | toda regra de negócio coberta, app atual usando o core |
| 2 | **Dados multi-pet**: modelo, regras, índices e script que migra o Odin pra `familias/…/pets/odin` (no emulador) | migração idempotente testada no emulador |
| 3 | **`apps/web` em React**: casca (login, navegação, PWA), depois tela a tela: Hoje → Registrar → Evolução → Histórico → Mais | cenários Gherkin de cada tela verdes no Chrome e no Safari |
| 4 | **Functions em TS** e multi-pet | lembretes, IA, Pushover e auditoria funcionando por pet |
| 5 | **Produto**: cadastro de família e pet, convites, padrões por espécie, termos/LGPD (exportar e apagar dados) | uma família nova consegue usar do zero |
| 6 | **Corte**: migrar o Odin de verdade e trocar o app | Odin rodando no app novo, `main` = branch |

## Regras durante a migração

- Nada desta branch publica no app do Odin. Deploy só em projeto/canal separado.
- Cada tela nova só conta como pronta com os cenários Gherkin dela passando (eles já descrevem o comportamento esperado).
- Mudança feita na `main` nesse meio-tempo é trazida pra branch com `git merge main` regularmente.
