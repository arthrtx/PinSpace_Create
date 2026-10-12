# Contas e rede social — instalação

1. **Base de dados** — Supabase → SQL Editor → New query → colar `supabase/social.sql` → Run. É seguro voltar a correr.
   Tabelas:
   - `profiles` — perfil público: username, nome, bio, avatar, capa, site, localização, verificado, contadores (quadros, públicos, seguidores, a seguir, likes recebidos), último acesso;
   - `profile_private` — só o dono vê: email, idioma, fuso horário, tema, navegador, último login, nº de sessões, aceitação dos termos;
   - `boards` — quadros: conteúdo, miniatura e imagem completa (Storage), tamanho, nº de elementos, tags, cópia de, data de publicação, likes/reposts/visualizações;
   - `likes`, `retweets`, `follows`, `notifications` (criadas automaticamente por triggers).
   Storage: pastas públicas `quadros` (imagens dos quadros públicos) e `avatars` (fotos de perfil); cada utilizador só escreve na sua pasta.
   Os contadores são mantidos pela base de dados — o site não os consegue alterar.
2. **Auth — login com Google** (único método de entrada; sem palavra-passe nem código por email):
   1. Google Cloud Console → *APIs & Services* → *OAuth consent screen*: configura (tipo *External*) e publica.
   2. *Credentials* → *Create credentials* → *OAuth client ID* → *Web application*:
      - *Authorized JavaScript origins*: o endereço do site (ex.: `https://pinspace.exemplo.pt`).
      - *Authorized redirect URIs*: `https://<o-teu-projeto>.supabase.co/auth/v1/callback` (aparece no Supabase, no passo seguinte).
   3. Supabase → Authentication → Providers → **Google** → ativar, colar *Client ID* e *Client Secret* → Save.
   4. Supabase → Authentication → URL Configuration:
      - *Site URL*: o endereço onde o site está publicado.
      - *Redirect URLs*: o mesmo endereço (o Google volta para `…/?code=…` e o site trata do resto).
   5. Volta a correr `supabase/social.sql` para o perfil novo ficar com o nome e a foto do Google.
   Na primeira entrada a conta e o perfil são criados automaticamente; o username vem do email e pode ser mudado em *Editar perfil*.
3. Publicar os ficheiros como sempre. O cliente `supabase-js` é carregado do CDN jsDelivr no `index.html`.

## Rotas (hash)

| Hash | Vista |
|---|---|
| *(vazio)* | Landing page (igual a antes) |
| `#feed` | Dashboard: os teus quadros + feed de quem segues |
| `#explore` / `#explore?q=texto` | Quadros públicos + pesquisa de pessoas |
| `#notifications` | Likes, reposts e novos seguidores |
| `#profile` / `#profile/<username>` | Perfil (`/reposts`, `/followers`, `/following`) |

## Como os quadros ficam ligados à conta

- **Guardar** no editor grava no dispositivo (como antes) e, com sessão iniciada, também na tabela `boards` (privado por omissão).
- Em **Ajustes → Conta e perfil** escolhes descrição e se o quadro é público (aparece no perfil e em Explorar).
- O autosave de 30 s só grava no dispositivo, para não enviar o quadro inteiro para o servidor a cada 30 s.
- A galeria pública anónima antiga (tabela `quadros`) continua a funcionar sem alterações.

## Música (SoundCloud)

A secção de música, por baixo da galeria, funciona **sem configuração**:

- **Antes de ligar:** toca uma playlist pública (`genericPlaylist` em `js/music.js`, que podes trocar por qualquer playlist pública).
- **"Ligar SoundCloud":** a pessoa cola o link do perfil (`soundcloud.com/nome`) e passa a ouvir os likes públicos dela; se não tiver likes, ouve as faixas dela. Fica guardado neste navegador.

### Ativar o login oficial ("Entrar com SoundCloud" → feed de quem a pessoa segue)

O SoundCloud exige uma app registada (conta **Artist Pro**) e um segredo que não pode ficar no browser.

1. Em https://soundcloud.com/you/apps, regista a app e define como *Redirect URI* o endereço exato do site (ex.: `https://pinspace.exemplo.pt/`).
2. Publica a Edge Function que guarda o segredo:
   ```
   supabase secrets set SOUNDCLOUD_CLIENT_ID=... SOUNDCLOUD_CLIENT_SECRET=...
   supabase functions deploy soundcloud-token --no-verify-jwt
   ```
3. Em `js/music.js`, preenche `clientId: '...'` no `SOUNDCLOUD_CONFIG`.

O botão passa a dizer "Entrar com SoundCloud" e, depois do login, o carrossel mostra `/me/followings/tracks` (músicas novas de quem a pessoa segue), ou os likes, se esse feed vier vazio.

## Publicar

Só se publica com sessão iniciada: o autor é sempre o utilizador da sessão e o quadro fica na tabela `boards` (público). Os rascunhos ficam no navegador e aparecem no teu perfil em **Rascunhos**.

## Moderação (denúncias)

- As denúncias ficam na tabela `reports`. Para rever: **Table Editor → `reports_review`** (mostra motivo, quem denunciou, quadro/perfil e nº de denúncias abertas).
- Um quadro com **3 denúncias abertas** de pessoas diferentes fica escondido automaticamente (`boards.hidden = true`). O autor continua a vê-lo.
- **Repor um quadro** (denúncia sem razão): em `boards`, mudar `hidden` para `false`; em `reports`, mudar o `status` dessas denúncias para `rejeitada`.
- **Remover um quadro**: apagar a linha em `boards` (as denúncias desaparecem com ele).
- **Conta abusiva**: Authentication → Users → apagar o utilizador (apaga perfil, quadros e tudo o resto).
- Marca como `resolvida` as denúncias tratadas, para não contarem para o esconder automático.

## Comentários

- Tabela `comments` (secção 14 do `social.sql`). Quem tem conta comenta nos quadros que pode ver (até 500 caracteres, 60 por hora); apaga quem escreveu ou o dono do quadro. O dono recebe notificação.
- Comentários também se podem denunciar — aparecem em `reports_review` com o texto e o autor.

## Banner GIF

- O bucket `avatars` passa a aceitar `image/gif` até 4 MB (volta a correr o `social.sql`). O GIF sobe tal como está, sem recorte, para não perder a animação.

## Edição em grupo (tempo real)

- Usa o **Realtime** do Supabase (Broadcast + Presence). Não precisa de tabelas novas nem de configuração.
- O anfitrião carrega em **Grupo → Começar sessão** e partilha o link `#collab/<chave>` (chave aleatória de 128 bits). Só quem tem o link e conta entra. Para tirar alguém: terminar e começar uma sessão nova.
- Imagens grandes sobem para `quadros/<id-do-utilizador>/collab/` para viajarem como link.
- Quem entra fica com uma cópia local ("Em grupo · …"); o quadro na conta é o do anfitrião.
