# language: pt
Funcionalidade: Metas de água e comida
  Como quem cuida do Odin
  Quero que a meta de água siga a conta da veterinária e ter meta de gramas de comida
  Para saber quanto oferecer em cada lembrete e se ele comeu o suficiente

  Cenário: Meta de água por hora vira quanto oferecer em cada lembrete
    Ilustração: 5 mL por kg por hora, Odin com 20 kg, lembrete de água a cada 2 h das 08 às 22 (8 lembretes) = 200 mL por lembrete, 1.600 mL no dia.
    Dado que eu administro o app
    E eu estou na administração
    Quando eu defino a água em 5 mL por kg por hora
    E eu volto para Hoje
    Então a meta de água de hoje é 1.600 mL com uns 200 mL por lembrete

  Cenário: Meta de gramas de comida aparece em Hoje
    Ilustração: meta de 680 g de comida por dia.
    Dado que eu administro o app
    E eu estou na administração
    Quando eu defino a meta de comida em 680 g
    E eu volto para Hoje
    Então eu vejo quanto ele comeu hoje contra a meta de 680 g
