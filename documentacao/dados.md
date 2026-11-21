# Modelo de dados (Firestore)

Todas as coleções ficam na raiz. A regra geral (`firestore.rules`) é: **membro lê; admin e edita escrevem**. As exceções são `acl` (só admin) e `tokens` (cada aparelho grava o seu).

**"Público?"** diz se a coleção vai pro site anonimizado (`scripts/exportar-firestore.mjs`).

| Coleção | Público? | O que guarda | Campos principais |
|---|---|---|---|
| `exams` | sim | Exames e pesagens | `date`, `time`, `kind` (Hemograma, Pesagem…), `lab`, `params{ht, hb, peso, …}`, `other[]` |
| `events` | sim | Acontecimentos, xixi/fezes, compromissos | `date`, `time`, `text`, `mark` (aparece nos gráficos), `kind` (`fezes`, `urina`, `consulta`), `remind` (min antes) |
| `meds` | sim (sem estoque) | Medicamentos e suplementos | `name`, `dose`, `start`, `end`, `clinic`, `kind` (`med`/`sup`), `form`, `paused`, `pauseReason`, `pauses[]`, `stock{qty, unit, perDay, countedAt, lead, onList}` |
| `supplies` | não | Estoque de comida e suprimentos (gaze, sonda, seringa, luva…) | `name`, `cat` (`comida`/`suprimento`), `qty`, `unit`, `perDay`, `countedAt`, `lead` (dias de aviso), `onList` (pus na lista), `alertedFor` |
| `prevent` | sim | Vacinas, vermífugos, prevenção | `kind`, `product`, `date`, `next`, `plan` |
| `vitals` | sim | Temperatura, água, comida | `date`, `time`, `temp`, `water_ml`, `drinkId`, `food_g`, `foodId`, `qty`, `unit`, `source` (`rotina`, `chat`, `manual`) |
| `photos` | sim | Fotos e vídeos (arquivo no Storage `blobs/<assetId>`) | `assetId`, `date`, `time`, `caption`, `video` |
| `analyses` | sim | "Avaliação do quadro" gerada pela IA | `text`, `createdAt` |
| `foods` | sim | Catálogo de alimentos e bebidas | `name`, `kind` (`comida`/`bebida`), `kcal100`, `water` (fração), `unit` (`g`/`mL`/`un`), `gUnit`, `match` (regex), `est` |
| `schedule` | não | Horários de lembrete | `kind`, `label`, `times[]` **ou** `every` + `from`/`to`, `days[]`, `everyDays` + `anchor`, `from_date`, `until`, `items[{medId, name, dose}]`, `active` |
| `notifs` | não | Um lembrete de um horário: `notifs/{schedId}_{AAAA-MM-DD}_{HHMM}` | `kind`, `label`, `items`, `date`, `time`, `status` (`pending`/`done`/`partial`/`skipped`), `suggest` (decúbito), `renotified` |
| `rotina_log` | não | O que foi dado ou feito em resposta (ou fora de hora) | `date`, `time`, `kind`, `label`, `medId`, `status` (`done`/`skipped`), `block`, `side`, `note`, `planned` (quando "dei depois") |
| `auditoria` | não (só admin lê) | Quem criou, editou ou apagou cada registro | `acao` (`criou`/`editou`/`apagou`), `col`, `docId`, `by`, `byName`, `at`, `resumo`, `campos[]` |
| `tokens` | não | Aparelhos que recebem push | id = token FCM; `email`, `ua`, `at` |
| `acl/users` | não | Quem acessa | `emails[]`, `roles{email: admin\|edit\|view}`, `notify{email: bool}` |
| `meta/*` | parcial | Configurações | `goals{water_ml, kcal, food_g, water_rule{mlkgh, every, n}}` (público), `status` (público), `notificacoes{med, compra, consulta, pushover{tipo: desligado|normal|critico|insistente}}`, `publico{dirtyAt, sentAt}`, `usage` |

## Regras de negócio que moram no dado

- **Remédio pausado** (`paused: true`) não gera lembrete nem aviso de compra. Ao retomar, a pausa vai pra `pauses[]`.
- **Fim do estoque**: `countedAt + floor(qty / perDay)` dias. O aviso de compra sai às 10:00, `lead` dias antes (padrão 5).
- **Água do dia** = bebidas × `water` de cada uma + comida × `water` do alimento. A meta é `meta/goals.water_ml` ou, sem meta salva, 50 mL/kg do último peso.
- **Calorias** = soma de `kcal100` × quantidade. A meta sugerida é 1,6 × 70 × peso^0,75.
- **Próximo decúbito**: depois de um lateral vem o esternal; depois do esternal, o lateral oposto ao último (`proximoLado` em `functions/index.js`).

## Fora do repositório

Dados reais vivem só no Firestore e no Storage. `exports/` e `odin-export-*.json` estão no `.gitignore`, e o `npm run check` para se encontrar export bruto versionado.


## Quem fez

Toda escrita feita pelo app leva `_by` (e-mail), `_byName` (primeiro nome) e `_at` (shim.js). A função `marcarSitePublico` grava em `auditoria` cada criação e edição carimbada; o app grava as exclusões (com o resumo do que foi apagado). Só admin lê `auditoria`, em Mais → Atividade.
