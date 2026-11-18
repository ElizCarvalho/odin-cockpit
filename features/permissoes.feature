# language: pt
Funcionalidade: Cada pessoa vê o que pode fazer
  Admin faz tudo; quem edita registra e responde lembretes; quem só vê não altera nada.
  A proteção de verdade está nas regras do Firestore; aqui conferimos que a tela acompanha.

  Cenário: Quem só vê não tem o botão Registrar
    Dado que sou quem só vê no celular
    Quando abro o app
    Então o botão "Registrar" não aparece
    E os lembretes aparecem sem formulário de resposta

  Cenário: Quem só vê, abrindo um link de Registrar, cai em Hoje
    Dado que sou quem só vê no celular
    Quando abro o app em "registrar"
    Então a parte "hoje" aparece

  Esquema do Cenário: Admin só aparece pra quem é admin
    Dado que sou <papel> no celular
    Quando abro o app
    E vou para "Mais"
    Então Admin <aparece> em Mais

    Exemplos:
      | papel      | aparece      |
      | admin      | aparece      |
      | quem edita | não aparece  |
      | quem só vê | não aparece  |
