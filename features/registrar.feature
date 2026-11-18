# language: pt
Funcionalidade: Registrar qualquer cuidado num lugar só
  Como quem cuida do Odin
  Quero lançar tudo pelo mesmo caminho
  Para não precisar lembrar em que tela fica cada coisa

  Contexto:
    Dado que eu posso registrar os cuidados do Odin
    E eu estou em Registrar

  Cenário: Comida contada em unidades entra nas calorias do dia
    Ilustração: 2 Biscrok Multi de 10 g somam 20 g; a 340 kcal/100 g, são 68 kcal.
    Quando eu registro que ele comeu biscoitos contados por unidade
    Então eu vejo a confirmação de que a comida foi registrada
    E as calorias de hoje passam a contar esses biscoitos pelo catálogo de alimentos

  Cenário: Remédio dado fora de hora registra só o que eu marquei
    Quando eu registro que dei apenas um dos remédios em uso
    Então esse remédio aparece como dado nas últimas 48 horas
    E nenhum remédio aparece como pulado

  Cenário: Peso registrado vira o peso mais recente
    Ilustração: 19,4 kg pesado em casa.
    Quando eu registro o peso dele
    Então o peso mais recente em Hoje é o que eu registrei

  Cenário: Xixi com escape vira um registro do dia
    Quando eu registro um xixi com escape
    Então eu vejo a confirmação de que o xixi foi registrado
    E esse xixi aparece nas últimas 48 horas

  Cenário: Consulta agendada aparece no calendário
    Ilustração: consulta com a neuro hoje às 15:00, lembrete 1 dia antes.
    Quando eu agendo uma consulta para hoje
    Então a consulta aparece no calendário de hoje
