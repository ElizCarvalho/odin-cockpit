# language: pt
Funcionalidade: Histórico do dia inteiro
  Como quem cuida do Odin
  Quero ver no Histórico tudo o que aconteceu em cada dia, do mais recente pro mais antigo
  Para não precisar caçar nas últimas 48 horas

  Cenário: O dia mostra remédios, temperatura e acontecimentos, o mais recente primeiro
    Ilustração: hoje teve remédio dado às 06:30 e temperatura de 38,4 °C às 07:00.
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro o histórico
    Então o dia de hoje mostra o remédio dado e a temperatura
    E o registro mais recente aparece primeiro

  Cenário: Filtrar só os remédios
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro o histórico
    E eu filtro o histórico por remédio
    Então só aparecem registros de remédio

  Cenário: Hoje não tem mais "Últimos acontecimentos"
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro o app
    Então eu não vejo a seção de últimos acontecimentos
