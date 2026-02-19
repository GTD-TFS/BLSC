(function(){
  'use strict';

  const state = {
    mod: null,
    runner: null,
    ready: false,
    loading: null,
    lastError: ''
  };
  const LIMITS = {
    timeoutMs: 22000
  };

  function _num(v, d){
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  function _maxEdge(){
    const mem = _num(navigator.deviceMemory, 4);
    const cores = _num(navigator.hardwareConcurrency, 4);
    return (mem <= 4 || cores <= 4) ? 1700 : 2100;
  }

  function _keys(x){
    try { return Object.keys(x || {}).slice(0, 20); } catch { return []; }
  }

  function _asCallable(owner, key){
    const v = owner ? owner[key] : null;
    if (typeof v === 'function') return v.bind(owner);
    if (v && typeof v === 'object'){
      if (typeof v.default === 'function') return v.default.bind(v);
      if (typeof v.run === 'function') return v.run.bind(v);
      if (typeof v.predict === 'function') return v.predict.bind(v);
      if (typeof v.recognize === 'function') return v.recognize.bind(v);
      if (typeof v.detect === 'function') return v.detect.bind(v);
      if (typeof v.init === 'function') return v.init.bind(v);
    }
    return null;
  }

  function _makeInputVariants(payload){
    const out = [];
    const push = (v) => { if (v != null) out.push(v); };

    if (payload && typeof payload === 'object' && (payload.img || payload.canvas || payload.imageData || payload.base64 || payload.dataUrl)){
      push(payload.img);
      push(payload.canvas);
      push(payload.imageData);
      push(payload.base64);
      push(payload.dataUrl);
    } else {
      push(payload);
    }

    // dedupe simple por referencia/valor
    const uniq = [];
    const seen = new Set();
    for (const v of out){
      const key = (typeof v === 'object') ? `o:${Object.prototype.toString.call(v)}` : `p:${String(v)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(v);
    }
    return uniq;
  }

  async function _tryInvoke(fn, variants){
    if (typeof fn !== 'function') return { ok:false };
    for (const a of variants){
      try { return { ok:true, value: await fn(a) }; } catch {}
      try { return { ok:true, value: await fn({ image: a }) }; } catch {}
      try { return { ok:true, value: await fn({ input: a }) }; } catch {}
      try { return { ok:true, value: await fn([a]) }; } catch {}
    }
    return { ok:false };
  }

  async function _callDynamic(owner, key, args){
    if (!owner) throw new Error(`owner_null_${key}`);
    let v = null;
    try { v = owner[key]; } catch {}

    const tryCall = async (fn, ctx) => {
      if (typeof fn !== 'function') return { ok:false };
      const variants = _makeInputVariants((args && args.length) ? args[0] : null);
      for (const a of variants){
        try { return { ok:true, value: await fn.call(ctx || owner, a) }; } catch {}
        try { return { ok:true, value: await fn.call(ctx || owner, { image: a }) }; } catch {}
        try { return { ok:true, value: await fn.call(ctx || owner, { input: a }) }; } catch {}
      }
      try { return { ok:true, value: await fn.apply(ctx || owner, args) }; } catch {}
      return { ok:false };
    };

    // directo
    let t = await tryCall(v, owner);
    if (t.ok) return t.value;

    // wrapper típico
    if (v && typeof v === 'object'){
      t = await tryCall(v.default, v); if (t.ok) return t.value;
      t = await tryCall(v.run, v); if (t.ok) return t.value;
      t = await tryCall(v.predict, v); if (t.ok) return t.value;
      t = await tryCall(v.recognize, v); if (t.ok) return t.value;
      t = await tryCall(v.detect, v); if (t.ok) return t.value;
      t = await tryCall(v.init, v); if (t.ok) return t.value;
    }

    // promise -> función/objeto
    if (v && typeof v.then === 'function'){
      try{
        const r = await v;
        t = await tryCall(r, owner); if (t.ok) return t.value;
        if (r && typeof r === 'object'){
          t = await tryCall(r.default, r); if (t.ok) return t.value;
          t = await tryCall(r.run, r); if (t.ok) return t.value;
          t = await tryCall(r.predict, r); if (t.ok) return t.value;
          t = await tryCall(r.recognize, r); if (t.ok) return t.value;
          t = await tryCall(r.detect, r); if (t.ok) return t.value;
          t = await tryCall(r.init, r); if (t.ok) return t.value;
        }
      }catch{}
    }

    throw new Error(`method_not_callable_${key}`);
  }

  function _buildRunFrom(target){
    if (!target) return null;
    const rec = _asCallable(target, 'recognize');
    const det = _asCallable(target, 'detect');
    const ocr = _asCallable(target, 'ocr');
    const pred = _asCallable(target, 'predict');
    if (!(rec || det || ocr || pred)) return null;

    return async (payload) => {
      const variants = _makeInputVariants(payload);

      if (rec){
        const r = await _tryInvoke(rec, variants);
        if (r.ok) return r.value;
      }
      if (det){
        const d = await _tryInvoke(det, variants);
        if (d.ok){
          if (rec){
            for (const a of variants){
              try { return await rec(a, d.value); } catch {}
              try { return await rec(d.value, a); } catch {}
              try { return await rec({ image: a, det: d.value }); } catch {}
              try { return await rec({ det: d.value, image: a }); } catch {}
            }
          }
          return d.value;
        }
      }
      if (ocr){
        const o = await _tryInvoke(ocr, variants);
        if (o.ok) return o.value;
      }
      if (pred){
        const p = await _tryInvoke(pred, variants);
        if (p.ok) return p.value;
      }
      throw new Error('Runner Paddle sin método utilizable.');
    };
  }

  async function _tryBuildRunner(root, tried){
    if (!root) return null;
    tried.push(_keys(root).join(','));

    // Caso objeto con métodos directos
    if (typeof root === 'object'){
      const init = _asCallable(root, 'init');
      const runDirect = _buildRunFrom(root);
      if (runDirect) return { init, run: runDirect };

      // Algunos builds exponen métodos útiles solo tras init() devolviendo una instancia.
      if (init){
        try{
          const initRes = await init();
          const runAfterInitRes = _buildRunFrom(initRes);
          if (runAfterInitRes) return { init: null, run: runAfterInitRes };
          const runAfterInitRoot = _buildRunFrom(root);
          if (runAfterInitRoot) return { init: null, run: runAfterInitRoot };
        }catch{}
      }

      // Fallback dinámico por nombre de método aunque no sea función directa.
      const k = _keys(root);
      if (k.includes('recognize') || k.includes('detect') || k.includes('init')){
        return {
          init: async () => { try { await _callDynamic(root, 'init', []); } catch {} },
          run: async (payload) => {
            try { return await _callDynamic(root, 'recognize', [payload]); } catch {}
            try { return await _callDynamic(root, 'detect', [payload]); } catch {}
            try { return await _callDynamic(root, 'ocr', [payload]); } catch {}
            try { return await _callDynamic(root, 'predict', [payload]); } catch {}
            throw new Error('Runner dinámico Paddle sin método ejecutable.');
          }
        };
      }
    }

    // Caso función con API estática (init/recognize en la propia función)
    if (typeof root === 'function'){
      const initStatic = _asCallable(root, 'init');
      const runStatic = _buildRunFrom(root);
      if (runStatic){
        return { init: initStatic, run: runStatic };
      }
      if (initStatic){
        try{
          const initRes = await initStatic();
          const runAfterInitRes = _buildRunFrom(initRes);
          if (runAfterInitRes) return { init: null, run: runAfterInitRes };
          const runAfterInitRoot = _buildRunFrom(root);
          if (runAfterInitRoot) return { init: null, run: runAfterInitRoot };
        }catch{}
      }
    }

    // Caso clase/constructor
    if (typeof root === 'function'){
      try{
        const inst = new root();
        const init = _asCallable(inst, 'init');
        const run = _buildRunFrom(inst);
        if (run) return { init, run };
      }catch{}
    }
    return null;
  }

  async function _pickRunner(raw){
    const roots = [];
    roots.push(raw);
    if (raw && raw.default) roots.push(raw.default);
    if (raw && raw.OCR) roots.push(raw.OCR);
    if (raw && raw.default && raw.default.OCR) roots.push(raw.default.OCR);
    if (raw && raw.default && raw.default.default) roots.push(raw.default.default);

    const tried = [];

    for (const root of roots){
      const direct = await _tryBuildRunner(root, tried);
      if (direct) return direct;
    }

    // Búsqueda recursiva suave en anidados (profundidad 2) para builds raros.
    const seen = new Set();
    async function walk(obj, depth){
      if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return null;
      if (seen.has(obj) || depth > 2) return null;
      seen.add(obj);

      const hit = await _tryBuildRunner(obj, tried);
      if (hit) return hit;

      for (const k of _keys(obj)){
        let child = null;
        try{ child = obj[k]; }catch{}
        const found = await walk(child, depth + 1);
        if (found) return found;
      }
      return null;
    }
    for (const root of roots){
      const found = await walk(root, 0);
      if (found) return found;
    }

    throw new Error(`API Paddle no compatible. exports=${tried.filter(Boolean).join(' | ')}`);
  }

  async function loadModule(){
    if (state.ready && state.runner) return state.runner;
    if (state.loading) return state.loading;

    state.loading = (async () => {
      let mod = null;
      const sources = [
        'https://esm.sh/@paddlejs-models/ocr@1.2.4',
        'https://cdn.jsdelivr.net/npm/@paddlejs-models/ocr@1.2.4/+esm',
        'https://cdn.skypack.dev/@paddlejs-models/ocr@1.2.4',
        'https://esm.run/@paddlejs-models/ocr@1.2.4'
      ];

      let lastErr = null;
      for (const src of sources){
        try{
          mod = await import(src);
          if (mod) break;
        }catch(err){
          lastErr = err;
          try{ state.lastError = `[${src}] ${String(err?.message || err)}`; }catch{}
        }
      }
      if (!mod) throw (lastErr || new Error('No se pudo cargar Paddle OCR.'));

      const runner = await _pickRunner(mod);
      if (typeof runner.init === 'function'){
        await runner.init();
      }
      state.mod = mod;
      state.runner = runner;
      state.ready = true;
      state.lastError = '';
      return runner;
    })();

    try{
      return await state.loading;
    } finally {
      state.loading = null;
    }
  }

  function base64ToImage(base64){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen para OCR local.'));
      img.src = /^data:/i.test(base64 || '') ? base64 : `data:image/jpeg;base64,${base64 || ''}`;
    });
  }

  async function recognizeBase64(base64){
    const runner = await loadModule();
    const img = await base64ToImage(base64);
    const canvas = document.createElement('canvas');
    let w = img.naturalWidth || img.width || 1;
    let h = img.naturalHeight || img.height || 1;
    const edge = Math.max(w, h);
    const maxEdge = _maxEdge();
    if (edge > maxEdge){
      const ratio = maxEdge / edge;
      w = Math.max(1, Math.floor(w * ratio));
      h = Math.max(1, Math.floor(h * ratio));
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0);
    const imageData = ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
    const payload = {
      img,
      canvas,
      imageData,
      base64: /^data:/i.test(base64 || '') ? base64 : `data:image/jpeg;base64,${base64 || ''}`,
      dataUrl: canvas.toDataURL('image/jpeg', 0.92)
    };
    const runPromise = (typeof runner === 'function') ? runner(payload) : runner.run(payload);
    const res = await Promise.race([
      runPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout_paddle_local')), LIMITS.timeoutMs))
    ]);
    if (typeof res === 'string') return { text: res, raw: res };
    if (Array.isArray(res)) return { text: res.join('\n'), raw: res };

    const text = (res && typeof res.text === 'string')
      ? res.text
      : (res && Array.isArray(res.text) ? res.text.join('\n') : '');

    return { text: text || '', raw: res };
  }

  window.compaPaddleOCR = {
    version: 'v10',
    load: loadModule,
    recognizeBase64,
    getLastError: () => state.lastError || ''
  };
})();
