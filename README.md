# JoJo Bizarre Chess

## Publicar no GitHub Pages

O jogo é estático e pode ser publicado diretamente no GitHub Pages. Não precisa de `server.py` nem de configurar uma API própria.

As contas são locais ao navegador: cada jogador cria sua conta no dispositivo que usa, e o progresso fica salvo nesse navegador. As antigas contas e o painel administrativo que dependiam do servidor Python não fazem parte desta versão estática.

O campo **Código de administrador** ativa um painel local com a lista de contas deste navegador. Código de ativação: `JOTARO-STAR-PLATINUM-ADMIN`. Como o código fica no JavaScript público do Pages, esse painel é apenas demonstrativo e não oferece segurança real nem acesso administrativo compartilhado.

## Partidas 1 vs 1

Escolha **1 vs 1 local** para jogar no mesmo dispositivo ou **Multiplayer** para jogar online. Em Multiplayer, uma pessoa cria a sala e compartilha o código; a outra informa esse código. O campo converte automaticamente letras minúsculas em maiúsculas. Os dois navegadores estabelecem uma conexão de dados WebRTC usando PeerJS. O código e o estado da partida não são armazenados por uma API do projeto.

Durante a partida, qualquer jogador pode pedir um reinício. A nova partida começa quando os dois confirmarem; o jogador que criou a sala sincroniza o novo tabuleiro e os poderes aleatórios. Se não houver acordo em 20 segundos, ambos voltam ao menu inicial. O botão **MENU PRINCIPAL** também encerra a sala para os dois.

O cliente PeerJS é carregado pelo jsDelivr e usa o serviço de sinalização compartilhado do PeerJS Cloud. A sinalização ajuda os navegadores a se encontrarem; depois, os dados do jogo seguem pela conexão direta entre os jogadores. Redes que bloqueiam WebRTC ou exigem um servidor TURN podem impedir a conexão.

## Revisão de partida

Ao terminar uma partida, a revisão abre com o resultado, o tabuleiro e o replay lance a lance. O botão **REVISÃO DA PARTIDA** permite reabri-la. As últimas oito partidas concluídas são arquivadas localmente neste navegador e podem ser abertas pelo botão **REVISAR PARTIDAS SALVAS** no menu; o arquivo pode ser exportado/importado em PGN. A análise usa Stockfish 19 lite single-thread no Web Worker do navegador e os arquivos ficam em `assets/stockfish/`, sem baixar o motor durante o uso. O WASM tem cerca de 1,8 MB. O motor precisa que o jogo seja servido por HTTP/HTTPS; `file://` não oferece o contexto necessário a workers e WASM.

As avaliações são pontos de vista das brancas: positivo favorece as brancas e negativo favorece as pretas. O programa compara a avaliação das posições antes/depois de cada lance, usando profundidade 10 (ou 16 quando solicitado). As categorias usam limiares próprios de perda de centipawns: até 0,10 peão “excelente”, até 0,35 “bom”, até 1,00 “imprecisão”, até 2,50 “erro” e acima disso “erro grave”; se o lance coincide com o primeiro do motor é “melhor lance”, e se havia só um lance legal é “único lance”. A precisão estimada é a média de `100 × exp(−perda_em_centipawns/100)`, limitando perdas negativas a zero. Esses números são estimativas desta implementação, não as métricas proprietárias do Chess.com.

O replay registra os lances e os poderes JoJo em etapas separadas, incluindo remoções, promoções, restaurações, lances extras e lances desfeitos. Partidas novas também preservam essa linha do tempo no arquivo local. O Stockfish analisa apenas xadrez padrão: em partidas com poderes, a análise do motor e a exportação PGN padrão são bloqueadas para evitar avaliações incorretas. Partidas arquivadas antes desta atualização não têm os efeitos especiais registrados no replay intermediário. A revisão não inventa abertura, teoria, lance brilhante ou oportunidade de mate: não há banco de aberturas no projeto, e essas categorias exigem critérios que esta integração não confirma. PGN importado suporta partidas padrão iniciadas na posição normal; PGN com FEN inicial personalizada ainda não é compatível. Variantes e treinamento usam posições e melhores lances reais da análise, sem alterar a partida original.

O Stockfish.js incluído é licenciado sob GPL-3.0. O texto da licença está em `assets/stockfish/COPYING.txt`; o pacote e o código-fonte correspondente estão publicados pelo [projeto Stockfish.js](https://github.com/nmrugg/stockfish.js) e o motor original pelo [projeto Stockfish](https://github.com/official-stockfish/Stockfish). A versão distribuída é `stockfish@19.0.1`.

## Desenvolvimento local

Abra `index.html` em um servidor estático local ou publique os arquivos no GitHub Pages. O multiplayer precisa de HTTPS ou localhost para usar recursos seguros do navegador. Ambos os jogadores precisam estar online e manter a página aberta durante a partida.
