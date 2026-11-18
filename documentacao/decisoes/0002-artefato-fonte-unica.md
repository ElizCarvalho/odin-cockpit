# ADR 0002: Um HTML só pro app e pro site público

**Status:** aceita · nov/2026

## Contexto

Existem três "jeitos" de abrir o cockpit: como artefato do Claude, como app com Firebase e como site público só leitura. Manter três interfaces seria pedir pra elas divergirem.

## Decisão

`artifact/index.html` é a **fonte única**. Ele fala com o mundo por `window.claude.use(...)`.
- No app, `app/src/shim.js` implementa essa interface com Firebase, e `scripts/build-app.mjs` injeta o que é só do app (Lembretes, Admin, scripts).
- No site público, `window.ODIN_STATIC` aponta pro JSON anonimizado e a classe `body.ro` esconde tudo que escreve (`.wr`).

## Alternativas consideradas

- Framework (React/Vue) com build: mais estrutura, mas perde a compatibilidade com o artefato e aumenta a superfície pra IA errar.
- Duas bases (app e site): divergência garantida.

## Consequências

- O HTML é grande (~2.400 linhas). A organização por seções e os testes compensam.
- Toda injeção do build usa `swap()`, que **falha o build** se o trecho esperado mudar. Assim, refatorar o cockpit nunca quebra o app em silêncio.
