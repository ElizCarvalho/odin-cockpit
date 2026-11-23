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

  Cenário: Remédio junta as doses, o começo e o fim de cada remédio
    Ilustração: o "Remédio teste" começou hoje; o "Cadastro duplicado" foi marcado como duplicado.
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro o histórico
    Então não existe filtro separado de medicamento
    E eu filtro o histórico por remédio
    E o dia de hoje mostra que o Remédio teste começou
    E o cadastro duplicado não aparece

  Cenário: Buscar no histórico
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro o histórico
    E eu busco "vitamína" no histórico
    Então só aparecem registros com "Vitamina"

  Cenário: Busca sem resultado
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro o histórico
    E eu busco "xarope de groselha" no histórico
    Então o histórico diz que não encontrou nada
