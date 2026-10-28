function accountStorageKey(kind){return`jojoChess:${kind}`}
function accountDatabaseKey(kind){return kind}

let accountBackend='local';
function queueServerState(){return Promise.resolve()}

async function bootstrapAccount(){
  currentUser={id:'local-player',username:'JOGADOR',role:'user'};
  let previousAccountState={};
  try{
    const sessionId=localStorage.getItem('jojoChessLocalSession');
    const accounts=JSON.parse(localStorage.getItem('jojoChessLocalAccounts')||'[]');
    if(sessionId&&Array.isArray(accounts)&&accounts.some(account=>account.id===sessionId)){
      const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
      previousAccountState={profile:read(`jojoChess:${sessionId}:profile`),activeMatch:read(`jojoChess:${sessionId}:activeMatch`)};
      const [profile,activeMatch]=await Promise.all([
        readSavedValue(`account:${sessionId}:profile`).catch(()=>null),
        readSavedValue(`account:${sessionId}:activeMatch`).catch(()=>null),
      ]);
      if(profile)previousAccountState.profile=profile;
      if(activeMatch)previousAccountState.activeMatch=activeMatch;
    }
  }catch{}
  await initializeSavedGame(previousAccountState);
}

bootstrapAccount();
