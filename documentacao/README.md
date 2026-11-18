# Documentação do Odin - Cockpit

O cockpit nasceu pra uma necessidade bem concreta: acompanhar, dia a dia, um filhote com cinomose e anemia. São dezenas de remédios, exames frequentes, lembretes de hora em hora e várias clínicas. Foi construído conversando com um agente de IA (Claude) e cresceu por pedido, uma funcionalidade de cada vez.

Esta pasta registra **como** ele é feito. A ideia é que qualquer pessoa ou agente consiga entender, mudar e entregar com segurança.

| Documento | Responde |
|---|---|
| [arquitetura.md](arquitetura.md) | Quais são as peças e como os dados andam entre elas? |
| [dados.md](dados.md) | O que tem em cada coleção do Firestore? |
| [ux.md](ux.md) | Como a interface se organiza e por quê? |
| [qualidade.md](qualidade.md) | Como sei que não quebrei nada? Como escrevo um cenário? |
| [especificacao.md](especificacao.md) | Quais comportamentos estão combinados e o que está em aberto (Três Amigos)? |
| [aderencia.md](aderencia.md) | Cada elemento da tela tem um locator estável pra automação? |
| [esteira-ia.md](esteira-ia.md) | Como trabalhar neste projeto com um agente de IA? |
| [operacao.md](operacao.md) | Onde ficam os segredos, quais permissões, o que fazer quando quebra? |
| [decisoes/](decisoes/) | Por que cada escolha importante foi feita (ADRs) |

## Glossário rápido

- **Cockpit / artefato:** o HTML único (`artifact/index.html`) com toda a interface. Começou como artefato do Claude e hoje é a fonte do app e do site público.
- **App:** o cockpit montado com Firebase (`scripts/build-app.mjs` → `app/public/`), publicado em odin-cockpit.web.app.
- **Site público:** o mesmo cockpit, só leitura, com dados anonimizados, publicado no GitHub Pages (`docs/`).
- **Rotina:** os lembretes (remédio, água, decúbito…), a resposta a eles e o que foi registrado nas últimas 48 h.
- **Registrar:** a seção única de lançar qualquer coisa. O "Registrar com leitura automática" usa IA pra ler exames, receitas e texto livre.
- **Esteira:** o caminho obrigatório de uma mudança até produção (pull → check → commit → push → verificar).
