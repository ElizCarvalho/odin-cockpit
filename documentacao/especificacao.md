# Especificação por exemplos (método qa-gherkin-design)

Feita com a skill `qa-gherkin-design` do método **lunarpass-tests** (Método ADT), nas cinco etapas: análise, variantes, técnicas, Gherkin declarativo e revisão. A versão executável dos mesmos cenários está em [`features/`](../features/). Esta página é a versão pra conversar com a equipe (Três Amigos), em Markdown que dá pra colar no Notion.

## 1. Análise dos artefatos

**Artefatos:** os pedidos da tutora na conversa de desenvolvimento (17 e 18/11/2026), as receitas cadastradas, o ADR 0004 (navegação por tarefa) e a auditoria de UX de 18/11.

**Atores:**
- quem administra o app (a tutora);
- quem pode registrar os cuidados (familiar, cuidador);
- quem só acompanha (amigo, outra vet).

| Regra | Origem |
|---|---|
| O app se organiza em Hoje, Registrar, Evolução, Histórico e Mais | **Explícita** (pedido + ADR 0004) |
| No celular, a navegação fica embaixo; no computador, em cima | **Explícita** (proposta aprovada) |
| Todo lançamento fica em Registrar | **Explícita** ("um lugar só pra lançar tudo") |
| Remédio pulado pode ser registrado como dado depois, no horário informado | **Explícita** ("como eu posso dar um remédio no horário que já passou?") |
| Lembrete de vários remédios grava o que foi dado e o que foi pulado | **Explícita** (rotina por blocos aprovada) |
| Água de coco, iogurte, patê e ração úmida contam como água | **Explícita** ("pate, ração úmida também conta junto com água de coco") |
| A água da bebida conta pela fração de água do catálogo | **Derivável** (consequência de "conta junto" + catálogo com teor de água) |
| Comida contada em unidades vira gramas e calorias pelo catálogo | **Derivável** (pedido de controle calórico + Biscrok contado em unidades) |
| Ligar decúbito e água cria horários de lembrete; desligar compras para os avisos de compra | **Explícita** (card de Notificações aprovado) |
| Quem só vê não registra nada; Admin só pra admin | **Explícita** (pedido de papéis) |
| Remédio pausado guarda o motivo e, ao retomar, o histórico da pausa | **Explícita** ("além do excluir, tem o pausar?") |
| "Já usou" vem recolhido | **Derivável** (auditoria: 28 remédios antigos poluindo a tela) |
| Se a meta de água já bateu, o lembrete de água não sai | **Explícita** (proposta aprovada), coberta na função, fora da interface |
| Decúbito ao longo da madrugada | **A investigar** (escolhido "só de dia"; sem regra pra quando ele não muda sozinho à noite) |

## 2. Mapa de variantes e técnicas aplicadas

| Regra | Técnica | Variantes | Descartadas (por quê) |
|---|---|---|---|
| Navegação por tamanho de tela | Classes de equivalência | celular, computador | tablet: mesma classe de um dos dois, sem regra própria |
| Cada parte cabe na tela | Combinação (seção × parte) | as 9 partes, num esquema só | — |
| Papéis | Tabela de decisão | admin / registra / só acompanha × Admin visível | combinações com Registrar ficaram em cenário próprio (regra diferente) |
| Bloco de remédios | Transição de estados | pendente → feito / parcial / pulado; pulado → dado depois | "todos pulados" é o mesmo comportamento do "pular" |
| Água pela fração | Classes de equivalência | bebida com água < 100% (coco) | água pura: não verifica a fração |
| Pausar e retomar | Transição de estados | em uso → pausado → em uso (com histórico) | encerrar: regra diferente, fora do pedido |

## 3. Especificação em Gherkin declarativo

**Pauta da mesa:**
- Remédio pulado pode ser registrado como dado depois.
- No lembrete de vários remédios, registro o que dei e o que não dei.
- Quem só acompanha, ao abrir um link de registro, vai para Hoje.
- Desligar os avisos de compra fica guardado.

**Funcionalidade:** Responder os lembretes do dia  
**Contexto:**  
**Dado** que eu posso registrar os cuidados do Odin  
**E** há lembretes pendentes para hoje  

