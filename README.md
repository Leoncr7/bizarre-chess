# JoJo Bizarre Chess

## Iniciar o servidor

O login e o banco compartilhado usam o servidor Python incluso. Na primeira vez, crie sua conta administradora VIP:

```bash
python3 server.py --create-admin
```

Informe um nome de 3 a 24 caracteres e uma senha de administrador com pelo menos 12 caracteres. A senha é solicitada sem aparecer na tela. Depois, inicie o jogo:

```bash
python3 server.py
```

Abra [http://127.0.0.1:8000](http://127.0.0.1:8000). Para usar outra porta, acrescente `--port 8080`. Para permitir acesso de outros dispositivos na mesma rede, inicie com `python3 server.py --host 0.0.0.0 --port 8000` e abra `http://IP-DO-COMPUTADOR:8000` nos outros dispositivos.

## Hospedagem estática (GitHub Pages)

O site também pode ser publicado em hospedagens estáticas. Sem uma API configurada, o login oferece contas locais com senha protegida por PBKDF2 e guarda o progresso no navegador atual. Essas contas não são as mesmas do servidor Python e não são compartilhadas entre dispositivos.

Para usar as contas do `server.py` no GitHub Pages, hospede também o servidor Python em um serviço que mantenha o processo ativo e preserve o arquivo SQLite. Este repositório inclui `render.yaml`: importe-o no Render para criar a API com disco persistente. O serviço e o disco exigem um plano pago no Render; o plano grátis não preserva o SQLite após reinicializações. Consulte [os limites do plano grátis](https://render.com/docs/free) e [as regras de discos persistentes](https://render.com/docs/disks).

Depois de criar o serviço, configure `JOJO_CORS_ORIGINS` com a origem exata do GitHub Pages, por exemplo `https://seu-usuario.github.io` (sem caminho ou barra final). Copie a URL HTTPS pública da API para `content` da meta `jojo-api-base` no `index.html`. No Shell do serviço, execute `python server.py --create-admin` para criar ou redefinir a conta `leon` nesse banco. Publique a alteração do `index.html` no GitHub Pages; então o login usará essa API e poderá sincronizar o progresso.

## Partidas 1 vs 1

No menu, escolha **1 vs 1 local** para jogar no mesmo dispositivo ou **Multiplayer** para jogar online. No multiplayer, o jogador conectado cria uma sala e compartilha o código de seis caracteres; o adversário entra com uma conta no mesmo servidor e informa esse código. Cada lado recebe um poder aleatório, e a câmera permanece fixa para os dois jogadores. O multiplayer exige a API `server.py` acessível aos dois jogadores; contas locais do navegador, sozinhas, não conectam dispositivos diferentes.

## Contas, VIP e progresso

Jogadores podem criar uma conta com nome de 3 a 24 caracteres (letras, números, `_` ou `-`) e senha de 10 a 128 caracteres. Moedas, poderes desbloqueados e partidas em andamento são vinculados à conta e guardados no SQLite em `data/jojo_chess.sqlite3`, permitindo retomar o progresso ao entrar em outro navegador conectado ao mesmo servidor.

A conta criada com `--create-admin` tem acesso ao **Cantinho VIP**, que mostra nomes, tipo de conta e datas de cadastro e último acesso. Senhas não são armazenadas em texto legível: o banco guarda somente hashes com salt, e nem a administração consegue visualizar a senha original. Para trocar a senha da conta VIP, execute novamente `python3 server.py --create-admin`.

Uma cópia local do progresso também é mantida no navegador para recuperação. O arquivo `data/` contém o banco e deve ser preservado para manter contas e progresso; ele já está excluído do Git.

## Uso em rede

Todos os dispositivos precisam acessar o mesmo servidor para compartilhar as contas e o banco. O servidor padrão é adequado para desenvolvimento e rede local. Para disponibilizar o jogo publicamente, hospede-o atrás de HTTPS e de um servidor de produção.
