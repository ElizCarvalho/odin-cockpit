# Odin - Cockpit

Acompanhamento de saúde do Odin, um American Bully nascido em 23/10/2025 que está tratando cinomose e anemia. O cockpit reúne exames, remédios, rotina de cuidados, vacinas, fotos e linha do tempo.

Ele também é um projeto de referência de **desenvolvimento assistido por IA**. Tem regras que valem pra qualquer agente, uma esteira automática com testes de comportamento em Gherkin e deploy conferido. A documentação explica cada decisão.

| | Endereço | Pra quê |
|---|---|---|
| **App** | https://odin-cockpit.web.app | Onde se usa: login Google, lembretes com push, registrar, papéis admin/edita/só vê |
| **Site público** | https://elizcarvalho.github.io/odin-cockpit/ | Retrato anonimizado, só leitura, atualiza sozinho uns 5 min depois de qualquer mudança |

## Começar

```bash
npm ci && npm ci --prefix functions && npx playwright install chromium
npm run check              # valida tudo: build, sintaxe, segredos, funções, smoke e cenários Gherkin
npm run bdd                # só os cenários (relatório em relatorios/cenarios.html)
npm run app:ver            # app local em http://localhost:5050 (Firebase de verdade, precisa logar)
```

O fluxo de entrega (pull → check → commit → push → `npm run deploy:verificar`) está em [`AGENTS.md`](AGENTS.md). Ele vale pro Claude, pro Cursor ou pra qualquer agente ou pessoa.

## Documentação

Tudo em [`documentacao/`](documentacao/README.md):

- [Arquitetura](documentacao/arquitetura.md): como as peças se ligam (PWA, Firebase, Functions, Actions, Pages)
- [Modelo de dados](documentacao/dados.md): coleções do Firestore e o que cada campo significa
- [UX e navegação](documentacao/ux.md): os princípios e o mapa das 5 seções
- [Qualidade e testes](documentacao/qualidade.md): a pirâmide de checagens e como escrever um cenário Gherkin (método lunarpass-tests)
- [Especificação por exemplos](documentacao/especificacao.md) e [aderência pra automação](documentacao/aderencia.md)
- [Esteira com IA](documentacao/esteira-ia.md): como o projeto é desenvolvido com agentes e o que aprendemos
- [Operação](documentacao/operacao.md): segredos, permissões de nuvem e o que fazer quando algo quebra
- [Decisões (ADRs)](documentacao/decisoes/): por que cada escolha foi feita

## Estrutura

```
artifact/index.html        cockpit: fonte única do app e do site público
app/src/                   ligação com o Firebase (shim.js) e Rotina/Admin (rotina.js)
app/static/                manifest, ícones, service worker do push
functions/index.js         lembretes a cada minuto, IA do Registrar, gatilho do site público
features/                  cenários de comportamento em Gherkin (português) + passos Playwright
tests/                     smoke, Firebase falso e dados de teste
scripts/                   build, check, verificação de deploy, export e anonimização
config/anonimizacao.json   o que é removido antes de publicar
docs/                      site público gerado (GitHub Pages, não editar à mão)
documentacao/              documentação do projeto
```

## Privacidade

O site público passa por `config/anonimizacao.json`. Ele troca nomes de pessoas por papéis ("a tutora", "o veterinário") e remove CRMV, CPF, telefone, e-mail, microchip e endereço. Se sobrar algo da lista `proibidos`, a publicação **para**. Dados reais vivem só no Firestore: export bruto nunca entra no git.
