# language: pt
Funcionalidade: Próximas 12 horas e adiantar
  Como quem cuida do Odin
  Quero ver o que vem pela frente e poder adiantar o que é da próxima hora
  Para dar os remédios antes de sair de casa

  Cenário: Adiantar um remédio da próxima hora
    Ilustração: o lanche das 17:00 vai ser dado às 16:30 porque eu vou sair.
    Dado que eu posso registrar os cuidados do Odin
    E tem um remédio programado pra daqui a meia hora
    Quando eu volto para Hoje
    E eu adianto esse remédio
    Então ele aparece em "Agora" pra eu responder

  Cenário: O que é mais pra frente não pode ser adiantado ainda
    Ilustração: um remédio daqui a 5 horas.
    Dado que eu posso registrar os cuidados do Odin
    E tem um remédio programado pra daqui a 5 horas
    Quando eu volto para Hoje
    Então eu vejo esse remédio nas próximas 12 horas sem opção de adiantar

  Cenário: Listas do formulário começam em "Selecione"
    Dado que eu posso registrar os cuidados do Odin
    E eu estou em Registrar
    Quando eu vou anotar fezes
    Então a consistência começa em "Selecione"
