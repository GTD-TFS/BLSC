(function(){
  'use strict';

  const state = {
    mod: null,
    pipe: null,
    ready: false,
    loading: null,
    lastError: '',
    model: 'Xenova/trocr-base-printed'
  };

  const LIMITS = {
    maxEdge: 1800,
    passTimeoutMs: 22000,
    maxPasses: 3
  };

  function _num(v, d){
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  function _toDataUrl(base64){
    return /^data:/i.test(base64 || '') ? base64 : `data:image/jpeg;base64,${base64 || ''}`;
  }

  function _sleep(ms){
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
  }

  function _withTimeout(p, ms, code){
    return Promise.race([
      p,
      new Promise((_, reject) => setTimeout(() => reject(new Error(code || 'timeout_local_ai')), ms))
    ]);
  }

  function _dataUrlToImage(dataUrl){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('local_ai_image_decode_failed'));
      img.src = dataUrl;
    });
  }

  function _drawScaled(img, scale){
    const c = document.createElement('canvas');
    let w = Math.max(1, Math.floor((img.naturalWidth || img.width || 1) * scale));
    let h = Math.max(1, Math.floor((img.naturalHeight || img.height || 1) * scale));
    const edge = Math.max(w, h);
    if (edge > LIMITS.maxEdge){
      const r = LIMITS.maxEdge / edge;
      w = Math.max(1, Math.floor(w * r));
      h = Math.max(1, Math.floor(h * r));
    }
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0, w, h);
    return c;
  }

  function _cloneCanvas(src){
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d')?.drawImage(src, 0, 0);
    return c;
  }

  function _cropCanvas(src, rx, ry, rw, rh){
    const sx = Math.max(0, Math.floor(src.width * rx));
    const sy = Math.max(0, Math.floor(src.height * ry));
    const sw = Math.max(1, Math.floor(src.width * rw));
    const sh = Math.max(1, Math.floor(src.height * rh));
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    c.getContext('2d')?.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    return c;
  }

  function _autocontrast(ctx, w, h){
    const im = ctx.getImageData(0, 0, w, h);
    const d = im.data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4){
      const y = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
      if (y < min) min = y;
      if (y > max) max = y;
    }
    const span = Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4){
      const y = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
      const v = Math.max(0, Math.min(255, Math.round(((y - min) * 255) / span)));
      d[i] = v; d[i + 1] = v; d[i + 2] = v;
    }
    ctx.putImageData(im, 0, 0);
  }

  function _buildPasses(img){
    const base = _drawScaled(img, 1.8);
    const pass = [];
    pass.push({ name: 'full', canvas: base });

    const hi = _cloneCanvas(base);
    const hctx = hi.getContext('2d');
    if (hctx){
      _autocontrast(hctx, hi.width, hi.height);
      pass.push({ name: 'full_autocontrast', canvas: hi });
    }

    const mrz = _cropCanvas(base, 0.01, 0.56, 0.98, 0.40);
    const mctx = mrz.getContext('2d');
    if (mctx) _autocontrast(mctx, mrz.width, mrz.height);
    pass.push({ name: 'mrz_crop', canvas: mrz });

    return pass.slice(0, LIMITS.maxPasses);
  }

  function _normLine(s){
    return String(s || '')
      .toUpperCase()
      .replace(/[ÁÀÂÄ]/g, 'A')
      .replace(/[ÉÈÊË]/g, 'E')
      .replace(/[ÍÌÎÏ]/g, 'I')
      .replace(/[ÓÒÔÖ]/g, 'O')
      .replace(/[ÚÙÛÜ]/g, 'U')
      .replace(/[«»]/g, '<')
      .replace(/[^A-Z0-9< ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function _mergeTexts(texts){
    const seen = new Set();
    const out = [];
    for (const t of texts){
      const lines = String(t || '').split(/\r?\n/g).map((x) => x.trim()).filter(Boolean);
      for (const ln of lines){
        const k = _normLine(ln);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(ln);
      }
    }
    return out.join('\n').trim();
  }

  async function _loadTransformers(){
    if (state.mod) return state.mod;

    const urls = [
      'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2',
      'https://esm.sh/@xenova/transformers@2.17.2'
    ];
    let lastErr = null;
    for (const u of urls){
      try{
        const mod = await import(u);
        if (mod){
          state.mod = mod;
          return mod;
        }
      }catch(err){
        lastErr = err;
      }
    }
    throw (lastErr || new Error('local_ai_transformers_load_failed'));
  }

  async function load(){
    if (state.ready && state.pipe) return state.pipe;
    if (state.loading) return state.loading;

    state.loading = (async () => {
      const mod = await _loadTransformers();
      const env = mod.env || {};
      env.allowRemoteModels = true;
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      if (env.backends && env.backends.onnx && env.backends.onnx.wasm){
        env.backends.onnx.wasm.numThreads = Math.max(1, Math.min(2, _num(navigator.hardwareConcurrency, 2)));
      }
      if (env.backends && env.backends.onnx){
        env.backends.onnx.wasm = env.backends.onnx.wasm || {};
        env.backends.onnx.wasm.simd = true;
      }
      const pipe = await mod.pipeline('image-to-text', state.model, { quantized: true });
      state.pipe = pipe;
      state.ready = true;
      state.lastError = '';
      return pipe;
    })();

    try{
      return await state.loading;
    }catch(err){
      state.lastError = String(err?.message || err || 'local_ai_load_failed');
      throw err;
    }finally{
      state.loading = null;
    }
  }

  async function _runPass(pipe, canvas){
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const result = await _withTimeout(
      pipe(dataUrl, { max_new_tokens: 256 }),
      LIMITS.passTimeoutMs,
      'timeout_local_ai_pass'
    );
    if (Array.isArray(result)){
      return result.map((x) => String(x?.generated_text || x?.text || '')).join('\n').trim();
    }
    return String(result?.generated_text || result?.text || '').trim();
  }

  async function recognizeBase64(base64){
    const pipe = await load();
    const img = await _dataUrlToImage(_toDataUrl(base64));
    const passes = _buildPasses(img);
    const blocks = [];
    for (const p of passes){
      try{
        const txt = await _runPass(pipe, p.canvas);
        if (txt) blocks.push(txt);
      }catch{}
      await _sleep(90);
    }
    const merged = _mergeTexts(blocks);
    return {
      text: merged,
      raw: {
        engine: 'local_ai_transformers',
        model: state.model,
        passes: passes.map((x) => x.name),
        pass_count: passes.length,
        text_count: blocks.length
      }
    };
  }

  window.compaLocalAIOCR = {
    version: 'v1-private-ai',
    load,
    recognizeBase64,
    getLastError: () => state.lastError || ''
  };
})();

