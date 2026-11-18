# language: pt
Funcionalidade: Cada pessoa vê o que pode fazer
  Como quem administra o app
  Quero que cada pessoa veja só o que pode fazer
  Para ninguém alterar o que não deve
  A proteção de verdade está nas regras do Firestore; aqui a tela acompanha.

  Cenário: Quem só acompanha não tem como registrar
    Dado que eu só acompanho o Odin
    Quando eu abro o app
    Então eu não encontro a seção Registrar
    E os lembretes aparecem sem opção de resposta

  Cenário: Quem só acompanha, ao abrir um link de registro, vai para Hoje
    Dado que eu só acompanho o Odin
    Quando eu abro um link que leva para Registrar
    Então eu vou para Hoje

  Esquema do Cenário: A administração só aparece para quem administra
    Dado que eu <perfil>
    Quando eu abro "Mais"
    Então a administração <resultado>

    Exemplos:
      | perfil                               | resultado   |
      | administro o app                     | aparece     |
      | posso registrar os cuidados do Odin  | não aparece |
      | só acompanho o Odin                  | não aparece |
