# language: pt
Funcionalidade: Faixas de temperatura combinadas com a veterinária
  Como quem cuida do Odin
  Quero que o app use a faixa que a veterinária passou
  Para não tratar como febre o que não é

  Esquema do Cenário: Como cada temperatura aparece em Hoje
    Ilustração: até 39,4 ok; 39,5 estado febril; 39,6 ou mais é febre.
    Dado que eu posso registrar os cuidados do Odin
    Quando a última temperatura anotada é <temperatura> °C
    Então o quadro de temperatura mostra "<situação>"

    Exemplos:
      | temperatura | situação      |
      | 39,4        | na faixa      |
      | 39,5        | estado febril |
      | 39,6        | febre         |
