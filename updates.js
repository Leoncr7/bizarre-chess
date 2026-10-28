// Para registrar uma atualização, adicione uma entrada no início desta lista.
// Mantenha as versões anteriores para que o painel preserve o histórico.
const gameUpdates = [
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
  updatesCount.textContent = String(gameUpdates.length);

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
