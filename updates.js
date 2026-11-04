// Para registrar uma atualização, adicione uma entrada no início desta lista.
// Mantenha as versões anteriores para que o painel preserve o histórico.
const gameUpdates = [
  {
    version: 'Ajustes mobile e toque no celular',
    date: '04/11/2026',
    changes: [
      'Ajustado o layout para telas pequenas com altura segura e controles maiores para toque, sem mexer no desktop.',
      'Tabuleiro, painéis e diálogos passam a respeitar a área útil do navegador em retrato e paisagem, sem cobrir texto ou botões.',
    ],
  },
  {
    version: 'Arquivo de revisões no IndexedDB',
    date: '04/11/2026',
    changes: [
      'Partidas e análises da revisão são salvas no IndexedDB, com migração automática do arquivo antigo do navegador.',
      'O arquivo comporta até 50 partidas e preserva a partida mais recente quando o armazenamento fica sem espaço.',
    ],
  },
  {
    version: 'Ações multiplayer validadas e reconexão',
    date: '04/11/2026',
    changes: [
      'As partidas online sincronizam lances e poderes individuais, validados pelo tabuleiro de cada jogador.',
      'Snapshots ficam reservados para entrada, reconexão e reinício acordado; o jogo tenta reconectar e informa o estado da conexão.',
    ],
  },
  {
    version: 'Interface responsiva e legibilidade mobile',
    date: '04/11/2026',
    changes: [
      'Reunidas as regras responsivas do tabuleiro e dos painéis, preservando o layout em telas menores.',
      'Fontes pequenas dos controles e informações passam a ter no mínimo 10px em dispositivos móveis.',
    ],
  },
  {
    version: 'Dificuldade do bot',
    date: '04/11/2026',
    changes: [
      'Escolha entre Fácil, Médio e Difícil; a preferência fica salva neste navegador.',
      'O bot usa Stockfish local quando a partida segue as regras padrão, e o torneio aumenta gradualmente a força dos rivais.',
    ],
  },
  {
    version: 'Ajustes de interface e multiplayer',
    date: '04/11/2026',
    changes: [
      'Corrigidos detalhes de acessibilidade, visualização em telas menores e entrada nas salas multiplayer sem login.',
      'Preparado o campo da imagem de compartilhamento para receber a URL absoluta do site quando o domínio for definido.',
    ],
  },
  {
    version: 'Ritmo dos bots',
    date: '28/10/2026',
    changes: [
      'O bot agora espera 1,5 segundo antes de jogar, dando mais tempo entre os lances.',
    ],
  },
  {
    version: 'Jogo sem login',
    date: '28/10/2026',
    changes: [
      'O jogo abre sem pedir conta e mantém partidas e progresso salvos neste navegador.',
      'Dados da conta local ativa são migrados para o salvamento sem login.',
    ],
  },
  {
    version: 'Sons de movimento e captura',
    date: '28/10/2026',
    changes: [
      'sonspeças.mp3 toca somente em movimentos comuns; capturapeças.mp3 toca em capturas e promoções.',
    ],
  },
  {
    version: 'Som das peças',
    date: '28/10/2026',
    changes: [
      'O arquivo sonspeças.mp3 agora toca nos movimentos normais das peças.',
    ],
  },
  {
    version: 'Áudio corrigido',
    date: '28/10/2026',
    changes: [
      'Sons de movimento, captura, promoção e roque reforçados para ficarem audíveis em mais dispositivos.',
      'Tratamento de falhas do sistema de áudio para facilitar o diagnóstico.',
    ],
  },
  {
    version: 'Efeitos sonoros do xadrez',
    date: '28/10/2026',
    changes: [
      'Sons próprios adicionados para a promoção do peão e o roque.',
    ],
  },
  {
    version: 'Loja de poderes e novidades',
    date: '26/10/2026',
    changes: [
      'Os preços dos poderes agora aparecem nos cartões, mesmo quando estão bloqueados.',
      'Painel de atualizações adicionado no canto da tela.',
    ],
  },
];

const updatesList = document.querySelector('#updates-list');
const updatesCount = document.querySelector('#updates-count');

if (updatesList && updatesCount) {
  const totalUpdates = String(gameUpdates.length);
  const refreshUpdatesCount = () => {
    updatesCount.textContent = totalUpdates;
  };
  refreshUpdatesCount();
  document.querySelector('#updates-panel')?.addEventListener('toggle', refreshUpdatesCount);

  for (const update of gameUpdates) {
    const article = document.createElement('article');
    article.className = 'update-entry';

    const heading = document.createElement('div');
    heading.className = 'update-heading';
    const title = document.createElement('strong');
    title.textContent = update.version;
    const date = document.createElement('time');
    date.textContent = update.date;
    heading.append(title, date);

    const changes = document.createElement('ul');
    for (const change of update.changes) {
      const item = document.createElement('li');
      item.textContent = change;
      changes.append(item);
    }

    article.append(heading, changes);
    updatesList.append(article);
  }
}
