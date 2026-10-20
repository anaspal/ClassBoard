/* ClassBoard cloud: دخول Google للمعلم + حفظ سحابي + مشاركة حية برمز (Supabase) */
(function(){
  const C=window.CB_CONFIG||{};
  const CB=window.CB={enabled:!!(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY),sb:null,user:null,live:null};
  let loading=null;
  CB.load=function(){
    if(!CB.enabled)return Promise.reject(new Error('config'));
    if(CB.sb)return Promise.resolve(CB.sb);
    return loading||(loading=new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload=()=>{CB.sb=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY,{auth:{persistSession:true,detectSessionInUrl:true}});res(CB.sb);};
      s.onerror=()=>{loading=null;rej(new Error('load'));};document.head.appendChild(s);
    }));
  };
  function adopt(u){
    if(!u)return;CB.user=u;
    const m=u.user_metadata||{};
    try{localStorage.setItem('classboard.user',JSON.stringify({name:String(m.full_name||m.name||u.email).trim().split(/\s+/).slice(0,2).join(' '),role:'teacher',email:u.email,loginAt:Date.now(),cloud:true}));}catch(_){}
  }
  CB.init=async function(){
    if(!CB.enabled)return null;
    const sb=await CB.load();const {data}=await sb.auth.getSession();
    if(data&&data.session)adopt(data.session.user);
    sb.auth.onAuthStateChange((_e,s)=>{if(s&&s.user)adopt(s.user);});
    return CB.user;
  };
  CB.signInGoogle=async function(){
    const sb=await CB.load();
    const to=new URL('login.html',location.href).href;
    const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:to}});
    if(error)throw error;
  };
  CB.signOut=async function(){try{const sb=await CB.load();await sb.auth.signOut();}catch(_){}CB.user=null;localStorage.removeItem('classboard.user');};
  const ABC='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const genCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>ABC[b%ABC.length]).join('');
  /* ===== مشاركة حية (المعلم) ===== */
  CB.startLive=async function(getSnap){
    const sb=await CB.load();await CB.init();
    if(!CB.user)throw new Error('signin');
    const code=genCode();CB.live={code,busy:false,stop:false,getSnap};
    await CB.pushLive(true);
    CB.live.timer=setInterval(()=>{if(window.__cbDirty)CB.pushLive();},2000);
    return code;
  };
  CB.pushLive=async function(force){
    const L=CB.live;if(!L||L.busy)return;L.busy=true;window.__cbDirty=false;
    try{const sb=await CB.load();const snap=await L.getSnap();
      const {error}=await sb.from('live_sessions').upsert({code:L.code,name:snap.name||'',data:snap,updated_at:new Date().toISOString()});
      if(error)throw error;
    }catch(e){window.__cbDirty=true;console.warn('live push',e);}
    L.busy=false;
  };
  CB.stopLive=async function(){
    const L=CB.live;if(!L)return;clearInterval(L.timer);CB.live=null;
    try{const sb=await CB.load();await sb.from('live_sessions').delete().eq('code',L.code);}catch(_){}
  };
  /* ===== انضمام الطالب برمز (بدون حساب) ===== */
  CB.joinLive=async function(code,onSnap,onEnd){
    const sb=await CB.load();code=String(code||'').trim().toUpperCase();let last=null,miss=0;
    const tick=async()=>{
      try{
        const v=await sb.rpc('get_live_version',{p_code:code});
        if(v.error)throw v.error;
        if(!v.data){if(++miss>=3&&onEnd)onEnd(last===null?'notfound':'ended');return;}
        miss=0;if(v.data===last)return;
        const r=await sb.rpc('get_live',{p_code:code});
        if(r.error||!r.data)throw (r.error||new Error('empty'));
        last=r.data.updated_at;onSnap(r.data.data);
      }catch(e){console.warn('live poll',e);}
    };
    await tick();CB._poll=setInterval(tick,2000);
  };
  /* ===== نسخ احتياطي سحابي لسبورات المعلم ===== */
  let bt=null;
  CB.queueBoardSave=function(snap){
    if(!CB.user||!snap||!snap.id)return;clearTimeout(bt);
    bt=setTimeout(async()=>{try{const sb=await CB.load();await sb.from('boards').upsert({id:snap.id,name:snap.name||'',data:snap,updated_at:new Date().toISOString()});}catch(e){console.warn('cloud save',e);}},3000);
  };
  if(CB.enabled)CB.init().catch(()=>{});
})();
