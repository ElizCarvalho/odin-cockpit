# Operação

## Segredos (GitHub → Settings → Secrets and variables → Actions)

| Secret | Pra quê | Quem usa |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Deploy e export do Firestore | Os dois Actions |
| `ANTHROPIC_API_KEY` | Leitura automática (função `registrar`) | Escrita em `functions/.env` no deploy |
| `GH_DISPATCH_TOKEN` | O `tick` dispara a publicação do site. É um token fine-grained, só neste repo, com "Actions: read and write" e validade de 1 ano | Escrita em `functions/.env` no deploy |

Nunca colar chave no chat nem em arquivo versionado. O `npm run check` procura vazamentos.

**Token vencido:** o site para de se atualizar sozinho, mas o cron de 6 h segue publicando. Gere um novo e troque o secret. O próximo deploy já leva o token novo.

## Permissões no Google Cloud (projeto `odin-cockpit`)

A conta de serviço do deploy (`firebase-adminsdk-…`) tem: Editor, Firebase Admin, Cloud Functions Admin, Cloud Run Admin e Service Account User.

Os agentes de serviço precisaram de:

| Principal | Papel | Por quê |
|---|---|---|
| `service-516260936928@gcp-sa-firebasestorage.iam.gserviceaccount.com` | Firebase Rules Firestore Service Agent | `storage.rules` consulta o Firestore (`acl`) |
| `516260936928-compute@developer.gserviceaccount.com` | Eventarc Event Receiver, Cloud Run Invoker | Gatilho `marcarSitePublico` |
| `service-516260936928@gcp-sa-pubsub.iam.gserviceaccount.com` | Service Account Token Creator | Entrega de eventos do Eventarc |

APIs ligadas: Cloud Billing, Cloud Functions, Cloud Build, Cloud Run, Cloud Scheduler, Eventarc, Pub/Sub, Artifact Registry. O OAuth tem `https://odin-cockpit.web.app/__/auth/handler` nos redirecionamentos autorizados.

## Quando algo quebra

| Sintoma | Onde olhar | Saída comum |
|---|---|---|
| `deploy:verificar` deu ✗ | O link do Action que ele mostra | Ler o primeiro erro. Se for check, reproduzir local com `npm run check` |
| "Permission denied while using the Eventarc Service Agent" | Log do deploy | Esperar 5 min (propagação) e rodar o job de novo |
| "We failed to modify the IAM policy" | Log do deploy (ele lista os `gcloud … --role=…`) | A pessoa dá o papel listado no IAM |
| Login no iPhone: "solicitação inválida" | OAuth client | Conferir o redirect URI acima |
| Foto não sobe ("storage/unauthorized") | `storage.rules` + IAM | Papel do agente do Storage (tabela acima) |
| Lembrete não chega | Admin → Notificações; Mais → Lembretes → "Ativar notificações"; coleção `tokens` | No iPhone, abrir pelo ícone da tela inicial antes de ativar |
| Site público parado | `meta/publico` (`dirtyAt`, `sentAt`, `lastStatus`) | `lastStatus` 401 ou 403 é token vencido ou sem permissão |
| App velho no celular | Faixa "Nova versão disponível" | Tocar nela. Sem faixa, fechar e abrir o app |

## Disparar o site público na mão

```bash
gh api -X POST repos/ElizCarvalho/odin-cockpit/actions/workflows/publicar-site.yml/dispatches -f ref=main
```
