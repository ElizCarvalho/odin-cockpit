# language: pt
Funcionalidade: Estoque e lista de compras
  Como quem cuida do Odin
  Quero ver num lugar só quanto tem de remédio, comida e suprimento
  Para comprar antes de acabar

  Cenário: O que está acabando aparece na lista de compras
    Ilustração: um remédio com 4 comprimidos (1 por dia) e a gaze com 1 pacote (meio por dia); a luva tem 50 pares (2 por dia).
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro o estoque
    Então o remédio e a gaze aparecem na lista de compras
    E a luva não aparece na lista de compras

  Cenário: Cadastrar um suprimento que dura poucos dias
    Ilustração: seringa de 20 mL, 6 unidades, gasta 2 por dia.
    Dado que eu posso registrar os cuidados do Odin
    E eu estou em Registrar
    Quando eu cadastro no estoque uma seringa que dura poucos dias
    E eu abro o estoque
    Então a seringa aparece nos suprimentos e na lista de compras

  Cenário: Depois de comprar, o item sai da lista
    Ilustração: comprei gaze e agora tenho 10 pacotes.
    Dado que eu posso registrar os cuidados do Odin
    Quando eu abro o estoque
    E eu conto a gaze depois de comprar mais
    Então a gaze sai da lista de compras

  Cenário: Quem só acompanha vê o estoque mas não mexe
    Dado que eu só acompanho o Odin
    Quando eu abro o estoque
    Então eu vejo a lista de compras sem opção de contar
