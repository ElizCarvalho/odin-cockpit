# ADR 0005: Sem prompt/confirm/alert do navegador

**Status:** aceita · nov/2026

## Contexto

No iPhone, com o app instalado na tela inicial, `prompt()` e `confirm()` simplesmente não aparecem: o botão "não funciona". Isso aconteceu em produção ("o botão por hora não tá funcionando").

## Decisão

Nada de diálogo nativo. Entrada de dado é inline no próprio cartão. Confirmação de exclusão é com **dois toques** (`arm()`/`armed()`: o botão muda pra "toque de novo pra confirmar"). Aviso é **toast**.

## Alternativas consideradas

- Modal próprio pra tudo: mais código, sem ganho real pra confirmações simples.

## Consequências

- O smoke e os cenários **falham se qualquer diálogo abrir** (`page.on('dialog')`).
