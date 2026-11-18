# ADR 0003: Site público gerado e anonimizado, disparado pela mudança de dado

**Status:** aceita · nov/2026

## Contexto

O tutor quer compartilhar a evolução do Odin (com amigos, outras vets) sem expor nomes, CPF, e-mails, endereços, valores. No começo, publicar era manual: exportar JSON, rodar comando, dar push. O agendamento do GitHub Actions (`cron`) depois se mostrou irregular. Rodou 2 vezes numa noite inteira.

## Decisão

1. **Um único caminho de publicação**: Action "Publicar site público". Ele exporta do Firestore (`scripts/exportar-firestore.mjs`), anonimiza (`scripts/publicar.mjs` + `config/anonimizacao.json`), monta `docs/` e commita só se mudou.
2. **O anonimizador para a publicação** se sobrar algo da lista `proibidos` (nomes, CRMV, CPF, e-mail).
3. **Quem dispara é o dado**: o gatilho `marcarSitePublico` marca `meta/publico.dirtyAt`, e o `tick` dispara o Action depois de 3 min sem edição (no máximo 1 vez a cada 10 min). O cron de 6 h fica como rede de segurança.

## Alternativas consideradas

- Publicar a cada escrita: dezenas de commits por dia, e o anonimizador rodando sem parar.
- Só cron de hora em hora: irregular na prática.
- Firebase Hosting pra site público: possível, mas o Pages já existia e separa bem o que é público.

## Consequências

- Mudanças aparecem no site em ~4–5 minutos.
- Precisa do secret `GH_DISPATCH_TOKEN` (token fine-grained, renovar anualmente).
