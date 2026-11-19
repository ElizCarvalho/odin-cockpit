# language: pt
Funcionalidade: Encontrar o que preciso pelo que vim fazer
  Como quem cuida do Odin
  Quero que o app se organize pelo que eu vim fazer
  Para não me perder entre remédios, exames e registros
  Origem: ADR 0004 (navegação por tarefa) e auditoria de UX de 18/11/2026.

  Cenário: No celular, as seções ficam ao alcance do polegar
    Dado que eu uso o app no celular
    Quando eu abro o app
    Então eu vejo as seções Hoje, Registrar, Evolução, Histórico e Mais
    E as seções ficam na parte de baixo da tela

  Cenário: No computador, as seções ficam no topo
    Dado que eu uso o app no computador
    Quando eu abro o app
    Então eu vejo as seções Hoje, Registrar, Evolução, Histórico e Mais
    E as seções ficam no topo da página

  Esquema do Cenário: Cada parte cabe inteira na tela do celular
    Dado que eu uso o app no celular
    Quando eu abro "<parte>" em "<seção>"
    Então eu vejo "<parte>" sem precisar rolar para o lado

    Exemplos:
      | seção     | parte                |
      | Hoje      | Hoje                 |
      | Registrar | Registrar            |
      | Evolução  | Exames e gráficos    |
      | Histórico | Linha do tempo       |
      | Histórico | Fotos                |
      | Mais      | Medicamentos         |
      | Mais      | Vacinas e vermífugos |
      | Mais      | Lembretes            |
      | Mais      | Admin                |

  Cenário: Mais reúne o que eu consulto de vez em quando
    Dado que eu administro o app
    Quando eu abro "Mais"
    Então eu encontro Medicamentos, Estoque, Vacinas e vermífugos, Lembretes e Admin

  Cenário: O aviso de um lembrete me leva para o que fazer agora
    Dado que eu posso registrar os cuidados do Odin
    E há lembretes pendentes para hoje
    Quando eu abro o aviso de um lembrete
    Então eu vou para Hoje
    E eu vejo quantos lembretes estão pendentes

  Cenário: Publicar o site não depende de mim
    Dado que eu administro o app
    Quando eu abro o app
    Então eu não encontro instrução para publicar o site manualmente

  Esquema do Cenário: A contagem de pendentes não cobre o nome de Hoje
    Dado que eu posso registrar os cuidados do Odin
    E há lembretes pendentes para hoje
    E que eu uso o app no <aparelho>
    Quando eu abro o app
    Então eu vejo quantos lembretes estão pendentes
    E a contagem não fica por cima do nome da seção

    Exemplos:
      | aparelho   |
      | celular    |
      | computador |
