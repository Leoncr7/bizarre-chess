function accountStorageKey(kind){return`jojoChess:${currentUser.id}:${kind}`}
function accountDatabaseKey(kind){return`account:${currentUser.id}:${kind}`}

let accountBackend='server';
const LOCAL_ACCOUNTS_KEY='jojoChessLocalAccounts',LOCAL_SESSION_KEY='jojoChessLocalSession';

async function apiRequest(path,options={}){
  const headers={...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})};
  const response=await fetch(path,{credentials:'same-origin',...options,headers});
  let result={};
  try{result=await response.json()}catch{}
  if(!response.ok)throw new Error(result.error||'Não foi possível concluir o pedido.');
  return result;
}

function queueServerState(partial){
  if(!currentUser||accountBackend!=='server')return Promise.resolve();
  serverSaveQueue=serverSaveQueue.then(()=>apiRequest('/api/state',{method:'PUT',body:JSON.stringify(partial)}))
    .then(()=>{const status=document.querySelector('#account-save-status');if(status)status.textContent='Progresso sincronizado com a conta'})
    .catch(()=>{const status=document.querySelector('#account-save-status');if(status)status.textContent='Salvo neste navegador · sincronização indisponível'});
  return serverSaveQueue;
}

function localAccounts(){try{const accounts=JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY)||'[]');return Array.isArray(accounts)?accounts:[]}catch{return[]}}
function saveLocalAccounts(accounts){localStorage.setItem(LOCAL_ACCOUNTS_KEY,JSON.stringify(accounts))}
function randomHex(size){const bytes=crypto.getRandomValues(new Uint8Array(size));return Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('')}
async function hashLocalPassword(password,salt){
  if(!crypto?.subtle)throw new Error('Este navegador não oferece criptografia segura. Abra o site por HTTPS ou localhost.');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(salt.match(/.{2}/g).map(byte=>parseInt(byte,16))),iterations:180000},key,256);
  return Array.from(new Uint8Array(bits),value=>value.toString(16).padStart(2,'0')).join('');
}
function equalHash(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0}
function localUser(account){return{id:account.id,username:account.username,role:'user'}}

async function localAuth(username,password,registering){
  if(!/^[A-Za-z0-9_-]{3,24}$/.test(username))throw new Error('Use um nome de 3 a 24 caracteres, com letras, números, _ ou -.');
  if(password.length<10||password.length>128)throw new Error('A senha deve ter entre 10 e 128 caracteres.');
  const accounts=localAccounts(),existing=accounts.find(account=>account.username.toLowerCase()===username.toLowerCase());
  if(registering){
    if(existing)throw new Error('Esse nome de usuário já está em uso neste navegador.');
    const salt=randomHex(16),account={id:`local-${randomHex(16)}`,username,salt,hash:await hashLocalPassword(password,salt),createdAt:new Date().toISOString()};
    accounts.push(account);saveLocalAccounts(accounts);localStorage.setItem(LOCAL_SESSION_KEY,account.id);return localUser(account);
  }
  if(!existing||!equalHash(await hashLocalPassword(password,existing.salt),existing.hash))throw new Error('Nome de usuário ou senha incorretos.');
  localStorage.setItem(LOCAL_SESSION_KEY,existing.id);return localUser(existing);
}

async function startAccount(user,stateOverride=null){
  currentUser=user;
  updateCoinDisplay();
  document.querySelector('#account-save-status').textContent=accountBackend==='server'?'Carregando progresso da conta…':'Conta local · progresso salvo neste navegador';
  const state=stateOverride??(accountBackend==='server'?await apiRequest('/api/state'):{profile:null,activeMatch:null});
  await initializeSavedGame(state);
  document.querySelector('#auth-dialog').close();
  const note=document.querySelector('.save-note');
  if(note)note.textContent=accountBackend==='server'?'PROGRESSO SINCRONIZADO COM A CONTA':'CONTA LOCAL · DADOS NESTE NAVEGADOR';
}

