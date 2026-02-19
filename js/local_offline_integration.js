(function(){
  'use strict';

  const MODE_KEY = 'compa_local_private_mode';
  const MODE_INIT_KEY = 'compa_local_private_mode_inited';
  const AI_OPT_IN_KEY = 'compa_local_ai_enabled';
  let _tesseractLoadPromise = null;
  let _localAiLoader = null;
  let _paddleLoader = null;
  const LOCAL_DEFAULTS = {
    hardBudgetMs: 110000,
    coolDownMs: 260,
    perOcrTimeoutMs: 23000
  };

  function notify(msg, kind){
    try{
      if (typeof setStatus === 'function') setStatus(msg, kind || 'muted');
    }catch{}
    try{
      const id = 'compaLocalToast';
      let t = document.getElementById(id);
      if (!t){
        t = document.createElement('div');
        t.id = id;
        t.style.position = 'fixed';
        t.style.left = '50%';
        t.style.bottom = 'calc(var(--bottomDockH, 58px) + 14px)';
        t.style.transform = 'translateX(-50%)';
        t.style.zIndex = '220000';
        t.style.maxWidth = '90vw';
        t.style.padding = '8px 10px';
        t.style.borderRadius = '10px';
        t.style.fontSize = '12px';
        t.style.fontWeight = '700';
        t.style.textAlign = 'center';
        t.style.background = 'rgba(20,20,20,.92)';
        t.style.color = '#fff';
        t.style.border = '1px solid rgba(255,255,255,.18)';
        document.body.appendChild(t);
      }
      t.textContent = String(msg || '');
      t.style.display = 'block';
      clearTimeout(window.__compaLocalToastTimer);
      window.__compaLocalToastTimer = setTimeout(() => { try{ t.style.display = 'none'; }catch{} }, 2600);
    }catch{}
  }

  function deepClone(v){ return JSON.parse(JSON.stringify(v)); }

  function _sleep(ms){
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
  }

  function _num(v, d){
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  function _buildOcrLimits(){
    const mem = _num(navigator.deviceMemory, 4);
    const cores = _num(navigator.hardwareConcurrency, 4);
    const smallDevice = mem <= 4 || cores <= 4;
    return {
      baseScale: smallDevice ? 1.6 : 2.0,
      maxEdge: smallDevice ? 1800 : 2200,
      maxGeneralQuick: smallDevice ? 6 : 10,
      maxGeneralRefine: smallDevice ? 2 : 3,
      maxMrzQuick: smallDevice ? 8 : 14,
      maxMrzRefine: smallDevice ? 2 : 4,
      hardBudgetMs: smallDevice ? 75000 : LOCAL_DEFAULTS.hardBudgetMs,
      coolDownMs: smallDevice ? 320 : LOCAL_DEFAULTS.coolDownMs,
      perOcrTimeoutMs: smallDevice ? 18000 : LOCAL_DEFAULTS.perOcrTimeoutMs
    };
  }

  function _isLocalAiEnabled(){
    try { return localStorage.getItem(AI_OPT_IN_KEY) === '1'; }
    catch { return false; }
  }

  function _loadLocalAiScript(){
    if (window.compaLocalAIOCR) return Promise.resolve(window.compaLocalAIOCR);
    if (_localAiLoader) return _localAiLoader;
    _localAiLoader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'js/local_ai_vision.js?v=1';
      s.async = true;
      s.onload = () => window.compaLocalAIOCR ? resolve(window.compaLocalAIOCR) : reject(new Error('local_ai_boot_missing'));
      s.onerror = () => reject(new Error('local_ai_script_load_failed'));
      document.head.appendChild(s);
    });
    return _localAiLoader;
  }

  async function _loadLocalAiEngine(timeoutMs){
    await _loadLocalAiScript();
    if (!window.compaLocalAIOCR || typeof window.compaLocalAIOCR.load !== 'function'){
      throw new Error('local_ai_api_missing');
    }
    return Promise.race([
      window.compaLocalAIOCR.load(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout_local_ai_load')), Math.max(4000, Number(timeoutMs || 9000))))
    ]);
  }

  function _loadPaddleScript(){
    if (window.compaPaddleOCR) return Promise.resolve(window.compaPaddleOCR);
    if (_paddleLoader) return _paddleLoader;
    _paddleLoader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'js/local_paddle_ocr.js?v=10';
      s.async = true;
      s.onload = () => window.compaPaddleOCR ? resolve(window.compaPaddleOCR) : reject(new Error('paddle_api_missing_after_script'));
      s.onerror = () => reject(new Error('paddle_script_load_failed'));
      document.head.appendChild(s);
    });
    return _paddleLoader;
  }

  async function _ensurePaddleReady(timeoutMs){
    try{
      if (!window.compaPaddleOCR) await _loadPaddleScript();
      if (!window.compaPaddleOCR || typeof window.compaPaddleOCR.load !== 'function') return false;
      await Promise.race([
        window.compaPaddleOCR.load(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout_paddle_load')), Math.max(3500, Number(timeoutMs || 8000))))
      ]);
      return true;
    }catch{
      return false;
    }
  }

  function toDataUrl(base64){
    return /^data:/i.test(base64 || '') ? base64 : `data:image/jpeg;base64,${base64 || ''}`;
  }

  function dataUrlToImage(dataUrl){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar imagen local.'));
      img.src = dataUrl;
    });
  }

  function _drawImageToCanvas(img, scale){
    const limits = _buildOcrLimits();
    const s = Number(scale || limits.baseScale || 1);
    let w = Math.max(1, Math.floor((img.naturalWidth || img.width || 1) * s));
    let h = Math.max(1, Math.floor((img.naturalHeight || img.height || 1) * s));
    const edge = Math.max(w, h);
    if (edge > limits.maxEdge){
      const ratio = limits.maxEdge / edge;
      w = Math.max(1, Math.floor(w * ratio));
      h = Math.max(1, Math.floor(h * ratio));
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0, w, h);
    return c;
  }

  function _autocontrastInPlace(ctx, w, h){
    const im = ctx.getImageData(0, 0, w, h);
    const d = im.data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4){
      const y = (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114) | 0;
      if (y < min) min = y;
      if (y > max) max = y;
    }
    const span = Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4){
      const y = (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114);
      const v = Math.max(0, Math.min(255, Math.round(((y - min) * 255) / span)));
      d[i] = v; d[i+1] = v; d[i+2] = v;
    }
    ctx.putImageData(im, 0, 0);
  }

  function _thresholdInPlace(ctx, w, h, thr, invert){
    const im = ctx.getImageData(0, 0, w, h);
    const d = im.data;
    const t = Number(thr || 150);
    for (let i = 0; i < d.length; i += 4){
      const y = (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114);
      let v = y >= t ? 255 : 0;
      if (invert) v = 255 - v;
      d[i] = v; d[i+1] = v; d[i+2] = v;
    }
    ctx.putImageData(im, 0, 0);
  }

  function _cropCanvas(src, rx, ry, rw, rh){
    const sx = Math.max(0, Math.floor(src.width * rx));
    const sy = Math.max(0, Math.floor(src.height * ry));
    const sw = Math.max(1, Math.floor(src.width * rw));
    const sh = Math.max(1, Math.floor(src.height * rh));
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d');
    if (ctx) ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    return c;
  }

  function _cloneCanvas(src){
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d')?.drawImage(src, 0, 0);
    return c;
  }

  function _rotateCanvas(src, deg){
    const rad = (deg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const w = src.width, h = src.height;
    const nw = Math.max(1, Math.floor(w * cos + h * sin));
    const nh = Math.max(1, Math.floor(w * sin + h * cos));
    const c = document.createElement('canvas');
    c.width = nw; c.height = nh;
    const ctx = c.getContext('2d');
    if (!ctx) return _cloneCanvas(src);
    ctx.translate(nw / 2, nh / 2);
    ctx.rotate(rad);
    ctx.drawImage(src, -w / 2, -h / 2);
    return c;
  }

  function _applyGammaInPlace(ctx, w, h, gamma){
    const g = Math.max(0.2, Number(gamma || 1));
    const inv = 1 / g;
    const im = ctx.getImageData(0, 0, w, h);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4){
      d[i] = Math.max(0, Math.min(255, Math.round((Math.pow(d[i] / 255, inv)) * 255)));
      d[i+1] = Math.max(0, Math.min(255, Math.round((Math.pow(d[i+1] / 255, inv)) * 255)));
      d[i+2] = Math.max(0, Math.min(255, Math.round((Math.pow(d[i+2] / 255, inv)) * 255)));
    }
    ctx.putImageData(im, 0, 0);
  }

  function _sharpenInPlace(ctx, w, h, amount){
    const a = Math.max(0, Math.min(1.5, Number(amount || 0.8)));
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);
    const s = src.data, d = dst.data;
    const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++){
      for (let x = 1; x < w - 1; x++){
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++){
          let sum = 0, ki = 0;
          for (let yy = -1; yy <= 1; yy++){
            for (let xx = -1; xx <= 1; xx++){
              const ii = ((y + yy) * w + (x + xx)) * 4 + c;
              sum += s[ii] * k[ki++];
            }
          }
          const v = s[idx + c] * (1 - a) + sum * a;
          d[idx + c] = Math.max(0, Math.min(255, Math.round(v)));
        }
        d[idx + 3] = s[idx + 3];
      }
    }
    ctx.putImageData(dst, 0, 0);
  }

  function _otsuThreshold(ctx, w, h){
    const im = ctx.getImageData(0, 0, w, h).data;
    const hist = new Array(256).fill(0);
    let total = 0;
    for (let i = 0; i < im.length; i += 4){
      const y = Math.max(0, Math.min(255, Math.round(im[i] * 0.299 + im[i+1] * 0.587 + im[i+2] * 0.114)));
      hist[y]++;
      total++;
    }
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, varMax = 0, threshold = 127;
    for (let t = 0; t < 256; t++){
      wB += hist[t];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      if (varBetween > varMax){ varMax = varBetween; threshold = t; }
    }
    return threshold;
  }

  function _scoreGeneralText(text){
    const t = String(text || '');
    if (!t.trim()) return -1000;
    const len = t.length;
    const letters = (t.match(/[A-ZÁÉÍÓÚÑ]/gi) || []).length;
    const digits = (t.match(/\d/g) || []).length;
    const arrows = (t.match(/</g) || []).length;
    const lines = t.split('\n').filter(Boolean).length;
    return (letters * 1.2) + (digits * 0.9) + (lines * 2) - (arrows * 0.3) - (len > 2200 ? 60 : 0);
  }

  function _scoreMrzText(text){
    const t = String(text || '').toUpperCase();
    if (!t.trim()) return -1000;
    const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
    let score = 0;
    for (const l of lines){
      if (l.length >= 20) score += 15;
      if (/[<]{2,}/.test(l)) score += 18;
      if (/\d{6}[MF<]\d{6}/.test(l)) score += 35;
      if (/^[A-Z0-9<]+$/.test(l)) score += 12;
      score += (l.match(/</g) || []).length * 0.7;
    }
    return score;
  }

  function _buildGeneralVariants(baseCanvas){
    const out = [];

    const c1 = document.createElement('canvas');
    c1.width = baseCanvas.width; c1.height = baseCanvas.height;
    c1.getContext('2d')?.drawImage(baseCanvas, 0, 0);
    out.push({ name:'orig', canvas:c1 });

    const c2 = document.createElement('canvas');
    c2.width = baseCanvas.width; c2.height = baseCanvas.height;
    const ctx2 = c2.getContext('2d');
    if (ctx2){
      ctx2.drawImage(baseCanvas, 0, 0);
      _autocontrastInPlace(ctx2, c2.width, c2.height);
      _applyGammaInPlace(ctx2, c2.width, c2.height, 0.85);
      _sharpenInPlace(ctx2, c2.width, c2.height, 0.8);
      out.push({ name:'autocontrast_gamma_sharp', canvas:c2 });
    }

    const co = _cloneCanvas(baseCanvas);
    const cox = co.getContext('2d');
    let otsu = 145;
    if (cox){
      _autocontrastInPlace(cox, co.width, co.height);
      otsu = _otsuThreshold(cox, co.width, co.height);
    }
    for (const thr of [Math.max(90, otsu - 20), otsu, Math.min(210, otsu + 20), 125, 145, 165]){
      const c = document.createElement('canvas');
      c.width = baseCanvas.width; c.height = baseCanvas.height;
      const ctx = c.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(baseCanvas, 0, 0);
      _autocontrastInPlace(ctx, c.width, c.height);
      _sharpenInPlace(ctx, c.width, c.height, 0.7);
      _thresholdInPlace(ctx, c.width, c.height, thr, false);
      out.push({ name:`bw_${thr}`, canvas:c });
    }

    // Rotaciones pequeñas por posible inclinación de captura.
    const baseForRot = out.slice(0, 3);
    for (const it of baseForRot){
      for (const deg of [-3, -1.5, 1.5, 3]){
        out.push({ name:`${it.name}_rot_${deg}`, canvas:_rotateCanvas(it.canvas, deg) });
      }
    }
    return out;
  }

  function _buildMrzVariants(baseCanvas){
    const out = [];
    const crops = [
      { name:'mrz_a', rx:0.03, ry:0.58, rw:0.94, rh:0.38 },
      { name:'mrz_b', rx:0.05, ry:0.62, rw:0.90, rh:0.34 },
      { name:'mrz_c', rx:0.02, ry:0.64, rw:0.96, rh:0.32 }
    ];
    for (const cp of crops){
      const cropped = _cropCanvas(baseCanvas, cp.rx, cp.ry, cp.rw, cp.rh);

      const cRaw = document.createElement('canvas');
      cRaw.width = cropped.width; cRaw.height = cropped.height;
      cRaw.getContext('2d')?.drawImage(cropped, 0, 0);
      out.push({ name:`${cp.name}_raw`, canvas:cRaw });

      const cc = _cloneCanvas(cropped);
      const ccx = cc.getContext('2d');
      let otsu = 150;
      if (ccx){
        _autocontrastInPlace(ccx, cc.width, cc.height);
        otsu = _otsuThreshold(ccx, cc.width, cc.height);
      }
      for (const thr of [Math.max(80, otsu - 25), otsu, Math.min(220, otsu + 20), 120, 140, 160, 180]){
        const c = document.createElement('canvas');
        c.width = cropped.width; c.height = cropped.height;
        const ctx = c.getContext('2d');
        if (!ctx) continue;
        ctx.drawImage(cropped, 0, 0);
        _autocontrastInPlace(ctx, c.width, c.height);
        _sharpenInPlace(ctx, c.width, c.height, 0.9);
        _thresholdInPlace(ctx, c.width, c.height, thr, false);
        out.push({ name:`${cp.name}_bw_${thr}`, canvas:c });
      }

      for (const deg of [-2, -1, 1, 2]){
        out.push({ name:`${cp.name}_rot_${deg}`, canvas:_rotateCanvas(cropped, deg) });
      }
    }
    return out;
  }

  async function _recognizeWithTimeout(T, dataUrl, lang, options, timeoutMs){
    return Promise.race([
      T.recognize(dataUrl, lang, options || {}),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout_ocr_local')), timeoutMs))
    ]);
  }

  function loadTesseract(){
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (_tesseractLoadPromise) return _tesseractLoadPromise;

    _tesseractLoadPromise = new Promise((resolve, reject) => {
      const urls = [
        'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
        'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js'
      ];
      let i = 0;

      const next = () => {
        if (window.Tesseract) return resolve(window.Tesseract);
        if (i >= urls.length) return reject(new Error('No se pudo cargar Tesseract fallback.'));
        const s = document.createElement('script');
        s.src = urls[i++];
        s.async = true;
        s.onload = () => window.Tesseract ? resolve(window.Tesseract) : next();
        s.onerror = () => next();
        document.head.appendChild(s);
      };
      next();
    });
    return _tesseractLoadPromise;
  }

  function _confFromRaw(r){
    const c = Number(r?.data?.confidence);
    return Number.isFinite(c) ? c : 0;
  }

  function _lineNormKey(line){
    return String(line || '')
      .toUpperCase()
      .replace(/[ÁÀÂÄ]/g, 'A')
      .replace(/[ÉÈÊË]/g, 'E')
      .replace(/[ÍÌÎÏ]/g, 'I')
      .replace(/[ÓÒÔÖ]/g, 'O')
      .replace(/[ÚÙÛÜ]/g, 'U')
      .replace(/[«»]/g, '<')
      .replace(/[|]/g, 'I')
      .replace(/[+]/g, '<')
      .replace(/[^A-Z0-9<]/g, '')
      .replace(/<+/g, '<')
      .trim();
  }

  function _lineUseful(line){
    const s = String(line || '').trim();
    if (s.length < 2) return false;
    const alnum = (s.match(/[A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/g) || []).length;
    if (alnum < 2) return false;
    return true;
  }

  function _mergeOcrCandidates(generalResults, mrzResults){
    const pool = [];
    for (const g of (generalResults || []).slice(0, 7)){
      pool.push({ kind:'g', score:Number(g?.score)||0, text:String(g?.text||'') });
    }
    for (const m of (mrzResults || []).slice(0, 10)){
      pool.push({ kind:'m', score:Number(m?.score)||0, text:String(m?.text||'') });
    }
    pool.sort((a,b)=>b.score-a.score);

    const kept = [];
    const keys = [];

    for (const p of pool){
      const lines = p.text.split('\n').map(s => s.trim()).filter(Boolean);
      for (const raw of lines){
        if (!_lineUseful(raw)) continue;
        const line = p.kind === 'm' ? _normalizeMrzLine(raw) : raw;
        if (!_lineUseful(line)) continue;
        const key = _lineNormKey(line);
        if (key.length < 3) continue;

        let skip = false;
        for (let i = 0; i < keys.length; i++){
          const k = keys[i];
          if (k === key){ skip = true; break; }
          if (k.includes(key) || key.includes(k)){
            // mantener la más informativa (normalmente la más larga)
            if (key.length > k.length){
              keys[i] = key;
              kept[i] = line;
            }
            skip = true;
            break;
          }
        }
        if (!skip){
          keys.push(key);
          kept.push(line);
        }
      }
    }

    return kept.join('\n').trim();
  }

  async function localRecognize(base64){
    const dataUrl = toDataUrl(base64);
    const limits = _buildOcrLimits();
    const tStart = performance.now();
    // 0) IA local privada (solo si se activa manualmente).
    if (_isLocalAiEnabled()){
      try{
        await _loadLocalAiEngine(25000);
        if (window.compaLocalAIOCR && typeof window.compaLocalAIOCR.recognizeBase64 === 'function'){
          const aiRes = await window.compaLocalAIOCR.recognizeBase64(base64);
          const aiText = String(aiRes?.text || '').trim();
          if (aiText.length >= 18){
            return aiRes;
          }
        }
      }catch(e){
        // continúa con Paddle/Tesseract
      }
    }

    // 1) Paddle (preferente, si está disponible)
    try{
      const paddleReady = await _ensurePaddleReady(6000);
      if (paddleReady && window.compaPaddleOCR && typeof window.compaPaddleOCR.recognizeBase64 === 'function'){
        return await window.compaPaddleOCR.recognizeBase64(base64);
      }
    }catch(e){
      // continúa con fallback
    }

    // 2) Fallback robusto multipasada
    const T = await loadTesseract();
    const img = await dataUrlToImage(dataUrl);
    const baseCanvas = _drawImageToCanvas(img, limits.baseScale);

    const generalVariants = _buildGeneralVariants(baseCanvas);
    const mrzVariants = _buildMrzVariants(baseCanvas);

    const generalQuick = [];
    for (const v of generalVariants.slice(0, limits.maxGeneralQuick)){
      if ((performance.now() - tStart) > limits.hardBudgetMs) break;
      try{
        const r = await _recognizeWithTimeout(T, v.canvas.toDataURL('image/png'), 'spa+eng', {
          tessedit_pageseg_mode: '6',
          preserve_interword_spaces: '1'
        }, limits.perOcrTimeoutMs);
        const text = String(r?.data?.text || '').trim();
        const score = _scoreGeneralText(text) + (_confFromRaw(r) * 0.7);
        generalQuick.push({ name:v.name, text, score, raw:r, canvas:v.canvas });
      }catch{}
    }
    generalQuick.sort((a,b)=>b.score-a.score);

    const generalResults = [...generalQuick];
    for (const v of generalQuick.slice(0, limits.maxGeneralRefine)){
      if ((performance.now() - tStart) > limits.hardBudgetMs) break;
      for (const psm of ['4', '11', '13']){
        if ((performance.now() - tStart) > limits.hardBudgetMs) break;
        try{
          const r = await _recognizeWithTimeout(T, v.canvas.toDataURL('image/png'), 'spa+eng', {
            tessedit_pageseg_mode: psm,
            preserve_interword_spaces: '1'
          }, limits.perOcrTimeoutMs);
          const text = String(r?.data?.text || '').trim();
          const score = _scoreGeneralText(text) + (_confFromRaw(r) * 0.7);
          generalResults.push({ name:`${v.name}_psm${psm}`, text, score, raw:r });
        }catch{}
      }
    }
    generalResults.sort((a,b)=>b.score-a.score);
    const bestGeneral = generalResults[0] || { text:'', score:-1000, name:'none' };

    const mrzQuick = [];
    for (const v of mrzVariants.slice(0, limits.maxMrzQuick)){
      if ((performance.now() - tStart) > limits.hardBudgetMs) break;
      try{
        const r = await _recognizeWithTimeout(T, v.canvas.toDataURL('image/png'), 'eng', {
          tessedit_pageseg_mode: '6',
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'
        }, limits.perOcrTimeoutMs);
        const text = String(r?.data?.text || '').trim();
        const score = _scoreMrzText(text) + (_confFromRaw(r) * 0.9);
        mrzQuick.push({ name:v.name, text, score, raw:r, canvas:v.canvas });
      }catch{}
    }
    mrzQuick.sort((a,b)=>b.score-a.score);

    const mrzResults = [...mrzQuick];
    for (const v of mrzQuick.slice(0, limits.maxMrzRefine)){
      if ((performance.now() - tStart) > limits.hardBudgetMs) break;
      for (const psm of ['7', '13']){
        if ((performance.now() - tStart) > limits.hardBudgetMs) break;
        try{
          const r = await _recognizeWithTimeout(T, v.canvas.toDataURL('image/png'), 'eng', {
            tessedit_pageseg_mode: psm,
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'
          }, limits.perOcrTimeoutMs);
          const text = String(r?.data?.text || '').trim();
          const score = _scoreMrzText(text) + (_confFromRaw(r) * 0.9);
          mrzResults.push({ name:`${v.name}_psm${psm}`, text, score, raw:r });
        }catch{}
      }
    }
    mrzResults.sort((a,b)=>b.score-a.score);
    const bestMrz = mrzResults[0] || { text:'', score:-1000, name:'none' };

    const fullText = _mergeOcrCandidates(generalResults, mrzResults) || [bestGeneral.text, bestMrz.text].filter(Boolean).join('\n').trim();
    return {
      text: fullText,
      raw: {
        engine: 'tesseract_local',
        limits,
        elapsed_ms: Math.round(performance.now() - tStart),
        best_general: { name: bestGeneral.name, score: bestGeneral.score, text: bestGeneral.text },
        best_mrz: { name: bestMrz.name, score: bestMrz.score, text: bestMrz.text },
        merged_lines: fullText ? fullText.split('\n').length : 0,
        general_candidates: generalResults.slice(0, 4).map(x => ({ name:x.name, score:x.score })),
        mrz_candidates: mrzResults.slice(0, 6).map(x => ({ name:x.name, score:x.score }))
      }
    };
  }

  function ensureFiliBase(arr, i){
    if (!Array.isArray(arr)) return;
    if (!arr[i] || typeof arr[i] !== 'object'){
      arr[i] = {
        'Condición':'',
        'Nombre':'','Apellidos':'','Tipo de documento':'','Nº Documento':'','Sexo':'',
        'Nacionalidad':'','Fecha de nacimiento':'','Lugar de nacimiento':'',
        'Nombre de los Padres':'','Domicilio':'','Teléfono':''
      };
    }
  }

  function _cleanPersonName(s){
    const v = String(s || '')
      .replace(/[<]+/g, ' ')
      .replace(/[^A-ZÁÉÍÓÚÑ' -]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!v || /\d/.test(v)) return '';
    // quita prefijos basura de 1 letra tipo "A LOPEZ"
    const parts = v.split(' ').filter(Boolean);
    if (parts.length >= 2 && parts[0].length === 1) return parts.slice(1).join(' ');
    return v;
  }

  function _normalizeMrzLine(s){
    return String(s || '')
      .toUpperCase()
      .replace(/[«»]/g, '<')
      .replace(/[|]/g, 'I')
      .replace(/[+]/g, '<')
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9<]/g, '');
  }

  function _normalizeDocCandidate(v){
    let s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    // correcciones OCR comunes
    s = s
      .replace(/O/g, '0')
      .replace(/Q/g, '0')
      .replace(/I/g, '1')
      .replace(/L/g, '1')
      .replace(/Z/g, '2')
      .replace(/S/g, '5')
      .replace(/B/g, '8');
    return s;
  }

  function _isLikelyDocId(v){
    const s = _normalizeDocCandidate(v);
    if (!s) return false;
    if (s.length < 6 || s.length > 12) return false;
    // para DNI/NIE/TIE tiene que haber al menos un dígito
    if (!/\d/.test(s)) return false;
    return true;
  }

  function _fmtYYMMDD(v){
    const m = String(v || '').match(/^(\d{2})(\d{2})(\d{2})$/);
    if (!m) return '';
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
    const nowYY = Number(String(new Date().getFullYear()).slice(-2));
    const yyyy = (yy > nowYY ? 1900 : 2000) + yy;
    return `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${yyyy}`;
  }

  function _parseMrz(lines){
    const mrz = (lines || [])
      .map(l => _normalizeMrzLine(l))
      .filter(l => l.length >= 20 && /[<]/.test(l) && /[A-Z0-9]/.test(l));

    const out = {};
    if (!mrz.length) return out;

    // intenta detectar mejor la línea 2 de MRZ (fecha/sexo)
    const l2 = mrz.find(l => /\d{6}[MF<]\d{6}/.test(l)) || (mrz[1] || '');
    const l1 = mrz.find(l => l !== l2 && /^(I|P|A|C)/.test(l)) || (mrz[0] || '');
    const nameLine = [...mrz]
      .filter(l => l.includes('<<'))
      .sort((a,b)=>{
        const sa = (a.match(/[A-Z]/g)||[]).length - (a.match(/\d/g)||[]).length;
        const sb = (b.match(/[A-Z]/g)||[]).length - (b.match(/\d/g)||[]).length;
        return sb - sa;
      })[0] || '';

    if (/^I[D<]/.test(l1)) out['Tipo de documento'] = 'DNI';
    if (/^P</.test(l1)) out['Tipo de documento'] = 'PASAPORTE';

    if (l1.length >= 14){
      const docRaw = _normalizeDocCandidate(l1.slice(5, 14).replace(/</g, '').trim());
      if (_isLikelyDocId(docRaw)) out['Nº Documento'] = docRaw;
    }

    if (l2.length >= 18){
      // fallback doc desde línea 2 (bloque inicial)
      const doc2 = _normalizeDocCandidate(l2.slice(0, 10).replace(/</g, ''));
      if (!out['Nº Documento'] && _isLikelyDocId(doc2)) out['Nº Documento'] = doc2;

      const birth = _fmtYYMMDD(l2.slice(0, 6));
      if (birth) out['Fecha de nacimiento'] = birth;
      const sx = l2[7];
      if (sx === 'M') out['Sexo'] = 'MASCULINO';
      if (sx === 'F') out['Sexo'] = 'FEMENINO';
      const nat = l2.slice(15, 18);
      if (nat === 'ESP') out['Nacionalidad'] = 'ESPAÑOLA';
    }

    if (nameLine){
      const parts = nameLine.split('<<');
      if (parts.length >= 2){
        const ap = _cleanPersonName(parts[0].replace(/</g, ' '));
        const nom = _cleanPersonName(parts.slice(1).join(' ').replace(/</g, ' '));
        if (ap) out['Apellidos'] = ap;
        if (nom) out['Nombre'] = nom;
      }
    }

    return out;
  }

  function parseLocalFields(rawText){
    const text = String(rawText || '').replace(/\r/g, '');
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    const up = text.toUpperCase();
    const out = {};

    // 1) Prioridad MRZ para documentos de identidad.
    Object.assign(out, _parseMrz(lines));

    // 2) Fallback por etiquetas OCR.
    const mDoc = up.match(/\b([XYZ]?\d{7,8}[A-Z])\b/);
    if (!out['Nº Documento'] && mDoc && _isLikelyDocId(mDoc[1])) out['Nº Documento'] = mDoc[1];

    const mTipo = up.match(/\b(DNI|NIE|PASAPORTE)\b/);
    if (!out['Tipo de documento'] && mTipo) out['Tipo de documento'] = mTipo[1];

    const mSexo = up.match(/\b(MASCULINO|FEMENINO|HOMBRE|MUJER|VARON|VARÓN)\b/);
    if (!out['Sexo'] && mSexo){
      const sx = mSexo[1];
      out['Sexo'] = (sx === 'FEMENINO' || sx === 'MUJER') ? 'FEMENINO' : 'MASCULINO';
    }

    const mNac = text.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/);
    if (!out['Fecha de nacimiento'] && mNac) out['Fecha de nacimiento'] = mNac[1];

    const mNac2 = up.match(/NACIONALIDAD\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ ]{3,})/);
    if (!out['Nacionalidad'] && mNac2) out['Nacionalidad'] = mNac2[1].trim();

    const mNombre = up.match(/NOMBRE\S*\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ' ]{2,})/);
    if (!out['Nombre'] && mNombre){
      const v = _cleanPersonName(mNombre[1]);
      if (v) out['Nombre'] = v;
    }

    const mApe = up.match(/APELLIDOS?\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ' ]{2,})/);
    if (!out['Apellidos'] && mApe){
      const v = _cleanPersonName(mApe[1]);
      if (v) out['Apellidos'] = v;
    }

    const mDom = text.match(/DOMICILIO\s*[:\-]?\s*([^\n]{4,})/i);
    if (mDom) out['Domicilio'] = mDom[1].trim();

    const mTel = text.match(/(?:TEL[ÉE]FONO|MOVIL|MÓVIL|TLF)\s*[:\-]?\s*(\+?\d[\d\s]{6,})/i);
    if (mTel) out['Teléfono'] = mTel[1].replace(/\s+/g, ' ').trim();

    // 3) Último fallback de nombre, solo líneas limpias (sin números ni MRZ).
    if (!out['Nombre']){
      const candidates = lines.filter(l => {
        if (l.length < 3 || l.length > 50) return false;
        if (/[<]/.test(l)) return false;
        if (/\d/.test(l)) return false;
        const letters = (l.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length;
        return letters >= 3;
      });
      if (candidates.length){
        out['Nombre'] = candidates[0];
      }
    }

    return out;
  }

  function mergeParsedIntoFili(fi, parsed){
    if (!state.lastJson || typeof state.lastJson !== 'object') state.lastJson = {};
    if (!Array.isArray(state.lastJson.filiaciones)) state.lastJson.filiaciones = [];
    ensureFiliBase(state.lastJson.filiaciones, fi);

    const dst = state.lastJson.filiaciones[fi];
    for (const k of Object.keys(parsed || {})){
      const v = parsed[k];
      if (typeof v !== 'string') continue;
      if (!v.trim()) continue;
      dst[k] = v.trim();
    }
  }

  function isModeOn(){
    return localStorage.getItem(MODE_KEY) === '1';
  }

  function setMode(on){
    localStorage.setItem(MODE_KEY, on ? '1' : '0');
    renderModeUI();
  }

  let modeBtn = null;
  function renderModeUI(){
    if (!modeBtn) return;
    const on = isModeOn();
    modeBtn.textContent = on ? '[LOCAL]' : '[SERVIDOR]';
    modeBtn.style.background = on ? '#1d3a2c' : '#1e1e1e';
    modeBtn.style.borderColor = on ? 'rgba(110,220,160,.45)' : 'rgba(255,255,255,.25)';
    modeBtn.title = on
      ? 'Modo privado activo: OCR/parseo local, sin enviar imagen ni texto.'
      : 'Modo servidor activo: usa backend para procesar.';
  }

  function mountModeButton(){
    const host = document.getElementById('topDock') || document.body;
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'center';
    row.style.marginTop = '8px';

    modeBtn = document.createElement('button');
    modeBtn.type = 'button';
    modeBtn.style.padding = '8px 10px';
    modeBtn.style.borderRadius = '10px';
    modeBtn.style.border = '1px solid rgba(255,255,255,.25)';
    modeBtn.style.color = '#fff';
    modeBtn.style.fontWeight = '700';
    modeBtn.style.cursor = 'pointer';
    modeBtn.style.fontSize = '12px';

    modeBtn.addEventListener('click', () => {
      setMode(!isModeOn());
      notify(isModeOn() ? 'Modo local privado activado.' : 'Modo servidor activado.', 'muted');
    });

    row.appendChild(modeBtn);
    host.appendChild(row);
    renderModeUI();
  }

  async function runLocalProcessing(){
    if (!Array.isArray(state.images) || state.images.length === 0){
      notify('No hay imágenes para procesar en local.', 'err');
      return;
    }

    let finishedOk = false;
    let secs = 0;
    const t0 = performance.now();
    window.__compaLocalCancel = false;

    try{
      if (typeof showJobOverlay === 'function') showJobOverlay('Procesando (local)…', '');
      if (typeof setBusy === 'function') setBusy(true);
      state.polling = true;

      const rawBlocks = [];
      const limits = _buildOcrLimits();
      for (let i = 0; i < state.images.length; i++){
        if (window.__compaLocalCancel) throw new Error('cancelled');
        const img = state.images[i];
        const fiNum = Number(img?.fi);
        const fi = (Number.isFinite(fiNum) && fiNum >= 0) ? fiNum : i;

        if (typeof updateJobOverlay === 'function') updateJobOverlay(`OCR local ${i+1}/${state.images.length}…`, 'Procesando (local)…');

        const ocr = await localRecognize(img.base64);
        const text = String(ocr?.text || '');
        const engine = String(ocr?.raw?.engine || '');
        if (engine){
          notify(`Motor OCR: ${engine}`, 'muted');
        }
        rawBlocks.push(`### FILIACION ${fi+1}\\n${text}`);

        const parsed = parseLocalFields(text);
        mergeParsedIntoFili(fi, parsed);
        if (i < state.images.length - 1) await _sleep(limits.coolDownMs);
      }

      state.aiJson = deepClone(state.lastJson || {});
      if (typeof applyThumbOverrides === 'function') {
        try{ applyThumbOverrides(); }catch{}
      }

      if (el.ocrRaw) el.ocrRaw.value = rawBlocks.join('\n\n');
      if (typeof renderFiliaciones === 'function') renderFiliaciones(state.lastJson || {});
      if (typeof setExportEnabled === 'function') setExportEnabled(!!state.lastJson);
      if (typeof updateMainContentVisibility === 'function') updateMainContentVisibility();

      secs = (performance.now() - t0) / 1000;
      notify(`OCR local OK · ${secs.toFixed(1)}s`, 'ok');
      finishedOk = true;
    } catch (err){
      if (String(err?.message || '').toLowerCase().includes('cancelled')){
        notify('Cancelado.', 'muted');
      } else {
        notify(`Error OCR local: ${err?.message || err}`, 'err');
      }
    } finally {
      state.polling = false;
      if (typeof setBusy === 'function') setBusy(false);
      if (finishedOk){
        if (typeof markJobOverlayDone === 'function') markJobOverlayDone(secs);
        else if (typeof hideJobOverlay === 'function') hideJobOverlay();
      } else {
        if (typeof hideJobOverlay === 'function') hideJobOverlay();
      }
    }
  }

  function installHooks(){
    if (typeof el === 'undefined' || !el || !el.btnEnviar){
      notify('No se pudo activar OCR local (UI no disponible).', 'err');
      return;
    }
    if (typeof state === 'undefined' || !state){
      notify('No se pudo activar OCR local (estado no disponible).', 'err');
      return;
    }

    const originalSend = el.btnEnviar.onclick;
    const originalCancel = el.btnCancelar ? el.btnCancelar.onclick : null;

    if (el.btnCancelar){
      el.btnCancelar.onclick = function(ev){
        window.__compaLocalCancel = true;
        if (typeof originalCancel === 'function') return originalCancel.call(this, ev);
      };
    }

    el.btnEnviar.onclick = async function(ev){
      if (!isModeOn()){
        if (typeof originalSend === 'function') return originalSend.call(this, ev);
        return;
      }

      if (_isLocalAiEnabled()){
        try{
          await _loadLocalAiEngine(12000);
          notify('IA local privada lista.', 'muted');
        }catch(e){
          const msg = String(e?.message || e || '').trim();
          notify(`IA local no disponible. Uso OCR local clásico… ${msg}`.trim(), 'muted');
        }
      }

      const paddleReady = await _ensurePaddleReady(7000);
      if (!paddleReady){
        notify('Paddle OCR no disponible. Uso OCR local clásico.', 'muted');
      }

      return runLocalProcessing();
    };
  }

  function boot(){
    try{
      if (!localStorage.getItem(MODE_INIT_KEY)){
        localStorage.setItem(MODE_KEY, '1');
        localStorage.setItem(MODE_INIT_KEY, '1');
      }
    }catch{}
    mountModeButton();
    installHooks();
    notify(isModeOn() ? 'Modo local listo.' : 'Modo servidor activo.', 'muted');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
