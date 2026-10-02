# Ligar o robô do Instagram

O robô já está no repositório e roda a cada 15 minutos, mas desligado. Para ele postar faltam três coisas que só o Matheus consegue fazer, porque dependem de login: a pasta dos vídeos, a chave do Google e as chaves da Meta.

## 1. Pasta dos vídeos (Google Drive)

1. No Google Drive, criar uma pasta, por exemplo "Vídeos Felipe".
2. Compartilhar com o Felipe como **Editor**.
3. Em "Acesso geral", escolher **Qualquer pessoa com o link: Leitor**. Sem isso o robô não consegue baixar o vídeo.
4. Mandar o link da pasta para o Claude.

O Felipe sobe o vídeo pronto com o número do roteiro no começo do nome: `01.mp4`, `02 igreja.mp4`.

## 2. Chave do Google Drive

1. Abrir https://console.cloud.google.com e escolher o projeto `central-felipe` (o mesmo do banco).
2. **APIs e serviços → Biblioteca**, procurar "Google Drive API" e clicar em **Ativar**.
3. **APIs e serviços → Credenciais → Criar credenciais → Chave de API**.
4. Em "Restrições de API", marcar só **Google Drive API** e salvar.
5. Copiar a chave. Ela é pedida no passo 4.

## 3. Aplicativo da Meta

Quem faz este passo precisa ter controle total da Página do Facebook ligada ao @heynego. Se a Página é só do Felipe, ele adiciona o Matheus em **Configurações da Página → Acesso à Página → Adicionar** com controle total.

1. Abrir https://developers.facebook.com/apps e clicar em **Criar aplicativo**. Tipo: **Empresa**. Nome: "Central Felipe".
2. No painel do aplicativo, em **Configurações do app → Básico**, anotar o **ID do aplicativo** e a **Chave secreta**.
3. Abrir https://developers.facebook.com/tools/explorer, escolher o aplicativo criado e, em "Permissões", adicionar:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
4. Clicar em **Gerar token de acesso**, entrar com o Facebook, **marcar a Página do Felipe e o Instagram @heynego** e autorizar.
5. Copiar o token que aparece no campo de cima. Ele vale cerca de uma hora, então seguir direto para o passo 4.

## 4. Guardar as chaves

No terminal, dentro da pasta `painel-felipe-avancini`:

```
node robo/guardar-chaves.mjs
```

Ele pede o ID do aplicativo, a chave secreta, o token e a chave do Drive. Troca o token por um que não expira, acha o Instagram do Felipe e guarda tudo como segredo do repositório. Nenhuma chave aparece na tela, em arquivo ou na conversa com o Claude.

## 5. Teste e ligar

Avisar o Claude. Ele roda o robô em modo de teste (mostra o que postaria, sem postar), combina com você um primeiro post de verdade e só então liga o robô em `dados.js`.

## Como o robô decide o que postar

- Só posta o que está na agenda de `dados.js`, na hora marcada, e no máximo um item por execução.
- Reel: precisa do vídeo na pasta. Carrossel: precisa de `"aprovado": true` na agenda.
- Não posta item com mais de 3 dias de atraso; precisa reagendar.
- Não repete: pula o que já está marcado como postado e o que já existe no Instagram com a mesma legenda.
- Se der erro, marca "O robô falhou" na Central e não tenta de novo até alguém tocar em "Tentar de novo".
- O GitHub pode atrasar a execução em alguns minutos; o post sai perto do horário, não no segundo exato.
