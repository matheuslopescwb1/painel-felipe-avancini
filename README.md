# Central do Felipe

Página que o Felipe e o Matheus usam para acompanhar a estratégia e o conteúdo do @heynego: o que já foi feito, o que gravar agora e o que falta.

Página: https://matheuslopescwb1.github.io/painel-felipe-avancini/

## Arquivos

- `index.html` — a central (o que fazer agora, roteiros, perguntas, caminho).
- `dados.js` — fonte única: fases, passos, perguntas e roteiros. Para atualizar a página, é aqui que se mexe.
- `numeros.html` — leitura dos 16 reels de setembro de 2026.

## Como atualizar

Em `dados.js`:

- Roteiro gravado ou postado: trocar o `status` para `gravado` ou `postado`.
- Pergunta respondida: trocar o `s` para `respondida`.
- Passo concluído: trocar o `s` para `feito`.
- Trocar a data em `atualizado`.

## Marcações compartilhadas

Com o campo `sync` de `dados.js` preenchido com o endereço de um Firebase Realtime Database, as marcações (gravei, postei, já fiz, já respondi) ficam em `central/marcas` nesse banco e aparecem para os dois na hora, com quem marcou e quando. As regras do banco estão em `firebase-regras.json`. O banco guarda só marcações; respostas e valores continuam indo pelo WhatsApp.

Para ver o estado atual: abrir `<endereço do banco>/central/marcas.json`.

Com `sync` vazio, o que se marca fica salvo só no aparelho e o botão "Avisar o Matheus" manda a lista por WhatsApp.

Link direto para um roteiro: acrescentar `#r3` ao endereço abre o roteiro 3.
