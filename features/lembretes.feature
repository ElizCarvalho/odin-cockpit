# language: pt
Funcionalidade: Responder os lembretes do dia
  O lembrete aparece em "Hoje" na hora certa. Quem edita marca o que deu,
  pula o que não deu e pode corrigir depois.

  Contexto:
    Dado que sou quem edita no celular
    E abro o app

  Cenário: Água pelo lembrete conta a água de coco como 95% água
    Quando respondo o lembrete de "Água" com 150 mL de "Água de coco"
    Então a água de hoje soma 143 mL

  Cenário: Bloco de remédios grava um registro por remédio
    Quando desmarco "Outro em uso" no lembrete "Manhã"
    E confirmo o lembrete "Manhã"
    Então o lembrete "Manhã" fica parcial
    E "Remédio teste" fica dado e "Outro em uso" fica pulado

  Cenário: Dar depois um remédio que tinha ficado como pulado
    Dado que pulei "Outro em uso" no lembrete "Manhã"
    Quando digo que dei "Outro em uso" às "11:28"
    Então "Outro em uso" fica dado às "11:28" com a nota de atraso

  Cenário: Pular um lembrete
    Quando pulo o lembrete "Remédio teste"
    Então o lembrete "Remédio teste" fica pulado
