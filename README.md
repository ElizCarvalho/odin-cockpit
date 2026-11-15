# Odin - Cockpit

Acompanhamento de saúde do Odin (American Bully, nascido em 23/10/2025): exames, remédios, vacinas, fotos e linha do tempo.

- **Site público (só leitura):** GitHub Pages, servido da pasta `docs/`.
- **Onde se edita:** no artefato do Claude (cockpit com cadastro, leitura automática de exames/receitas e voz). O site é um retrato publicado dele.

## Estrutura

```
artifact/index.html        código do cockpit (o mesmo do artefato)
docs/                      site publicado (gerado, não editar à mão)
  index.html               cockpit em modo só leitura
  data/odin.json           dados já anonimizados
  data/photos/             fotos
config/anonimizacao.json   regras do que é removido antes de publicar
scripts/publicar.mjs       export -> anonimiza -> docs/ -> commit/push
```

## Como atualizar o site

1. No cockpit (artefato), no fim do **Painel**, clique em **Exportar para o site**. Isso baixa `odin-export-AAAA-MM-DD_HHhMM.json` (ex.: `odin-export-2026-11-15_16h20.json`) pra pasta Downloads.
2. Aqui no repositório:

   ```bash
   npm run publicar            # gera docs/ pra conferir
   npm run ver                 # abre em http://localhost:4173
   npm run publicar -- --push  # commita e publica
   ```

O export bruto **nunca** entra no git (está no `.gitignore`).

## Privacidade

`scripts/publicar.mjs` passa todos os textos por `config/anonimizacao.json`:

- troca nomes de pessoas (tutoras, veterinárias) por papéis ("a tutora", "a veterinária");
- remove CRMV, CPF, telefone, número de microchip e linhas com endereço/responsável;
- para a publicação se sobrar algo da lista `proibidos`.

Nome novo apareceu? Adicione em `substituir` e em `proibidos`.

## Atualizando o cockpit em si

Mudou o artefato? Copie o HTML novo pra `artifact/index.html` e rode `npm run publicar -- --push`: o site usa exatamente o mesmo código, em modo só leitura.
