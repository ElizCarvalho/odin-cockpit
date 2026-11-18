# ADR 0006: Cenários de comportamento em Gherkin, em português, no check

**Status:** aceita · nov/2026

## Contexto

O smoke (Playwright puro) cobre bem "não quebrou", mas não deixa claro, pra quem não lê código, **que comportamento** está garantido. O projeto também quer servir de referência de desenvolvimento assistido por IA, e para isso o requisito tem que estar escrito em linguagem de gente.

## Decisão

Cenários em **Gherkin com `# language: pt`** em `features/`, executados por **@cucumber/cucumber** com passos em Playwright (`features/steps/passos.mjs`). Eles rodam o app de verdade com o Firebase falso e os dados de `tests/seed.mjs`, que são os mesmos do smoke. Fazem parte do `npm run check`, ou seja, rodam antes do commit e no CI.

## Alternativas consideradas

- playwright-bdd: gera specs do Playwright a partir do Gherkin. É bom, mas adiciona etapa de geração.
- Só o smoke: barato, mas não documenta comportamento.

## Consequências

- Mais ~50 s no check. O `npm run check -- --rapido` pula smoke e cenários pra iterações rápidas, nunca pra commit.
- Os passos conferem o dado gravado (`window.__store`), não só a tela.
