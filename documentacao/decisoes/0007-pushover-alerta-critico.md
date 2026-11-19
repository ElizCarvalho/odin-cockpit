# 0007 · Pushover para alerta crítico no celular

**Contexto.** O app é um PWA. No iPhone, PWA não consegue "Alerta crítico" (tocar no silencioso / Foco): a Apple só libera esse direito para apps nativos aprovados. Remédio da madrugada (Tobramicina 00:00) não pode passar batido.

**Decisão.** Além do push normal (FCM), o `tick` manda o mesmo aviso pelo Pushover, que tem o direito de Alerta crítico no iOS. O nível é escolhido por tipo no Admin (`meta/notificacoes.pushover`):

| nível | prioridade Pushover | efeito |
|---|---|---|
| não manda | — | só o push normal |
| normal | 0 | notificação comum |
| crítico | 1 | toca mesmo no silencioso (com "Critical Alerts" ligado no app Pushover) |
| insistente | 2 | repete a cada 1 min por até 30 min até alguém responder no Cockpit ou tocar em "Acknowledge" |

Padrão: remédios e compromissos = crítico; o resto = normal. Quando o aviso é respondido no app (feito, pulei, visto), a função `marcarSitePublico` vê `notifs/*` sair de `pending` e cancela o insistente (`cancel_by_tag`).

**Consequências.** Mais um segredo (`PUSHOVER_TOKEN`, `PUSHOVER_USER`, só nos secrets do GitHub). Sem eles, o app segue funcionando só com o push normal.
