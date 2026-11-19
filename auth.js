const ADMIN_ACTIVATION_CODE='JOTARO-STAR-PLATINUM-ADMIN';

function accountStorageKey(kind){return currentUser?.id&&currentUser.id!=='local-player'?`jojoChess:${currentUser.id}:${kind}`:`jojoChess:${kind}`}
function accountDatabaseKey(kind){return currentUser?.id&&currentUser.id!=='local-player'?`account:${currentUser.id}:${kind}`:kind}

let accountBackend='local';
let accountReady=Promise.resolve();
function queueServerState(){return Promise.resolve()}

function readLocalAccounts(){
  const accounts=JSON.parse(localStorage.getItem('jojoChessLocalAccounts')||'[]');
  return Array.isArray(accounts)?accounts.filter(account=>account&&typeof account.id==='string'&&typeof account.username==='string'):[];
}

function renderLocalAccountOptions(accounts){
  const form=document.querySelector('#select-local-account-form'),select=document.querySelector('#local-account-select');
  select.replaceChildren(new Option('Selecione uma conta',''));
  for(const account of accounts){const option=new Option(account.username,account.id);if(account.id===currentUser?.id)option.selected=true;select.add(option)}
  form.hidden=accounts.length===0;
}

async function activateLocalAccount(account){
  saveProfile();
  currentUser={id:account.id,username:account.username,role:account.role==='admin'?'admin':'user'};
  localStorage.setItem('jojoChessLocalSession',account.id);
  await initializeSavedGame();
}

async function bootstrapAccount(){
  currentUser={id:'local-player',username:'JOGADOR',role:'user'};
  let previousAccountState={};
  let accounts=[];
  try{
    const sessionId=localStorage.getItem('jojoChessLocalSession');
    accounts=readLocalAccounts();
    const account=accounts.find(candidate=>candidate.id===sessionId);
    if(account){
      currentUser={id:account.id,username:account.username,role:account.role==='admin'?'admin':'user'};
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
  renderLocalAccountOptions(accounts);
  await initializeSavedGame(previousAccountState);
}

document.querySelector('#open-local-account').addEventListener('click',async()=>{
  await accountReady;
  document.querySelector('#local-account-message').textContent='';
  document.querySelector('#local-account-dialog').showModal();
});
document.querySelector('#close-local-account').addEventListener('click',()=>document.querySelector('#local-account-dialog').close());
document.querySelector('#local-account-dialog').addEventListener('close',()=>{document.querySelector('#local-admin-code').value=''});
document.querySelector('#register-local-account-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget,username=form.elements.username.value.trim().slice(0,24),codeInput=form.elements.adminCode;
  const role=codeInput.value===ADMIN_ACTIVATION_CODE?'admin':'user';
  codeInput.value='';
  const message=document.querySelector('#local-account-message');
  if(!username){message.textContent='Informe um nome para a conta.';return}
  try{
    const accounts=readLocalAccounts();
    if(accounts.some(account=>account.username.localeCompare(username,undefined,{sensitivity:'accent'})===0)){
      message.textContent='Já existe uma conta com esse nome neste navegador.';
      return;
    }
    const account={id:globalThis.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(36).slice(2)}`,username,role};
    localStorage.setItem('jojoChessLocalAccounts',JSON.stringify([...accounts,account]));
    await activateLocalAccount(account);
    renderLocalAccountOptions([...accounts,account]);
    message.textContent=account.role==='admin'?'Conta de administrador criada e ativada.':'Conta comum criada e ativada.';
    form.reset();
  }catch{
    message.textContent='Não foi possível criar a conta neste navegador.';
  }
});
document.querySelector('#select-local-account-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const message=document.querySelector('#local-account-message'),accountId=event.currentTarget.elements.localAccount.value;
  try{
    const account=readLocalAccounts().find(candidate=>candidate.id===accountId);
    if(!account){message.textContent='Selecione uma conta válida.';return}
    await activateLocalAccount(account);
    renderLocalAccountOptions(readLocalAccounts());
    message.textContent='Conta ativada.';
  }catch{
    message.textContent='Não foi possível ativar essa conta neste navegador.';
  }
});

accountReady=bootstrapAccount();
