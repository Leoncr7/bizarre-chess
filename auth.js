function accountStorageKey(kind){return`jojoChess:${currentUser.id}:${kind}`}
function accountDatabaseKey(kind){return`account:${currentUser.id}:${kind}`}

let accountBackend='local';
const LOCAL_ACCOUNTS_KEY='jojoChessLocalAccounts',LOCAL_SESSION_KEY='jojoChessLocalSession';

function queueServerState(){return Promise.resolve()}
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
  if(!existing||!equalHash(await hashLocalPassword(password,existing.salt),existing.hash))throw new Error('Conta local ou senha incorretas neste navegador. Crie uma conta neste navegador para continuar.');
  localStorage.setItem(LOCAL_SESSION_KEY,existing.id);return localUser(existing);
}

async function startAccount(user){
  currentUser=user;updateCoinDisplay();
  document.querySelector('#account-save-status').textContent='Carregando progresso salvo neste navegador…';
  await initializeSavedGame({profile:null,activeMatch:null});
  document.querySelector('#auth-dialog').close();
  const note=document.querySelector('.save-note');if(note)note.textContent='CONTA LOCAL · DADOS NESTE NAVEGADOR';
}

function setAuthMode(next){
  authMode=next;const registering=authMode==='register';
  document.querySelector('#auth-title').textContent=registering?'Criar conta':'Entrar';
  document.querySelector('#auth-explainer').textContent=registering?'Crie uma conta local para salvar seu progresso neste navegador.':'Entre na conta local salva neste navegador. Para jogar online, cada participante usa sua própria conta local.';
  document.querySelector('#auth-submit').textContent=registering?'CRIAR CONTA':'ENTRAR';
  document.querySelector('#auth-toggle').textContent=registering?'JÁ TENHO CONTA':'CRIAR CONTA';
  document.querySelector('#auth-password').autocomplete=registering?'new-password':'current-password';
  document.querySelector('#auth-message').textContent='';
}

async function bootstrapAccount(){
  setAuthMode('login');const dialog=document.querySelector('#auth-dialog');dialog.showModal();
  const sessionId=localStorage.getItem(LOCAL_SESSION_KEY),account=localAccounts().find(item=>item.id===sessionId);
  if(account){await startAccount(localUser(account));return}
  if(sessionId)localStorage.removeItem(LOCAL_SESSION_KEY);
  document.querySelector('#auth-explainer').textContent='Crie uma conta local para salvar seu progresso neste navegador. As partidas online usam uma conexão direta entre os navegadores.';
  document.querySelector('#auth-message').textContent='';document.querySelector('#auth-username').focus();
}

document.querySelector('#auth-form').addEventListener('submit',async event=>{
  event.preventDefault();const username=document.querySelector('#auth-username').value.trim(),password=document.querySelector('#auth-password').value,submit=document.querySelector('#auth-submit');
  submit.disabled=true;document.querySelector('#auth-message').textContent=authMode==='register'?'Criando conta…':'Entrando…';
  try{await startAccount(await localAuth(username,password,authMode==='register'));document.querySelector('#auth-password').value=''}
  catch(error){document.querySelector('#auth-message').textContent=error.message}
  finally{submit.disabled=false}
});

document.querySelector('#auth-toggle').addEventListener('click',()=>setAuthMode(authMode==='login'?'register':'login'));
document.querySelector('#logout').addEventListener('click',()=>{localStorage.removeItem(LOCAL_SESSION_KEY);location.reload()});
bootstrapAccount();
