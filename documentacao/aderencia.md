# Aderência pra automação (método qa-testability-audit)

Parecer por elemento dos fluxos cobertos pelos cenários, feito em 18/11/2026 com a escada de locator do método **lunarpass-tests**:

1. papel;
2. papel + nome (`getByRole`);
3. `label` (`getByLabel`);
4. atributo funcional;
5. `data-testid`.

A prova foi a ação real nos cenários (`npm run bdd`): os passos agem no elemento, não só o acham na árvore.

**Avaliações possíveis:**
- **Adequado**: o locator da escada isola o elemento e a ação passa.
- **Localiza, não age**: nome e papel corretos, mas a ação padrão do Playwright falha.
- **Age, não isola o dado**: dá pra agir, mas o fato a conferir está misturado no texto do pai.
- **Insuficiente**: só XPath, classe CSS, id gerado ou leitura do bloco inteiro.

## Navegação

| Elemento | Situação antes | Ajuste feito | Locator | Avaliação |
|---|---|---|---|---|
| Seções (Hoje, Registrar…) | `tab` com o emoji no nome | Ícone com `aria-hidden` | `getByRole('tablist', {name: 'Seções'}).getByRole('tab', {name: /^Hoje/})` | Adequado |
| Bolinha de pendentes | Número solto dentro do nome da aba ("Hoje3") | `aria-label="3 pendentes"` na bolinha | `secao('Hoje').getByLabel(/pendentes?$/)` | Adequado |
| Partes de uma seção | Já eram `tab` | — | `getByRole('tablist', {name: 'Partes da seção'}).getByRole('tab', {name, exact})` | Adequado |

O nome da aba Hoje muda com a contagem ("Hoje 3 pendentes"). Por isso o locator ancora no começo (`/^Hoje/`), que não muda.

## Hoje

| Elemento | Situação antes | Ajuste feito | Locator | Avaliação |
|---|---|---|---|---|
| Lembrete pendente | `div` sem papel; título com emoji | `role="group"`, `aria-label="Lembrete <nome>"` | `getByRole('group', {name: /^Lembrete Manhã/})` | Adequado |
| Remédio dentro do bloco | `label` envolvendo o checkbox | — | `getByRole('checkbox', {name: /^Outro em uso/})` | Adequado |
| Campos (Bebida, Quanto) | `label` envolvendo o campo | — | `getByLabel('Bebida')` | Adequado |
| Água hoje / Calorias hoje | `div.tile` | `role="group"` + nome | `getByRole('group', {name: 'Água hoje'})` | Age, não isola o dado: o valor divide o texto com a porcentagem e a meta. Assertimos por expressão (`143 mL`). Sugestão: o valor num nó próprio, como `dt/dd` |
| Últimas 48 h | `div`s soltos | `role="list"` + `listitem` com nome do registro | `getByRole('list', {name: 'Últimas 48 h'}).getByRole('listitem', {name: /Outro em uso/})` | Adequado |
| "Dei depois" e "Que horas deu?" | Botão e `label` | — | `getByRole('button', {name: 'Dei depois'})`, `getByLabel('Que horas deu?')` | Adequado |

## Registrar

| Elemento | Situação antes | Ajuste feito | Locator | Avaliação |
|---|---|---|---|---|
| Botões de tipo | Emoji no nome ("💊Remédio dado") | Emoji com `aria-hidden` | `getByRole('button', {name: 'Remédio dado', exact: true})` | Adequado |
| Formulário aberto | `section` sem nome | `aria-label` ("Registrar Comida", "Peso", "Agendar consulta"…) | `getByRole('region', {name: 'Registrar Comida'})` | Adequado |

## Medicamentos

| Elemento | Situação antes | Ajuste feito | Locator | Avaliação |
|---|---|---|---|---|
| Listas Em uso / Pausados / Já usou | `div.list` | `role="list"` + nome | `getByRole('list', {name: 'Pausados'})` | Adequado |
| Remédio | `div.mrow` | `role="listitem"` + nome do remédio | `.getByRole('listitem', {name: 'Remédio teste', exact: true})` | Adequado |
| Abrir os detalhes | `<summary>` (sem papel no Playwright) | — | `getByRole('group').first().locator(':scope > summary')` | Localiza, não age por papel: o `summary` não tem papel ARIA. Sugestão: botão "ver detalhes" com `aria-expanded` |
| Motivo da pausa | Campo sem rótulo; o código lia o "irmão anterior" | `label` + `aria-label="Motivo da pausa"`; o código passou a procurar o campo dentro da caixa | `getByLabel('Motivo da pausa')` | Adequado |
| Confirmar pausa | Botão "pausar" igual ao que abre a caixa | Renomeado "confirmar pausa" | `getByRole('button', {name: 'confirmar pausa'})` | Adequado |

**Bug achado pela auditoria:** com o `label` novo, o código que lia o motivo pelo "irmão anterior" quebrava, e a pausa não salvava. O cenário "Pausar um remédio guarda o motivo" pegou o problema antes do commit.

**Melhoria de uso que veio junto:** a lista de remédios se redesenhava ao chegar um dado novo, fechando o remédio aberto e apagando o motivo em digitação. Agora ela mantém aberto o que estava aberto e não redesenha enquanto a pessoa digita.

## Admin

| Elemento | Situação antes | Ajuste feito | Locator | Avaliação |
|---|---|---|---|---|
| Card Notificações | `section` sem nome | `aria-label="Notificações"` | `getByRole('region', {name: 'Notificações'})` | Adequado |
| Grupo decúbito / água | `fieldset` sem nome; dois selects "A cada" iguais | `aria-label` no `fieldset` | `tipo('Troca de decúbito').getByRole('checkbox', …)` | Adequado |
| Lembretes → Horários | `div`s soltos | `role="list"` + `listitem` com o nome do horário | `getByRole('list', {name: 'Horários'}).getByRole('listitem', {name: /Oferecer água/})` | Adequado |

## Pendentes de testabilidade

1. Separar o valor de "Água hoje" e "Calorias hoje" num nó próprio (`dt`/`dd`), pra assertir sem expressão regular.
2. Trocar o `summary` dos remédios por um botão com `aria-expanded`.
3. O calendário usa `span role="button"` nos compromissos. Funciona, mas o certo é `<button>`.
