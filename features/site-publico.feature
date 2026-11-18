# language: pt
@site
Funcionalidade: Site público para quem acompanha de longe
  Como quem compartilha a evolução do Odin
  Quero um site só de leitura, sem dados pessoais
  Para mostrar como ele está sem expor ninguém
  O site é gerado pelo mesmo caminho da publicação de verdade (anonimizador + modo só leitura), com os dados de teste.

  Cenário: O site público mostra só as seções de consulta
    Dado que eu visito o site público no celular
    Então eu vejo as seções Hoje, Evolução, Histórico e Mais
    E eu não encontro a seção Registrar

  Esquema do Cenário: Cada parte do site cabe inteira na tela do celular
    Dado que eu visito o site público no celular
    Quando eu abro "<parte>" em "<seção>" no site
    Então eu vejo "<parte>" sem precisar rolar para o lado
    E a página não registra erro

    Exemplos:
      | seção     | parte                |
      | Hoje      | Hoje                 |
      | Evolução  | Exames e gráficos    |
      | Histórico | Linha do tempo       |
      | Histórico | Fotos                |
      | Mais      | Medicamentos         |
      | Mais      | Vacinas e vermífugos |

  Cenário: O site público não mostra o que é da administração
    Dado que eu visito o site público no computador
    Quando eu abro "Mais" no site
    Então eu não encontro Lembretes nem Admin
    E não aparece nenhum endereço de e-mail na página

  Cenário: O site público não traz texto solto fora das seções
    Dado que eu visito o site público no celular
    Então todo o conteúdo da página está dentro do cabeçalho, do menu ou de uma seção
