# JoJo Bizarre Chess

## Publicar no GitHub Pages

O jogo é estático e pode ser publicado diretamente no GitHub Pages. Não precisa de `server.py` nem de configurar uma API própria.

As contas são locais ao navegador: cada jogador cria sua conta no dispositivo que usa, e o progresso fica salvo nesse navegador. As antigas contas e o painel administrativo que dependiam do servidor Python não fazem parte desta versão estática.

## Partidas 1 vs 1

Escolha **1 vs 1 local** para jogar no mesmo dispositivo ou **Multiplayer** para jogar online. Em Multiplayer, uma pessoa cria a sala e compartilha o código; a outra informa esse código. Os dois navegadores estabelecem uma conexão de dados WebRTC usando PeerJS. O código e o estado da partida não são armazenados por uma API do projeto.

O cliente PeerJS é carregado pelo jsDelivr e usa o serviço de sinalização compartilhado do PeerJS Cloud. A sinalização ajuda os navegadores a se encontrarem; depois, os dados do jogo seguem pela conexão direta entre os jogadores. Redes que bloqueiam WebRTC ou exigem um servidor TURN podem impedir a conexão.

## Desenvolvimento local

Abra `index.html` em um servidor estático local ou publique os arquivos no GitHub Pages. O multiplayer precisa de HTTPS ou localhost para usar recursos seguros do navegador. Ambos os jogadores precisam estar online e manter a página aberta durante a partida.
