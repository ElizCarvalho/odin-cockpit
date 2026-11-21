# language: pt
Funcionalidade: Lançar comida caseira
  Como quem cuida do Odin
  Quero descrever a receita da comida caseira
  Para a IA calcular calorias e água sem eu precisar fazer conta

  Cenário: Escolher comida caseira pede a receita
    Ilustração: patê de 300 g de moela, 1 batata-doce e 1 cenoura.
    Dado que eu posso registrar os cuidados do Odin
    E eu estou em Registrar
    Quando eu vou anotar uma comida caseira
    Então o app pede a receita da comida caseira

  Cenário: Comida do catálogo não pede receita
    Dado que eu posso registrar os cuidados do Odin
    E eu estou em Registrar
    Quando eu vou anotar uma comida do catálogo
    Então o app não pede receita
