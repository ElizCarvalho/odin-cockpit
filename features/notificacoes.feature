# language: pt
Funcionalidade: Escolher o que vira notificação
  Como quem administra o app
  Quero ligar e desligar cada tipo de aviso
  Para receber só o que me ajuda a cuidar do Odin

  Cenário: Ligar decúbito e água cria os horários desses avisos
    Ilustração: decúbito a cada 4 h e água a cada 2 h, das 8h às 22h.
    Dado que eu administro o app
    E eu estou na administração
    Quando eu ligo os avisos de troca de decúbito e de água
    Então troca de decúbito e oferecer água aparecem entre os horários dos lembretes

  Cenário: Desligar os avisos de compra fica guardado
    Dado que eu administro o app
    E eu estou na administração
    Quando eu desligo os avisos de compra de remédio
    E eu volto mais tarde à administração
    Então os avisos de compra de remédio continuam desligados

  Cenário: Escolher quão alto cada aviso toca no celular fica guardado
    Ilustração: remédio "insistente" (repete até eu responder); água continua "normal".
    Dado que eu administro o app
    E eu estou na administração
    Quando eu deixo o alerta de remédios no celular como insistente
    E eu volto mais tarde à administração
    Então o alerta de remédios no celular continua insistente
    E o alerta de água no celular continua normal
