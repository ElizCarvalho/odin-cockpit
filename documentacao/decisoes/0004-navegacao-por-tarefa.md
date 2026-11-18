# ADR 0004: Navegação por tarefa: Hoje, Registrar, Evolução, Histórico, Mais

**Status:** aceita · nov/2026

## Contexto

Depois de várias funcionalidades, o app tinha 8 abas por tipo de dado, 5 lugares pra registrar algo e um menu que ocupava 19% da tela do celular. A dona do projeto, que usa toda hora, relatou que se perdia. Detalhes em [ux.md](../ux.md).

## Decisão

Reorganizar em **5 seções pela pergunta de quem usa**. No celular elas ficam numa barra inferior, com o ＋ Registrar no meio.
- **Registrar** passa a ser o único lugar com formulários. As outras telas têm só atalhos (`data-reg`/`data-free`).
- Painéis continuam sendo `p-<id>`. A seção é uma camada por cima (`SECTIONS`, `go()`), o que preservou o código existente e os links antigos (`#rotina` → Hoje).

## Alternativas consideradas

- Só "arrumar" as 8 abas (renomear e reordenar): não resolveria os 5 lugares de registro.
- Menu hambúrguer: esconde demais as funções mais usadas.

## Consequências

- Smoke e cenários foram reescritos pra falar da nova navegação. Agora há cenários dedicados (`navegacao.feature`, `permissoes.feature`).
- `rotina.js` passou a desenhar em quatro lugares (Hoje/Agora, Hoje/48 h, Registrar, Mais/Lembretes), em vez de numa aba só.
