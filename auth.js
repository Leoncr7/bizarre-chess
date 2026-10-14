function accountStorageKey(kind){return`jojoChess:${currentUser.id}:${kind}`}
function accountDatabaseKey(kind){return`account:${currentUser.id}:${kind}`}

async function apiRequest(path,options={}){
  const headers={...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})};
  const response=await fetch(path,{credentials:'same-origin',...options,headers});
  let result={};
  try{result=await response.json()}catch{}
  if(!response.ok)throw new Error(result.error||'Não foi possível concluir o pedido.');
  return result;
}

function queueServerState(partial){
  if(!currentUser)return;
  serverSaveQueue=serverSaveQueue.then(()=>apiRequest('/api/state',{method:'PUT',body:JSON.stringify(partial)}))
    .then(()=>{const status=document.querySelector('#account-save-status');if(status)status.textContent='Progresso sincronizado com a conta'})
    .catch(()=>{const status=document.querySelector('#account-save-status');if(status)status.textContent='Salvo neste navegador · sincronização indisponível'});
  return serverSaveQueue;
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

async function startAccount(user){
  currentUser=user;
  updateCoinDisplay();
  document.querySelector('#account-save-status').textContent='Carregando progresso da conta…';
  const state=await apiRequest('/api/state');
  await initializeSavedGame(state);
  document.querySelector('#auth-dialog').close();
}

async function bootstrapAccount(){
  setAuthMode('login');
  const dialog=document.querySelector('#auth-dialog');
  dialog.showModal();
  document.querySelector('#auth-message').textContent='Verificando sessão…';
  try{
    const result=await apiRequest('/api/auth/me');
    if(result.user){await startAccount(result.user);return}
    document.querySelector('#auth-message').textContent='';
    document.querySelector('#auth-username').focus();
  }catch(error){
    document.querySelector('#auth-message').textContent=`${error.message} Inicie o servidor com python3 server.py.`;
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
    const result=await apiRequest(`/api/auth/${authMode==='register'?'register':'login'}`,{method:'POST',body:JSON.stringify({username,password})});
    await startAccount(result.user);
    document.querySelector('#auth-password').value='';
  }catch(error){document.querySelector('#auth-message').textContent=error.message}
  finally{submit.disabled=false}
});

document.querySelector('#auth-toggle').addEventListener('click',()=>setAuthMode(authMode==='login'?'register':'login'));

document.querySelector('#logout').addEventListener('click',async()=>{
  try{await apiRequest('/api/auth/logout',{method:'POST',body:'{}'})}
  finally{location.reload()}
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
  }catch(error){message.textContent=error.message}
}

document.querySelector('#open-vip').addEventListener('click',openAdminPanel);
document.querySelector('#vip-close').addEventListener('click',()=>document.querySelector('#vip-dialog').close());

bootstrapAccount();