**Cenário:** Água de coco conta só pela água que ela tem  
**Quando** eu respondo o lembrete de água dizendo que ele bebeu água de coco  
**Então** a água de hoje soma só a parte de água da água de coco  
**Ilustração:** 150 mL de água de coco, que é 95% água, somam 143 mL.

**Cenário:** No lembrete de vários remédios, registro o que dei e o que não dei  
**Quando** eu confirmo o lembrete da manhã deixando de fora um dos remédios  
**Então** o remédio que eu deixei de fora aparece como pulado nas últimas 48 horas  
**E** o lembrete da manhã sai da lista do que está pendente agora

**Cenário:** Remédio pulado pode ser registrado como dado depois  
**Dado** que eu pulei um remédio no lembrete da manhã  
**Quando** eu informo que dei esse remédio mais tarde  
**Então** ele aparece como dado no horário que eu informei  
**E** ele não aparece mais como pulado  
**Ilustração:** pulado às 09:30, dado às 11:28.

**Cenário:** Pular um lembrete tira ele do que está pendente  
**Quando** eu pulo o lembrete de um remédio  
**Então** esse lembrete sai da lista do que está pendente agora

**Funcionalidade:** Registrar qualquer cuidado num lugar só  
**Contexto:**  
**Dado** que eu posso registrar os cuidados do Odin  
**E** eu estou em Registrar  

**Cenário:** Comida contada em unidades entra nas calorias do dia  
*Hipótese a validar: o peso de cada unidade e as calorias vêm do catálogo de alimentos, ajustável no Admin.*  
**Quando** eu registro que ele comeu biscoitos contados por unidade  
**Então** as calorias de hoje passam a contar esses biscoitos pelo catálogo de alimentos  
**Ilustração:** 2 Biscrok Multi de 10 g somam 20 g; a 340 kcal/100 g, são 68 kcal.

**Cenário:** Remédio dado fora de hora registra só o que eu marquei  
**Quando** eu registro que dei apenas um dos remédios em uso  
**Então** esse remédio aparece como dado nas últimas 48 horas  
**E** nenhum remédio aparece como pulado

**Cenário:** Peso registrado vira o peso mais recente  
**Quando** eu registro o peso dele  
**Então** o peso mais recente em Hoje é o que eu registrei

**Cenário:** Xixi com escape vira um registro do dia  
**Quando** eu registro um xixi com escape  
**Então** esse xixi aparece nas últimas 48 horas

**Cenário:** Consulta agendada aparece no calendário  
**Quando** eu agendo uma consulta para hoje  
**Então** a consulta aparece no calendário de hoje

As funcionalidades de navegação, notificações, permissões e medicamentos seguem o mesmo formato, nos arquivos [`navegacao.feature`](../features/navegacao.feature), [`notificacoes.feature`](../features/notificacoes.feature), [`permissoes.feature`](../features/permissoes.feature) e [`medicamentos.feature`](../features/medicamentos.feature).

## 4. Perguntas para os Três Amigos

**Bloqueia exemplo**

| # | Pergunta | Afeta |
|---|---|---|
| 1 | Se um remédio do lembrete ainda pendente é registrado como "dado fora de hora", o que acontece com esse lembrete? | Registrar × Lembretes |
| 2 | Quando um remédio pulado é "dado depois", o estoque deve ser descontado? | Dei depois, estoque |
| 3 | O lembrete de decúbito deve considerar a madrugada quando ele não muda de posição sozinho? | Notificações |

**Não bloqueia**

| # | Pergunta | Afeta |
|---|---|---|
| 4 | As metas de água e calorias são as que a veterinária definir? Hoje valem as sugeridas pelo peso. | Hoje, lembrete de água |
| 5 | Quem só acompanha deve poder receber os avisos no celular? | Permissões, Notificações |
| 6 | Peso medido na clínica e peso de casa devem aparecer separados na evolução? | Evolução |
| 7 | Um remédio pausado deve continuar aparecendo nos lembretes como "pausado", ou só sumir? | Lembretes, Medicamentos |

## Revisão

Os cenários antigos (até 18/11) eram imperativos: "toco em", "preencho … com", "80 px", "a parte remedios". Na revisão eles foram reescritos em 1ª pessoa, no nível do negócio. Valores que só ilustram passaram pra **Ilustração**, e as regras deriváveis foram marcadas como hipótese. Ficaram **7 perguntas** em aberto: 3 bloqueiam exemplo, 4 não.
