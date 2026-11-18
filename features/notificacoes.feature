# language: pt
Funcionalidade: Configurar o que vira notificação
  Só admin escolhe o que vira push. Decúbito e água viram horários com intervalo.

  Cenário: Admin liga decúbito e água e desliga compras
    Dado que sou admin no computador
    E abro o app em "admin"
    Quando desligo "compra" e ligo "decubito" e "agua" a cada 2 h
    E salvo as notificações
    Então compras ficam desligadas e remédios ligados
    E o decúbito fica a cada 4 h e a água a cada 2 h, das "08:00"
