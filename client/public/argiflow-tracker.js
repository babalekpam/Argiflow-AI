/**
 * ArgiFlow Tracker — Frontend Snippet v1.0
 * Add to any website <head>:
 * <script src="/argiflow-tracker.js" data-host="https://your-argiflow.com"></script>
 *
 * What it tracks:
 *  - Page views (including SPA route changes)
 *  - Sessions (entry, exit, duration, bounce)
 *  - Clicks + Rage Clicks (3+ clicks same spot < 1 second)
 *  - Scroll depth (how far down each page)
 *  - Search queries (auto-detects search inputs)
 *  - Form behavior (start, field focus, abandon, submit)
 *  - Custom events via ArgiFlow.track()
 *  - User identification via ArgiFlow.identify()
 */
(function () {
  'use strict';

  const HOST = document.currentScript?.getAttribute('data-host') || '';
  const API  = HOST + '/api/tracker';

  // Persistent visitor ID (survives page reloads)
  // Session ID (resets after 30 min inactivity)
  const getOrCreate = (key) => {
    let v = localStorage.getItem(key);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(key, v); }
    return v;
  };
  const VISITOR_ID = getOrCreate('af_vid');
  const SESSION_ID = (() => {
    const K='af_sid', E='af_sid_exp', now=Date.now();
    const extend = () => localStorage.setItem(E, now + 30*60*1000);
    if (localStorage.getItem(E) && +localStorage.getItem(E) > now) { extend(); return localStorage.getItem(K); }
    const s = crypto.randomUUID();
    localStorage.setItem(K, s); extend(); return s;
  })();

  const send = (path, data) => {
    try {
      const url = API + path;
      if (navigator.sendBeacon) navigator.sendBeacon(url, JSON.stringify(data));
      else fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),keepalive:true});
    } catch(e){}
  };

  // UTM params — persist for session
  const p = new URLSearchParams(location.search);
  const utms = {
    utm_source:   p.get('utm_source')   || sessionStorage.getItem('af_utm_s') || '',
    utm_medium:   p.get('utm_medium')   || sessionStorage.getItem('af_utm_m') || '',
    utm_campaign: p.get('utm_campaign') || sessionStorage.getItem('af_utm_c') || '',
    utm_term:     p.get('utm_term')     || sessionStorage.getItem('af_utm_t') || '',
  };
  if(utms.utm_source){sessionStorage.setItem('af_utm_s',utms.utm_source);sessionStorage.setItem('af_utm_m',utms.utm_medium);sessionStorage.setItem('af_utm_c',utms.utm_campaign);sessionStorage.setItem('af_utm_t',utms.utm_term);}

  // Session start
  send('/session',{session_id:SESSION_ID,visitor_id:VISITOR_ID,user_id:window.__af_uid||null,entry_page:location.pathname,referrer:document.referrer,...utms});

  // Page views (including SPA)
  let pageCount=0;
  const pv = () => {
    pageCount++;
    send('/pageview',{session_id:SESSION_ID,visitor_id:VISITOR_ID,user_id:window.__af_uid||null,page:location.pathname,title:document.title,referrer:document.referrer,screen_width:screen.width,screen_height:screen.height,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,...utms});
  };
  pv();
  const op=history.pushState.bind(history),or=history.replaceState.bind(history);
  history.pushState=(...a)=>{op(...a);pv();};history.replaceState=(...a)=>{or(...a);pv();};
  window.addEventListener('popstate',pv);

  // Session end
  const t0=Date.now();
  const end=()=>send('/session/end',{session_id:SESSION_ID,duration_seconds:Math.round((Date.now()-t0)/1000),exit_page:location.pathname,page_count:pageCount});
  window.addEventListener('beforeunload',end);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')end();});

  // Scroll depth
  let maxSc=0,hitBottom=false,scT=Date.now();
  window.addEventListener('scroll',()=>{
    const pct=Math.round(((window.scrollY+window.innerHeight)/document.documentElement.scrollHeight)*100);
    if(pct>maxSc){maxSc=pct;if(pct>=90&&!hitBottom){hitBottom=true;send('/scroll',{session_id:SESSION_ID,visitor_id:VISITOR_ID,page:location.pathname,max_depth_percent:pct,time_to_bottom_seconds:Math.round((Date.now()-scT)/1000)});}}
  },{passive:true});
  window.addEventListener('beforeunload',()=>send('/scroll',{session_id:SESSION_ID,visitor_id:VISITOR_ID,page:location.pathname,max_depth_percent:maxSc}));

  // Clicks + Rage clicks
  const cl=[];
  document.addEventListener('click',(e)=>{
    const el=e.target.closest('a,button,[data-track]')||e.target;
    const now=Date.now();
    cl.push({x:e.clientX,y:e.clientY,t:now});
    const rage=cl.filter(c=>now-c.t<1000&&Math.abs(c.x-e.clientX)<30&&Math.abs(c.y-e.clientY)<30);
    while(cl.length>20)cl.shift();
    send('/click',{session_id:SESSION_ID,visitor_id:VISITOR_ID,page:location.pathname,element_type:el.tagName?.toLowerCase(),element_text:(el.innerText||el.getAttribute('aria-label')||'').slice(0,100),element_id:el.id||null,element_class:el.className?.toString()?.slice(0,100)||null,href:el.href||null,x:Math.round(e.clientX),y:Math.round(e.clientY),is_rage_click:rage.length>=3});
  },{passive:true});

  // Search queries
  let sd;
  const trackS=(inp)=>{clearTimeout(sd);sd=setTimeout(()=>{const q=inp.value?.trim();if(q&&q.length>1)send('/search',{session_id:SESSION_ID,visitor_id:VISITOR_ID,user_id:window.__af_uid||null,query:q,page:location.pathname});},800);};
  const attachS=()=>document.querySelectorAll('input[type=search],input[name*=search],[data-af-search],input[placeholder*=search i]').forEach(i=>{if(!i._af){i._af=true;i.addEventListener('input',()=>trackS(i));i.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(sd);const q=i.value?.trim();if(q)send('/search',{session_id:SESSION_ID,visitor_id:VISITOR_ID,user_id:window.__af_uid||null,query:q,page:location.pathname});}});}});
  attachS();new MutationObserver(attachS).observe(document.body,{childList:true,subtree:true});

  // Form behavior
  const fs=new Set();
  document.addEventListener('focusin',e=>{
    const f=e.target.closest('form');if(!f)return;
    const fn=f.getAttribute('data-af-form')||f.name||f.id||'form';
    if(!fs.has(f)){fs.add(f);f._t=Date.now();send('/form',{session_id:SESSION_ID,visitor_id:VISITOR_ID,page:location.pathname,form_id:f.id||null,form_name:fn,event_type:'start'});}
    send('/form',{session_id:SESSION_ID,visitor_id:VISITOR_ID,page:location.pathname,form_id:f.id||null,form_name:fn,event_type:'field_focus',field_name:e.target.name||e.target.id||null});
  });
  document.addEventListener('submit',e=>{
    const f=e.target;const fn=f.getAttribute('data-af-form')||f.name||f.id||'form';fs.delete(f);
    send('/form',{session_id:SESSION_ID,visitor_id:VISITOR_ID,page:location.pathname,form_id:f.id||null,form_name:fn,event_type:'submit',time_on_form_seconds:f._t?Math.round((Date.now()-f._t)/1000):null});
  });
  window.addEventListener('beforeunload',()=>fs.forEach(f=>{const fn=f.getAttribute('data-af-form')||f.name||f.id||'form';send('/form',{session_id:SESSION_ID,visitor_id:VISITOR_ID,page:location.pathname,form_id:f.id||null,form_name:fn,event_type:'abandon',time_on_form_seconds:f._t?Math.round((Date.now()-f._t)/1000):null});}));

  // Public API
  window.ArgiFlow = {
    identify:(d)=>{window.__af_uid=d.user_id||null;send('/identify',{visitor_id:VISITOR_ID,...d});},
    track:(name,category,props={})=>send('/event',{session_id:SESSION_ID,visitor_id:VISITOR_ID,user_id:window.__af_uid||null,event_name:name,event_category:category,properties:props,page:location.pathname}),
    visitorId:VISITOR_ID,
    sessionId:SESSION_ID,
  };
})();
