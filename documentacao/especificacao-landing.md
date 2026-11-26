# Especificação: landing do Munin Pet (muninpet.com.br)

Método lunarpass-tests (`qa-gherkin-design`), versão condensada. Fonte: a própria landing no ar em 25/11/2026 e as decisões da Elis na conversa de produto (dor primeiro, pesquisa anônima, contato só com consentimento, Bento como pet fictício).

## 1. Análise dos artefatos

**Explícito (está na página ou foi decidido)**
- A página abre com a dor ("O remédio das 14h já foi dado?"), um convite pra pesquisa e uma tela de exemplo do app.
- As telas do app usam um pet fictício (Bento) e passam numa sequência com setas.
- A história completa do Odin fica recolhida e abre a pedido. O vídeo toca sem som.
- A pesquisa tem duas partes: rotina de cuidado (q1 a q10) e app (q11 a q13). Quem responde que o pet não tem problema de saúde (q1 = Não) vai direto pras perguntas sobre o app, sem a de preço.
- Dá pra pular a parte 1 e ir só pra lista de espera.
- O contato é opcional e só é guardado com o consentimento marcado.
- O rodapé tem o WhatsApp da Elis com mensagem pronta e o aviso de privacidade (12 meses, apagar pelo WhatsApp).
- O endereço oficial é muninpet.com.br; o www e os outros domínios redirecionam pra ele.

**Derivável**
- O convite do topo leva à pesquisa (é o único destino coerente com o texto do botão).
- Na última tela do app não há "próxima" (a sequência tem fim).

**A investigar**
- O que acontece se a pessoa fechar a página no meio da parte 2 e voltar depois (a sessão recomeça ou continua?).
- Se a falta de internet no envio final deve guardar as respostas pra tentar depois.

## 2. Variantes e técnicas

- **Caminhos da pesquisa (tabela de decisão):** pet doente sim/não × pular ou responder × com ou sem contato. Ficaram três exemplos: sem pet doente (atalho), com pet doente e sem contato (caminho inteiro), só lista de espera. Com contato e consentimento ficou fora pra não gravar dado real em produção; a validação da função cobre esse caso no `npm run check`.
- **Consentimento (classes):** contato com consentimento (válido, coberto pela checagem) e contato sem consentimento (inválido, cenário abaixo).
- **Navegação nas telas (transição de estados):** início, meio e fim da sequência. Ficaram fim e volta; o início está no cenário da abertura.
- **Descartados:** e-mail versus WhatsApp no contato (mesma regra de consentimento) e cada um dos 13 itens da pesquisa (a estrutura é a mesma; o caminho inteiro cobre).

## 3. Especificação em Gherkin

**Funcionalidade:** Conhecer o Munin Pet e responder a pesquisa

**Contexto:**
**Dado** que eu abri a página do Munin Pet pelo celular

**Cenário:** Entendo a dor e o que o app faz logo na abertura
**Então** eu vejo a pergunta sobre o remédio da tarde
**E** eu vejo um convite pra responder a pesquisa
**E** eu vejo um exemplo de tela do app

**Cenário:** Vou direto pra pesquisa pelo convite do topo
**Quando** eu aceito o convite pra responder a pesquisa no topo da página
**Então** a pesquisa aparece na minha tela

**Cenário:** Passo pelas telas do app até a última e volto
Ilustração: seis telas, de "Bento · Hoje" até "Estoque".
**Quando** eu avanço pelas telas do app até a última
**Então** eu vejo a tela de estoque
**E** eu não consigo avançar além dela
**E** eu consigo voltar pra tela anterior

**Cenário:** Leio a história completa do Odin
**Quando** eu abro a história completa
**Então** eu vejo os capítulos da história com as fotos
**E** o vídeo do Odin fica sem som

**Cenário:** Sem pet doente, a pesquisa pula a rotina de cuidado
Ilustração: respondo "Não" na primeira pergunta.
**Quando** eu digo que meu pet não tem problema de saúde
**Então** a pesquisa me leva direto pras perguntas sobre o app
**E** a pergunta de preço não aparece

**Cenário:** Com pet doente, respondo tudo e recebo o agradecimento sem deixar contato
Ilustração: cão com cinomose há 1 a 6 meses, 2 pessoas cuidando.
**Quando** eu respondo a pesquisa inteira sem deixar contato
**Então** eu recebo o agradecimento
**E** eu posso compartilhar a página

**Cenário:** Meu contato só fica guardado se eu concordar
Ilustração: WhatsApp (21) 99999-0000.
**Dado** que eu cheguei na pergunta de contato
**Quando** eu deixo meu WhatsApp sem concordar com o uso do contato
**Então** a pesquisa me avisa que preciso concordar
**E** a pesquisa não termina

**Cenário:** Prefiro só entrar na lista de espera
**Quando** eu escolho só entrar na lista de espera
**Então** eu vou direto pras perguntas sobre o app e o contato

**Cenário:** Falo com a Elis pelo WhatsApp
**Quando** eu escolho falar com a Elis pelo WhatsApp
**Então** abre uma conversa com o número da Elis
**E** a mensagem já vem escrita

**Cenário:** Leio como meus dados são usados
**Quando** eu abro o aviso de privacidade
**Então** eu vejo por quanto tempo os dados ficam guardados
**E** eu vejo como pedir pra apagar

**Cenário:** O endereço com www me leva ao endereço oficial
Ilustração: www.muninpet.com.br → muninpet.com.br.
**Quando** eu acesso a página pelo endereço com www
**Então** eu chego na página pelo endereço oficial

## 4. Perguntas para os Três Amigos

**Bloqueia exemplo**

| # | Pergunta | Por quê |
|---|---|---|
| 1 | Quem fecha a página na parte 2 e volta depois deve continuar de onde parou ou recomeçar? | Hoje a sessão vive só na aba; não há regra definida. |

**Não bloqueia**

| # | Pergunta | Por quê |
|---|---|---|
| 2 | Se a internet cair no envio final, as respostas devem ficar guardadas pra tentar de novo depois? | Hoje aparece "Tentar de novo" e as respostas se perdem se a aba fechar (a parte 1 já fica salva). |
| 3 | Quem responde "Não" na primeira pergunta deveria ver a pergunta de preço? | Hoje ela some, e é justamente quem não tem a dor que diz quanto pagaria por prevenção. |
