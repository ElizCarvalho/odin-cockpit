# Esteira com IA: como este projeto é desenvolvido

Quase todo o código foi escrito por um agente de IA (Claude), conversando em português com a dona do projeto. Ela é engenheira, mas usa o app como tutora, não como dev. Este documento descreve o que faz isso funcionar sem virar bagunça.

## 1. Regras que valem pra qualquer agente

- **`AGENTS.md`** é a fonte das regras: esteira, onde mexer, o que não se quebra, infra.
- **`CLAUDE.md`** só aponta pro `AGENTS.md` e pra skill da esteira.
- **`.cursor/rules/odin-esteira.mdc`** faz o mesmo no Cursor.
- **`.claude/skills/esteira/SKILL.md`** é o passo a passo de entrega como skill reutilizável.

Com isso, trocar de ferramenta (Claude no app, Claude Code, Cursor) não muda o processo.

## 2. A esteira

```
git pull --rebase  →  mudar  →  npm run check  →  commit (pt-BR)  →  git push  →  npm run deploy:verificar  →  contar em 1–3 frases
```

- **O check é o mesmo no laptop e no CI.** Se passou local, o CI não tem surpresa.
- **"Está no ar" só depois do `deploy:verificar`.** Ele espera os Actions do commit e confere a meta `odin-build` servida em produção. Isso pegou deploys que "passaram" mas não subiram.
- **Commit em português, dizendo o que muda pra quem usa**, com as linhas de coautoria do agente.

## 3. Limites claros pro agente

| O agente faz | Quem decide ou faz é a pessoa |
|---|---|
| Código, testes, documentação, commit, push, verificação | Configurar IAM, OAuth, billing e APIs no Google Cloud (o agente explica o passo a passo e confere depois) |
| Ler e escrever dados pelo app, com a sessão da pessoa, quando ela pede | Criar ou colar chaves e tokens: vão direto pros secrets do GitHub, nunca pro chat |
| Sugerir mudança clínica | Mudar dose, data ou valor de exame. O agente só registra o que a pessoa ou a receita diz |
| Apagar arquivo ou dado | Confirmar exclusão definitiva |

## 4. O que funcionou

- **Mudança pequena, entregue inteira.** Cada pedido vira um commit que passa no check e está no ar. Nada fica "meio feito" esperando.
- **O teste nasce junto com a funcionalidade.** Cada bug achado em uso real virou uma linha no smoke ou um cenário. Alguns exemplos:
  - o `prompt()` bloqueado no iPhone virou "o teste falha se abrir caixa de diálogo";
  - a classe `.today` que colidia virou "nada solto por cima do calendário";
  - o texto cortado virou "o texto da visão Dia não fica cortado".
- **Testar com papéis e tamanhos.** Admin, edita e só vê, a 390 e a 1440 px. Boa parte dos problemas só aparecia no celular.
- **Fonte única de interface.** App e site público usam o mesmo HTML. A IA não precisa manter duas versões em sincronia.
- **Pedir pro agente auditar a própria obra.** A reorganização da navegação ([ADR 0004](decisoes/0004-navegacao-por-tarefa.md)) saiu de uma revisão de UX pedida em uma frase: "eu mesma me perco".

## 5. O que deu errado (e virou regra)

| Aconteceu | Virou |
|---|---|
| O agente respondeu em inglês no meio da conversa | Regra: sempre em português, na conversa e na interface |
| Deploy falhou por falta de papel no IAM ("Eventarc Event Receiver" etc.) | `operacao.md` lista as permissões. O agente lê o log e diz exatamente qual papel falta |
| O agendamento do GitHub (`cron`) quase não rodava | O site passou a ser disparado pelo Firebase quando o dado muda. O cron ficou como rede de segurança |
| Instrução velha ficou na tela ("exporte o JSON e rode no terminal") | Revisão periódica de UX procurando texto obsoleto. Agora tem cenário: "o card antigo não existe mais" |
| O formulário perdia a seleção quando um dado novo chegava em tempo real | A re-renderização preserva o que a pessoa já mexeu. O cenário de xixi cobre isso |

## 6. Como pedir uma mudança (pra quem usa)

Fale como fala de uso: "no lembrete da noite, coloca o Mantidan", "quando eu pulo um remédio, como dou depois?". O agente:

1. faz o ajuste de dado na hora, se for dado;
2. muda o código, se for comportamento, com teste;
3. entrega no ar e diz em 1–3 frases o que mudou e onde ver.
