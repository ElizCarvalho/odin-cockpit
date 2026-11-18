# language: pt
Funcionalidade: Navegação pelo que a pessoa quer fazer
  Pra não se perder, o app se organiza em 5 seções:
  Hoje (o que fazer agora), Registrar (lançar qualquer coisa), Evolução (como ele está),
  Histórico (o que aconteceu) e Mais (medicamentos, vacinas, lembretes e admin).

  Cenário: No celular, as seções ficam numa barra embaixo
    Dado que sou admin no celular
    Quando abro o app
    Então vejo as seções "Hoje, Registrar, Evolução, Histórico, Mais" no menu
    E o menu fica preso embaixo da tela, com no máximo 80 px de altura

  Cenário: No computador, o menu fica em cima
    Dado que sou admin no computador
    Quando abro o app
    Então vejo as seções "Hoje, Registrar, Evolução, Histórico, Mais" no menu
    E o menu fica em cima da página

  Esquema do Cenário: Cada parte abre inteira na tela do celular
    Dado que sou admin no celular
    Quando abro o app em "<parte>"
    Então a parte "<parte>" aparece
    E nada passa da largura da tela

    Exemplos:
      | parte     |
      | hoje      |
      | registrar |
      | exames    |
      | linha     |
      | fotos     |
      | remedios  |
      | vacinas   |
      | lembretes |
      | admin     |

  Cenário: "Mais" junta o que se consulta de vez em quando
    Dado que sou admin no celular
    Quando abro o app
    E vou para "Mais"
    Então vejo as partes "Medicamentos, Vacinas e vermífugos, Lembretes, Admin"

  Cenário: O link do lembrete no celular abre em Hoje
    Dado que sou quem edita no celular
    Quando abro o app em "rotina"
    Então a parte "hoje" aparece
    E o menu mostra 3 pendentes em Hoje

  Cenário: O card antigo de publicar no site não existe mais
    Dado que sou admin no computador
    Quando abro o app
    Então não aparece o texto "Publicar no site" em lugar nenhum
