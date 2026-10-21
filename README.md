# JoJo Bizarre Chess

## Configurar contas Supabase

O jogo usa Supabase Auth com nome de jogador e senha. Como o Supabase Auth aceita email ou telefone como identificador, o código converte cada nome em um email interno exclusivo (`nome@users.jojobizarrechess.com`). O jogador só informa o nome; não precisa de email nem telefone. O perfil (moedas, poderes e foto) e a partida em andamento são sincronizados com a tabela `public.player_saves` no Supabase; o jogo também mantém uma cópia local para recuperação offline.

1. Crie um projeto no Supabase e abra **Project Settings → API Keys** (ou o diálogo **Connect**).
2. Copie a **Project URL** e a chave **Publishable** (`sb_publishable_...`). A chave antiga `anon` também é compatível. Não use `secret` nem `service_role` no navegador.
3. Cole os dois valores em `supabase-config.js`.
4. Em **Authentication → Providers → Email**, deixe Email habilitado e desative **Confirm email**. Os emails internos não recebem mensagens, então a confirmação impediria a entrada.
5. Em **Authentication → URL Configuration**, configure a URL do site e adicione as URLs usadas para desenvolvimento local e GitHub Pages à lista permitida.

O Supabase limita solicitações do endpoint de cadastro mesmo quando o jogador digita apenas um nome. Se aparecer `Email rate limit exceeded`, pare de tentar criar a conta repetidamente e tente **Entrar** caso o cadastro anterior tenha sido concluído. Para maior volume, configure SMTP próprio em **Authentication → Emails → SMTP Settings**; os limites podem ser consultados em **Authentication → Rate Limits**.

6. A migração `supabase/player_saves.sql` cria a tabela de progresso e políticas RLS para cada conta acessar apenas a própria linha. Ela já foi aplicada ao projeto conectado.

O código de administrador continua sendo apenas uma demonstração local da interface; ele não concede privilégios no projeto Supabase. Para habilitar esse modo de demonstração, entre na conta e use o código exibido no código-fonte do jogo. Criar uma conta com o nome `admin` não concede privilégios. As contas locais antigas não são migradas automaticamente; os jogadores precisam criar uma nova conta com nome de jogador e senha.

O jogo é estático e pode ser publicado diretamente no GitHub Pages. Não precisa de `server.py` nem de configurar uma API própria.

## Partidas 1 vs 1

Escolha **1 vs 1 local** para jogar no mesmo dispositivo ou **Multiplayer** para jogar online. Em Multiplayer, uma pessoa cria a sala e compartilha o código; a outra informa esse código. O campo converte automaticamente letras minúsculas em maiúsculas. Os dois navegadores estabelecem uma conexão de dados WebRTC usando PeerJS. O código e o estado da partida não são armazenados por uma API do projeto.

Durante a partida, qualquer jogador pode pedir um reinício. A nova partida começa quando os dois confirmarem; o jogador que criou a sala sincroniza o novo tabuleiro e os poderes aleatórios. Se não houver acordo em 20 segundos, ambos voltam ao menu inicial. O botão **MENU PRINCIPAL** também encerra a sala para os dois.

O cliente PeerJS é carregado pelo jsDelivr e usa o serviço de sinalização compartilhado do PeerJS Cloud. A sinalização ajuda os navegadores a se encontrarem; depois, os dados do jogo seguem pela conexão direta entre os jogadores. Redes que bloqueiam WebRTC ou exigem um servidor TURN podem impedir a conexão.

## Desenvolvimento local

Abra `index.html` em um servidor estático local ou publique os arquivos no GitHub Pages. O multiplayer precisa de HTTPS ou localhost para usar recursos seguros do navegador. Ambos os jogadores precisam estar online e manter a página aberta durante a partida.
