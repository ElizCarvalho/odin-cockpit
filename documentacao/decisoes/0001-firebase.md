# ADR 0001: Firebase como backend do app

**Status:** aceita · nov/2026

## Contexto

O cockpit começou como artefato do Claude, que guardava os dados no próprio artefato. Com o Odin em casa, isso não bastava mais. O cockpit passou a precisar de lembretes no celular a cada hora (push), de mais de uma pessoa registrando, de login, de acesso de qualquer aparelho e de nenhum servidor pra cuidar.

## Decisão

Usar **Firebase**: Auth (Google), Firestore (tempo real), Storage (fotos), Cloud Functions v2 (`tick` a cada minuto, `registrar` com IA, gatilho do site), Cloud Messaging (push) e Hosting (PWA).

## Alternativas consideradas

- **Supabase**: bom Postgres, mas push e funções agendadas exigiriam mais peças.
- **Servidor próprio (VPS)**: manutenção que ninguém quer fazer às 3 da manhã.
- **Continuar no artefato**: sem push, sem multiusuário.

## Consequências

- Plano gratuito cobre o uso. O Storage ficou em `us-east1` por causa da cota grátis.
- Regras de acesso (`firestore.rules`, `storage.rules`) viram parte do código e são testadas pelos papéis no smoke.
- Algumas configurações de nuvem (IAM, OAuth) só a dona do projeto faz. Elas estão em [operacao.md](../operacao.md).
