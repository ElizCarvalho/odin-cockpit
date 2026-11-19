# language: pt
Funcionalidade: Medicamentos sem poluição
  Como quem cuida do Odin
  Quero ver primeiro o que ele toma hoje
  Para achar dose e estoque sem passar por remédio antigo

  Contexto:
    Dado que eu administro o app
    E eu estou em Medicamentos

  Cenário: Remédios que ele já usou ficam recolhidos
    Então a lista do que ele já usou fica recolhida

  Cenário: Pausar um remédio guarda o motivo
    Ilustração: motivo "aguardando a neuro".
    Quando eu pauso um remédio em uso informando o motivo
    Então ele aparece entre os pausados com o motivo

  Cenário: Retomar um remédio pausado guarda o histórico da pausa
    Dado que um remédio em uso foi pausado
    Quando eu retomo esse remédio
    Então ele volta para os remédios em uso
    E o histórico dele mostra a pausa

  Cenário: Suplemento pausado antes de começar não aparece no histórico como começado
    Ilustração: Spirulina e Happy Bones, pausados "aguardando a neuro" antes da primeira dose.
    Dado que um suplemento foi pausado antes de começar
    Quando eu abro o histórico
    Então ele não aparece no histórico como começado
