# language: pt
Funcionalidade: Refeição planejada
  Como quem cuida do Odin
  Quero que o lembrete da refeição diga o que dar e, ao confirmar, peça quanto ele comeu de cada parte
  Para as calorias e a água saírem certas mesmo quando outra pessoa dá a comida

  Cenário: Dar o café da manhã anotando cada parte
    Ilustração: café da manhã = aprox. 100 g de ração úmida + aprox. 75 g de ração seca; ele comeu 95 g de Pet Delícia e 70 g de ração.
    Dado que eu posso registrar os cuidados do Odin
    E está na hora do café da manhã planejado
    Quando eu confirmo que dei o café da manhã
    Então o app pede quanto ele comeu de cada parte
    Quando eu anoto 95 g de ração úmida e 70 g de ração seca
    Então as duas partes ficam registradas como comida de hoje
