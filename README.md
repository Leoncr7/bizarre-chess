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

O site também pode ser publicado em hospedagens estáticas. Quando a API Python não estiver disponível, o login oferece contas locais com senha protegida por PBKDF2 e guarda o progresso no navegador atual. Essas contas e partidas não são compartilhadas entre dispositivos ou navegadores. Para contas sincronizadas entre dispositivos, use o servidor Python deste projeto.

## Contas, VIP e progresso

Jogadores podem criar uma conta com nome de 3 a 24 caracteres (letras, números, `_` ou `-`) e senha de 10 a 128 caracteres. Moedas, poderes desbloqueados e partidas em andamento são vinculados à conta e guardados no SQLite em `data/jojo_chess.sqlite3`, permitindo retomar o progresso ao entrar em outro navegador conectado ao mesmo servidor.

A conta criada com `--create-admin` tem acesso ao **Cantinho VIP**, que mostra nomes, tipo de conta e datas de cadastro e último acesso. Senhas não são armazenadas em texto legível: o banco guarda somente hashes com salt, e nem a administração consegue visualizar a senha original. Para trocar a senha da conta VIP, execute novamente `python3 server.py --create-admin`.

Uma cópia local do progresso também é mantida no navegador para recuperação. O arquivo `data/` contém o banco e deve ser preservado para manter contas e progresso; ele já está excluído do Git.

## Uso em rede

Todos os dispositivos precisam acessar o mesmo servidor para compartilhar as contas e o banco. O servidor padrão é adequado para desenvolvimento e rede local. Para disponibilizar o jogo publicamente, hospede-o atrás de HTTPS e de um servidor de produção.
