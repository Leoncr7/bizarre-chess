function accountStorageKey(kind){return`jojoChess:${currentUser.id}:${kind}`}
function accountDatabaseKey(kind){return`account:${currentUser.id}:${kind}`}

const ADMIN_ACTIVATION_CODE='JOTARO-STAR-PLATINUM-ADMIN';
async function loadServerState(){
  const client=requireSupabase();
  let {data,error}=await client.from('player_saves').select('profile,active_match').eq('user_id',currentUser.id).maybeSingle();
  if(error)throw error;
  if(!data){const created=await client.from('player_saves').insert({user_id:currentUser.id,profile:{},active_match:null}).select('profile,active_match').single();if(created.error)throw created.error;data=created.data}
  return{profile:data.profile,activeMatch:data.active_match};
}
function queueServerState(patch){
  if(!currentUser)return Promise.resolve();
  serverSaveQueue=serverSaveQueue.then(async()=>{
    const {error}=await requireSupabase().from('player_saves').update({...patch,updated_at:new Date().toISOString()}).eq('user_id',currentUser.id);
    if(error)throw error;
  }).catch(error=>{console.error('Falha ao salvar na nuvem:',error);const status=document.querySelector('#account-save-status');if(status)status.textContent=`Falha ao sincronizar com Supabase: ${error.message}`});
  return serverSaveQueue;
}
function requireSupabase(){if(!window.jojoSupabaseClient)throw new Error('Conecte o projeto Supabase em supabase-config.js antes de entrar.');return window.jojoSupabaseClient}
function usernameEmail(username){return `${username.trim().toLowerCase()}@users.jojobizarrechess.com`}
function readableAuthError(error){const detail=String(error?.message||'');if(/email rate limit exceeded|rate limit.*email/i.test(detail))return'Limite de cadastro do Supabase atingido. Aguarde o limite renovar ou configure um SMTP próprio em Authentication → Emails → SMTP Settings. Se a conta já foi criada, tente ENTRAR em vez de criar outra.';return detail||'Não foi possível autenticar com o Supabase.'}
function localUserFromSupabase(user){const email=user.email||'',username=String(user.user_metadata?.username||email.split('@')[0]||'JOGADOR').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24)||'JOGADOR';return{id:user.id,username,role:'user',email}}

async function startAccount(authUser){
  currentUser=localUserFromSupabase(authUser);updateCoinDisplay();
  document.querySelector('#account-save-status').textContent='Carregando progresso salvo no Supabase…';
  const accountState=await loadServerState();
  await initializeSavedGame(accountState);
  await serverSaveQueue;
  document.querySelector('#account-save-status').textContent='Progresso sincronizado com Supabase.';
  document.querySelector('#auth-dialog').close();
  const note=document.querySelector('.save-note');if(note)note.textContent='LOGIN SUPABASE · PROGRESSO NESTE NAVEGADOR';
}

function setAuthMode(next){
  authMode=next;const registering=authMode==='register',usernameInput=document.querySelector('#auth-username');
  document.querySelector('#auth-title').textContent=registering?'Criar conta':'Entrar';
  document.querySelector('#auth-explainer').textContent=registering?'Crie sua conta com um nome de jogador e uma senha.':'Entre com seu nome de jogador e senha.';
  document.querySelector('#auth-submit').textContent=registering?'CRIAR CONTA':'ENTRAR';
  document.querySelector('#auth-toggle').textContent=registering?'JÁ TENHO CONTA':'CRIAR CONTA';
  document.querySelector('#auth-password').autocomplete=registering?'new-password':'current-password';
  usernameInput.required=true;
  document.querySelector('#auth-message').textContent='';
}

async function bootstrapAccount(){
  setAuthMode('login');const dialog=document.querySelector('#auth-dialog');dialog.showModal();
  try{const {data,error}=await requireSupabase().auth.getSession();if(error)throw error;if(data.session?.user){await startAccount(data.session.user);return}}
  catch(error){document.querySelector('#auth-message').textContent=error.message}
  document.querySelector('#auth-username').focus();
}

document.querySelector('#auth-form').addEventListener('submit',async event=>{
  event.preventDefault();const username=document.querySelector('#auth-username').value.trim(),password=document.querySelector('#auth-password').value,submit=document.querySelector('#auth-submit'),message=document.querySelector('#auth-message');
  if(!/^[A-Za-z0-9_-]{3,24}$/.test(username)){message.textContent='Use um nome de 3 a 24 caracteres, com letras, números, _ ou -.';return}
  if(password.length<10||password.length>128){message.textContent='A senha deve ter entre 10 e 128 caracteres.';return}
  submit.disabled=true;message.textContent=authMode==='register'?'Criando conta…':'Entrando…';
  try{
    const client=requireSupabase();
    if(authMode==='register'){
      const {data,error}=await client.auth.signUp({email:usernameEmail(username),password,options:{data:{username}}});
      if(error)throw error;
      if(data.session?.user){await startAccount(data.session.user);document.querySelector('#auth-password').value=''}
      else{message.textContent='Conta criada, mas não foi iniciada. Verifique se a confirmação de email está desativada no Supabase.';setAuthMode('login');document.querySelector('#auth-username').value=username;message.textContent='Conta criada, mas não foi iniciada. Verifique se a confirmação de email está desativada no Supabase.'}
    }else{
      const {data,error}=await client.auth.signInWithPassword({email:usernameEmail(username),password});if(error)throw error;
      await startAccount(data.user);document.querySelector('#auth-password').value='';
    }
  }catch(error){message.textContent=readableAuthError(error)}
  finally{submit.disabled=false}
});

document.querySelector('#auth-toggle').addEventListener('click',()=>setAuthMode(authMode==='login'?'register':'login'));
document.querySelector('#logout').addEventListener('click',async()=>{try{const {error}=await requireSupabase().auth.signOut();if(error)throw error;location.reload()}catch(error){document.querySelector('#account-save-status').textContent=error.message}});
document.querySelector('#activate-admin').addEventListener('click',()=>{
  const message=document.querySelector('#admin-activation-message'),code=document.querySelector('#admin-code-input').value.trim().toUpperCase();
  if(code!==ADMIN_ACTIVATION_CODE){message.textContent='Código incorreto.';return}
  currentUser.role='admin';loadProfile();saveProfile();updateCoinDisplay();renderShop();render();document.querySelector('#admin-code-input').value='';message.textContent='Administrador de demonstração ativado apenas nesta sessão.';document.querySelector('#open-local-admin').hidden=false;
});
document.querySelector('#admin-code-input').addEventListener('input',event=>{event.currentTarget.value=event.currentTarget.value.toUpperCase()});
document.querySelector('#open-local-admin').addEventListener('click',()=>{
  const list=document.querySelector('#local-admin-users');list.replaceChildren();
  const item=document.createElement('li'),name=document.createElement('strong'),meta=document.createElement('small');name.textContent=currentUser?.username||'JOGADOR';meta.textContent='SESSÃO ATUAL · ADMINISTRAÇÃO DE DEMONSTRAÇÃO';item.append(name,meta);list.appendChild(item);
  document.querySelector('#local-admin-dialog').showModal();
});
document.querySelector('#close-local-admin').addEventListener('click',()=>document.querySelector('#local-admin-dialog').close());
bootstrapAccount();
