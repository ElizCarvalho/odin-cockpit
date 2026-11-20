# language: pt
Funcionalidade: Organizar os horários dos remédios
  Como quem cuida do Odin
  Quero mudar um remédio de horário e achar as coisas em ordem
  Para não precisar caçar nada na correria

  Cenário: Mudar um remédio para um horário só dele
    Ilustração: o biscoito manipulado saía no almoço e passa a ser às 17:00.
    Dado que eu posso registrar os cuidados do Odin
    Quando eu passo um remédio do horário da manhã para um horário próprio às 17:00
    Então eu vejo a confirmação de que o horário foi criado
    E o horário novo aparece na lista de horários
    E o remédio não aparece mais no horário da manhã

  Cenário: Horários em ordem alfabética
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro "Lembretes" em "Mais"
    Então os horários aparecem em ordem alfabética

  Cenário: Remédios em uso em ordem alfabética
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro "Medicamentos" em "Mais"
    Então os remédios em uso aparecem em ordem alfabética

  Cenário: Ampliar o gráfico de temperatura
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro "Evolução"
    E eu amplio o gráfico de temperatura
    Então eu vejo a temperatura ampliada
