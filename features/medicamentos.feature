# language: pt
Funcionalidade: Medicamentos sem poluição
  O que está em uso vem primeiro; o que ele já usou fica recolhido.

  Contexto:
    Dado que sou admin no celular
    E abro o app em "remedios"

  Cenário: "Já usou" vem recolhido
    Então a lista "Já usou" está fechada
    E cada remédio em uso tem ícone

  Cenário: Pausar e retomar guarda o histórico
    Quando pauso "Remédio teste" com o motivo padrão
    Então "Remédio teste" aparece em Pausados com o motivo "aguardando a neuro"
    Quando retomo "Remédio teste"
    Então "Remédio teste" volta pra Em uso com 1 pausa no histórico
