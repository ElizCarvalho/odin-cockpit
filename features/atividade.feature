# language: pt
Funcionalidade: Atividade (quem fez o quê)
  Como admin do app
  Quero saber quem lançou, mudou ou apagou cada registro
  Para entender o histórico quando mais de uma pessoa cuida do Odin

  Cenário: Admin vê quem fez cada coisa e filtra por pessoa
    Ilustração: Elis lançou 150 mL de água de coco; Brenda apagou um evento repetido.
    Dado que eu administro o app
    Quando eu abro "Atividade" em "Mais"
    Então eu vejo que a Elis lançou a água de coco e a Brenda apagou o evento
    Quando eu filtro a atividade pela Brenda
    Então só aparece o que a Brenda fez

  Cenário: Quem não é admin não vê a atividade
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro "Mais"
    Então eu não encontro a parte de atividade
