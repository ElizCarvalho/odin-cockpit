# Odin - Cockpit · regras do projeto (pra qualquer agente: Claude, Cursor, etc.)

Cockpit de saúde do Odin (American Bully, cinomose e anemia). Quem usa é a Elis e quem ela adicionar.
Fale **em português do Brasil**, direto, sem enrolação. Todo texto de interface também é em português.

## Esteira de desenvolvimento (sempre, nesta ordem)

1. **Antes de começar:** `git pull --rebase` na `main`. Se tiver mudança local não commitada, pare e pergunte.
2. **Desenvolver** (veja "Onde mexer" abaixo).
3. **Validar:** `npm run check`. Ele monta o app, confere a sintaxe de todo o JS, os JSON, as funções, os vazamentos de segredo, CPF ou export bruto, roda o smoke no navegador (390 e 1440 px, papéis admin/edita/só vê) e os **cenários Gherkin** (`features/*.feature`).
   - Comportamento novo ou bug corrigido? Escreva ou ajuste um cenário em `features/`: declarativo, em 1ª pessoa, sem clique ou campo no texto, automatizado por Page Object, sem `waitForTimeout` (veja `documentacao/qualidade.md`).
   - Só siga com tudo ✓. Se falhar, conserte. Não pule nem desligue checagem pra passar.
   - Mudou tela? Olhe também no navegador: `npm run app:ver` (http://localhost:5050, com Firebase de verdade, então precisa logar).
4. **Commit** na `main`, com mensagem curta em português dizendo o que mudou pra quem usa (ex.: "Linha do tempo: itens do dia em ordem de hora"). Terminar com as linhas de coautoria que o ambiente pedir.
5. **Push:** `git push`. Se for rejeitado, `git pull --rebase`, rode `npm run check` de novo e repita.
6. **Conferir que está no ar:** `npm run deploy:verificar`. Ele espera os GitHub Actions desse commit e confere se https://odin-cockpit.web.app está servindo exatamente esse commit (e o site público, se `docs/` mudou).
   - Só diga "está no ar" depois disso dar ✓. Se der ✗, abra o link do Action, leia o erro e conserte.
7. **Contar pra Elis** em 1–3 frases: o que mudou, onde ver, e se ela precisa fazer algo (recarregar o app etc.).

## Onde mexer

| O quê | Arquivo |
|---|---|
| Cockpit (Hoje, Registrar, Evolução, Histórico, Mais; gráficos, remédios, vacinas, fotos, linha do tempo) | `artifact/index.html`, que é a fonte única do app e do site público. A navegação está em `SECTIONS`/`go()`/`openReg()` |
| Login, ligação com o Firebase (db, fotos, IA, ditado) | `app/src/shim.js` |
| Rotina: pendentes e últimas 48 h (em Hoje), registro do dia a dia (em Registrar), Lembretes e Admin (em Mais) | `app/src/rotina.js` |
| Ícones, manifest, service worker do push | `app/static/` |
| Como o app é montado (injeções no cockpit) | `scripts/build-app.mjs` |
| Lembretes a cada minuto e IA do Registrar | `functions/index.js` |
| Quem pode ler e escrever | `firestore.rules`, `storage.rules` |
| Teste de fumaça, Firebase falso e dados de teste | `tests/smoke.mjs`, `tests/fakefb.js`, `tests/seed.mjs` |
| Cenários de comportamento (Gherkin declarativo, método lunarpass-tests) | `features/*.feature`; Page Objects em `features/support/paginas.mjs`; passos em `features/steps/passos.mjs`; especificação e perguntas em `documentacao/especificacao.md` |
| Documentação (arquitetura, dados, UX, qualidade, esteira, operação, ADRs) | `documentacao/`. Mudou arquitetura, dado ou navegação? Atualize junto |
| Site público anonimizado (GitHub Pages) | `docs/`, gerado pelo Action "Publicar site público" (`scripts/exportar-firestore.mjs` → `scripts/publicar.mjs`). Não editar à mão |

`app/public/` é gerado (está no `.gitignore`). Não edite nele.

## Regras que não se quebram

- **Formulário novo mora em Registrar.** Nas outras telas, só atalho (`data-reg`/`data-free`). Nada de `prompt`/`confirm`/`alert` (ADR 0005).

- **Dados reais do Odin vivem no Firestore**, não no repositório. Nunca commitar export bruto (`exports/`, `odin-export-*.json`).
- **Sem segredos no git:** chave de conta de serviço, chave da Anthropic e tokens ficam só nos secrets do GitHub (`FIREBASE_SERVICE_ACCOUNT`, `ANTHROPIC_API_KEY`). Nunca peça pra colarem chave no chat.
- **Privacidade:** nada de CPF, endereço, telefone, nome de veterinária ou valores de orçamento no site público. O anonimizador (`config/anonimizacao.json`) não pode ser enfraquecido. No site público não entram fotos com rosto de pessoas.
- **Não mude dado clínico** (valores de exame, doses, datas) sem a Elis pedir. Na dúvida, pergunte.
- **Permissões:** quem "só vê" não escreve nada. Isso é garantido nas regras, não só escondendo botão. Mexeu em papel ou coleção nova? Atualize `firestore.rules`/`storage.rules` e o smoke.
- **Configurações de nuvem** (IAM, billing, OAuth, APIs do Google Cloud) quem faz é a Elis. Explique o passo a passo e confira depois.
- **Coleções novas** precisam de regra própria se não forem "membro lê, quem edita escreve".

## Infra (pra referência)

- Firebase project `odin-cockpit`: Firestore em `southamerica-east1`, Storage em `us-east1` (cota grátis), funções em `southamerica-east1`.
- O deploy é automático no push pra `main` (Action "Deploy do app (Firebase)"), que roda `npm run check` antes de publicar.
- O site público se atualiza sozinho quando os dados mudam: a função `marcarSitePublico` marca `meta/publico.dirtyAt` a cada escrita numa coleção pública, e o `tick` dispara o Action "Publicar site público" depois de 3 min sem edição (no máximo 1 vez a cada 10 min; precisa do secret `GH_DISPATCH_TOKEN`). O cron do Action (a cada 6 h) é só rede de segurança. Ele lê o Firebase e passa pelo anonimizador (`config/anonimizacao.json`), que **para a publicação** se sobrar nome, CRMV, CPF ou e-mail. Nome novo de pessoa em documento? Acrescente em `substituir` e `proibidos`.
- Papéis em `acl/users`: `emails[]`, `roles{email: admin|edit|view}`, `notify{email: bool}`.
- O lembrete é um doc `notifs/{schedId_AAAA-MM-DD_HHMM}`, criado pela função `tick` a partir de `schedule`. A resposta grava em `vitals` (água, comida, temperatura) ou em `rotina_log` (remédio, decúbito).
