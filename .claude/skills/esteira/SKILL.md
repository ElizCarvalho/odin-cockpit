---
name: esteira
description: Esteira de entrega do Odin Cockpit. Use em toda mudança de código neste repositório (app, cockpit, functions, regras, scripts) pra puxar, validar, commitar, publicar e conferir que está no ar.
---

# Esteira de entrega · Odin Cockpit

As regras do projeto estão em `AGENTS.md`. Esta é a sequência pra qualquer mudança, do começo ao "está no ar".

## 0. Preparar (uma vez por máquina)

```bash
npm install                       # playwright pro smoke
npx playwright install chromium   # navegador do smoke
npm ci --prefix functions         # pra testar as funções
```

## 1. Puxar antes de começar

```bash
git status --short     # tem algo local? pare e pergunte o que fazer com isso
git checkout main && git pull --rebase
```

## 2. Mudar

- Leia o trecho que vai mudar antes de editar. A tabela "Onde mexer" do `AGENTS.md` diz o arquivo.
- Mudança no cockpit: `artifact/index.html`. Mudança só do app (Firebase, Rotina, Admin): `app/src/`.
- Mudou permissão ou coleção: atualize `firestore.rules`/`storage.rules` **e** `tests/smoke.mjs`.
- Funcionalidade nova com risco de quebrar: acrescente uma checagem no `tests/smoke.mjs`.

## 3. Validar

```bash
npm run check
```

- Tudo precisa dar ✓. Se der ✗, conserte e rode de novo. Não comente nem pule checagem.
- `npm run check -- --rapido` pula o smoke. Use só no meio do trabalho, nunca antes do commit.
- Mudou algo visual: confira também a tela de verdade (`npm run app:ver`, ou a screenshot do smoke) em celular (390 px) e desktop.

## 4. Commitar

```bash
git add <arquivos que você mudou>      # nunca exports/, nunca app/public/, nunca .env
git commit -m "Área: o que mudou pra quem usa"
```

Mensagem em português, curta, focada no efeito ("Rotina: lembrete de água aceita água de coco"). Se o ambiente pedir linhas de coautoria, coloque no fim.

## 5. Publicar

```bash
git push
```

Se for rejeitado: `git pull --rebase`, rode `npm run check` de novo e faça o push.

O push na `main` dispara o Action **Deploy do app (Firebase)**: ele roda `npm run check` de novo e publica app, regras e funções. Mudança só em `docs/` publica o site público pelo GitHub Pages.

## 6. Conferir que está no ar

```bash
npm run deploy:verificar
```

Ele espera os Actions do commit e confere se https://odin-cockpit.web.app está servindo **esse** commit (pela marca `<meta name="odin-build">`) e se o site público responde.

- ✓: pode dizer que está no ar.
- ✗: abra o link do Action que ele mostra, leia o erro, conserte e volte ao passo 3.
- Erro de permissão do Google Cloud (IAM, API desligada, billing, OAuth): **não** mexa sozinho. Explique pra Elis o passo exato no console e confira depois.

## 7. Avisar

Em 1–3 frases, em português: o que mudou, onde ver, e o que a Elis precisa fazer (ex.: recarregar o app; no iPhone, fechar e abrir de novo).
