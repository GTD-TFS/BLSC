(function(){
  'use strict';

  const cfg = {
    enabled: true,
    cooldownMs: 5 * 60 * 1000,
    requestTimeoutMs: 12000,
    monitorMs: 1500
  };

  const st = {
    inflight: false,
    lastTryAt: 0,
    lastOkAt: 0,
    doneOnce: false,
    knownImages: 0,
    timer: null
  };

  function now(){ return Date.now(); }

  function hasImages(){
    try { return !!(window.state && Array.isArray(window.state.images) && window.state.images.length > 0); }
    catch { return false; }
  }

  function processUrls(){
    try {
      if (typeof window._apiCandidates === 'function') {
        const arr = window._apiCandidates('process') || [];
        if (arr.length) return arr;
      }
    } catch {}
    try {
      if (Array.isArray(window.API_PROCESS_CANDIDATES) && window.API_PROCESS_CANDIDATES.length) {
        return window.API_PROCESS_CANDIDATES.filter(Boolean);
      }
    } catch {}
    return [`${window.location.origin}/process`];
  }

  async function maybeEncrypt(obj){
    try{
      if (typeof window.maybeEncryptPayload === 'function') {
        return await window.maybeEncryptPayload(obj);
      }
    }catch{}
    return obj;
  }

  async function fetchFirst(urls, init){
    let lastErr = null;
    for (const u of (urls || [])){
      try{
        const r = await fetch(u, init);
        return { r, url: u };
      }catch(e){ lastErr = e; }
    }
    throw (lastErr || new Error('prewarm_network_error'));
  }

  async function runPrewarm(reason){
    if (!cfg.enabled) return false;
    if (st.inflight) return false;

    const t = now();
    if (st.doneOnce && (t - st.lastTryAt) < cfg.cooldownMs) return false;

    st.inflight = true;
    st.lastTryAt = t;

    const ctrl = new AbortController();
    const killer = setTimeout(() => { try{ ctrl.abort(); }catch{} }, cfg.requestTimeoutMs);

    try{
      const payload = { texto: '', images_base64: [], _prewarm: 1, _why: reason || 'auto' };
      const body = await maybeEncrypt(payload);
      const first = await fetchFirst(processUrls(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });

      const ok = first && first.r && (first.r.status === 200 || first.r.status === 201 || first.r.status === 202);
      if (ok){
        st.lastOkAt = now();
        st.doneOnce = true;
      }
      return !!ok;
    } catch {
      return false;
    } finally {
      clearTimeout(killer);
      st.inflight = false;
    }
  }

  function schedule(reason){
    if (!hasImages()) return;
    void runPrewarm(reason || 'schedule');
  }

  function boot(){
    // Trigger inicial si ya hay imágenes
    st.knownImages = hasImages() ? (window.state.images.length || 0) : 0;
    if (st.knownImages > 0) schedule('boot_has_images');

    // 1) Importación por input file
    try{
      const f = document.getElementById('f');
      if (f) f.addEventListener('change', () => setTimeout(() => schedule('file_change'), 220));
    }catch{}

    // 2) Captura/alta desde otros flujos: observa cambios en thumbs
    try{
      const thumbs = document.getElementById('thumbs');
      if (thumbs && typeof MutationObserver !== 'undefined'){
        const mo = new MutationObserver(() => {
          if (!hasImages()) return;
          const n = window.state.images.length || 0;
          if (n > st.knownImages){
            st.knownImages = n;
            schedule('thumbs_added');
          }
        });
        mo.observe(thumbs, { childList: true, subtree: false });
      }
    }catch{}

    // 3) Guardia periódica por si un flujo no dispara events
    st.timer = setInterval(() => {
      if (!hasImages()) return;
      const n = window.state.images.length || 0;
      if (n > st.knownImages){
        st.knownImages = n;
        schedule('periodic_new_image');
      }
    }, cfg.monitorMs);

    window.compaPrewarm = {
      trigger: () => runPrewarm('manual'),
      status: () => ({ ...st, hasImages: hasImages() })
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
