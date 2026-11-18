# language: pt
Funcionalidade: Responder os lembretes do dia
  Como quem cuida do Odin
  Quero marcar o que dei, o que pulei e corrigir depois
  Para o histórico refletir o que de fato aconteceu

  Contexto:
    Dado que eu posso registrar os cuidados do Odin
    E há lembretes pendentes para hoje

  Cenário: Água de coco conta só pela água que ela tem
    Ilustração: 150 mL de água de coco, que é 95% água, somam 143 mL.
    Quando eu respondo o lembrete de água dizendo que ele bebeu água de coco
    Então eu vejo a confirmação de que a água foi registrada
    E a água de hoje soma só a parte de água da água de coco

  Cenário: No lembrete de vários remédios, registro o que dei e o que não dei
    Quando eu confirmo o lembrete da manhã deixando de fora um dos remédios
    Então o remédio que eu deixei de fora aparece como pulado nas últimas 48 horas
    E o lembrete da manhã sai da lista do que está pendente agora

  Cenário: Remédio pulado pode ser registrado como dado depois
    Ilustração: pulado às 09:30, dado às 11:28.
    Dado que eu pulei um remédio no lembrete da manhã
    Quando eu informo que dei esse remédio mais tarde
    Então ele aparece como dado no horário que eu informei
    E ele não aparece mais como pulado

  Cenário: Pular um lembrete tira ele do que está pendente
    Quando eu pulo o lembrete de um remédio
    Então esse lembrete sai da lista do que está pendente agora

  Cenário: Aviso de compra de remédio pode ser marcado como visto
    Quando eu marco como visto o aviso de compra de um remédio
    Então esse aviso sai da lista do que está pendente agora
