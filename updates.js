// Para registrar uma atualização, adicione uma entrada no início desta lista.
// Mantenha as versões anteriores para que o painel preserve o histórico.
const gameUpdates = [
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
