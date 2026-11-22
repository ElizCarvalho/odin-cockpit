# language: pt
Funcionalidade: Lembrete de pesar
  Como quem cuida do Odin
  Quero lançar o peso direto no lembrete
  Para não precisar ir em Registrar depois

  Cenário: Lançar o peso pelo lembrete
    Ilustração: lembrete das 09:15, Odin pesou 20,1 kg.
    Dado que eu posso registrar os cuidados do Odin
    E está na hora de pesar o Odin
    Quando eu lanço 20,1 kg no lembrete
    Então o peso de 20,1 kg aparece em Hoje

  Cenário: Lançar a glicemia em jejum pelo lembrete
    Ilustração: lembrete das 08:30, glicosímetro marcou 92 mg/dL.
    Dado que eu posso registrar os cuidados do Odin
    E está na hora de medir a glicemia
    Quando eu lanço a glicemia de 92 no lembrete
    Então a glicemia fica registrada em jejum