function setAuthMode(next){
  authMode=next;
  const registering=authMode==='register';
  document.querySelector('#auth-title').textContent=registering?'Criar conta':'Entrar';
  document.querySelector('#auth-explainer').textContent=registering?'Crie uma conta para salvar seu progresso. Use uma senha com pelo menos 10 caracteres.':'Entre para acessar e salvar seu progresso.';
  document.querySelector('#auth-submit').textContent=registering?'CRIAR CONTA':'ENTRAR';
  document.querySelector('#auth-toggle').textContent=registering?'JÁ TENHO CONTA':'CRIAR CONTA';
  document.querySelector('#auth-password').autocomplete=registering?'new-password':'current-password';
  document.querySelector('#auth-message').textContent='';
}

async function bootstrapAccount(){
  setAuthMode('login');
  const dialog=document.querySelector('#auth-dialog');
  dialog.showModal();
  const sessionId=localStorage.getItem(LOCAL_SESSION_KEY);
  if(sessionId){
    const account=localAccounts().find(item=>item.id===sessionId);
    if(account){accountBackend='local';await startAccount(localUser(account));return}
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }
  document.querySelector('#auth-message').textContent='Verificando sessão…';
  try{
    const result=await apiRequest('/api/auth/me');
    if(result.user){accountBackend='server';await startAccount(result.user);return}
    document.querySelector('#auth-message').textContent='';
    document.querySelector('#auth-username').focus();
  }catch{
    accountBackend='local';
    document.querySelector('#auth-explainer').textContent='Modo hospedagem estática: crie uma conta local para salvar o progresso neste navegador.';
    document.querySelector('#auth-message').textContent='API de contas indisponível. Você pode criar uma conta local neste navegador.';
    document.querySelector('#auth-username').focus();
  }
}

document.querySelector('#auth-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const username=document.querySelector('#auth-username').value.trim();
  const password=document.querySelector('#auth-password').value;
  const submit=document.querySelector('#auth-submit');
  submit.disabled=true;
  document.querySelector('#auth-message').textContent=authMode==='register'?'Criando conta…':'Entrando…';
  try{
    let user;
    if(accountBackend==='local')user=await localAuth(username,password,authMode==='register');
    else{const result=await apiRequest(`/api/auth/${authMode==='register'?'register':'login'}`,{method:'POST',body:JSON.stringify({username,password})});user=result.user}
    await startAccount(user);
    document.querySelector('#auth-password').value='';
  }catch(error){document.querySelector('#auth-message').textContent=error.message}
  finally{submit.disabled=false}
});

document.querySelector('#auth-toggle').addEventListener('click',()=>setAuthMode(authMode==='login'?'register':'login'));

document.querySelector('#logout').addEventListener('click',async()=>{
  if(accountBackend==='local')localStorage.removeItem(LOCAL_SESSION_KEY);
  else try{await apiRequest('/api/auth/logout',{method:'POST',body:'{}'})}catch{}
  location.reload();
});

async function openAdminPanel(){
  const dialog=document.querySelector('#vip-dialog'),message=document.querySelector('#vip-message'),list=document.querySelector('#vip-users');
  list.replaceChildren();
  message.textContent='Carregando registros…';
  dialog.showModal();
  try{
    const result=await apiRequest('/api/admin/users');
    message.textContent=`${result.users.length} conta(s) cadastrada(s). Senhas e hashes não são exibidos.`;
    for(const user of result.users){
      const item=document.createElement('li'),name=document.createElement('strong'),meta=document.createElement('small');
      name.textContent=user.username;
      const created=new Date(user.created_at).toLocaleDateString('pt-BR');
      const lastLogin=user.last_login?new Date(user.last_login).toLocaleDateString('pt-BR'):'ainda não entrou';
      meta.textContent=`${user.role==='admin'?'ADMIN':'JOGADOR'} · CADASTRO ${created} · ÚLTIMO ACESSO ${lastLogin}`;
      item.append(name,meta);
      list.appendChild(item);
    }
  }catch(error){message.textContent=accountBackend==='local'?'O painel VIP requer o servidor de contas.':error.message}
}

document.querySelector('#open-vip').addEventListener('click',openAdminPanel);
document.querySelector('#vip-close').addEventListener('click',()=>document.querySelector('#vip-dialog').close());

bootstrapAccount();
