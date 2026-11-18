# language: pt
Funcionalidade: Registrar tudo num lugar só
  Qualquer coisa sobre o Odin é lançada em "Registrar".
  Cada botão abre só o formulário daquele tipo.

  Contexto:
    Dado que sou quem edita no celular
    E abro o app
    E vou para "Registrar"

  Cenário: Comida por unidade vira gramas e calorias
    Quando toco em "Comida"
    E escolho "Biscrok Multi" em "Alimento"
    E preencho "Quanto (g ou unidades)" com "2"
    E salvo
    Então fica registrado 2 Biscrok, 20 g e 68 kcal

  Cenário: Remédio dado fora de hora grava só o que foi marcado
    Quando toco em "Remédio dado"
    E marco "Remédio teste"
    E salvo
    Então o remédio "Remédio teste" fica como dado
    E nenhum outro remédio fica como pulado

  Cenário: Peso vira uma pesagem nos gráficos
    Quando toco em "Peso"
    E preencho o peso com "19.4"
    E salvo o peso
    Então existe uma pesagem de 19.4 kg

  Cenário: Xixi com escape vira acontecimento
    Quando toco em "Xixi"
    E escolho "com escape" em "Como"
    E salvo
    Então a linha do tempo ganha o acontecimento "Xixi com escape"

  Cenário: Agendar consulta com lembrete de 1 dia antes
    Quando toco em "Agendar consulta"
    E preencho a consulta "neuro" às "15:00"
    E salvo a consulta
    Então fica agendado "Consulta: neuro" com lembrete de 1440 minutos antes
