// Configuração pública do cliente web. Nunca coloque uma chave secret/service_role aqui.
const SUPABASE_PROJECT_URL='https://tnjahipuweimyjmrejqf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_wQfU94EiV6AP5CkidA06dw_AaE5mmbm';

const supabaseConfigured=SUPABASE_PROJECT_URL.startsWith('https://')
  && !SUPABASE_PROJECT_URL.includes('SEU_PROJECT_REF')
  && SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_')
  && !SUPABASE_PUBLISHABLE_KEY.includes('COLE_SUA_CHAVE');

window.jojoSupabaseClient=supabaseConfigured&&window.supabase?.createClient
  ?window.supabase.createClient(SUPABASE_PROJECT_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}})
  :null;
