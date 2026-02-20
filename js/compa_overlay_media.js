function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

let _jobTimerInterval = null;
let _jobTimerStartedAt = 0;
const JOB_ESTIMATE_MSG = 'Tiempo aproximado por documento 40-50 seg.';

function _fmtJobSecs(totalSecs){
  const s = Math.max(0, Math.floor(Number(totalSecs) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
function _renderJobTimer(prefix){
  if (!el.jobTimer) return;
  const elapsedSecs = Math.floor((Date.now() - _jobTimerStartedAt) / 1000);
  el.jobTimer.textContent = `${prefix || 'Tiempo'}: ${_fmtJobSecs(elapsedSecs)}`;
}
function _startJobTimer(){
  _stopJobTimer();
  _jobTimerStartedAt = Date.now();
  _renderJobTimer('Tiempo');
  _jobTimerInterval = setInterval(() => _renderJobTimer('Tiempo'), 1000);
}
function _stopJobTimer(){
  if (_jobTimerInterval){
    clearInterval(_jobTimerInterval);
    _jobTimerInterval = null;
  }
}
function _setJobOverlayMode(mode){
  if (!el.jobOverlay) return;
  el.jobOverlay.dataset.mode = mode || 'running';
  if (el.jobCancel){
    if (mode === 'done'){
      el.jobCancel.textContent = 'Aceptar';
      el.jobCancel.classList.remove('secondary');
    } else {
      el.jobCancel.textContent = 'Cancelar';
      el.jobCancel.classList.add('secondary');
    }
  }
  const bar = el.jobOverlay.querySelector('.bar');
  if (bar) bar.style.display = (mode === 'done') ? 'none' : '';
}

function showJobOverlay(title, msg){
  if (!el.jobOverlay) return;
  if (el.jobTitle) el.jobTitle.textContent = title || 'Procesando…';
  if (el.jobMsg) el.jobMsg.textContent = JOB_ESTIMATE_MSG;
  _setJobOverlayMode('running');
  _startJobTimer();
  el.jobOverlay.classList.add('on');
  el.jobOverlay.setAttribute('aria-hidden','false');
}
function updateJobOverlay(msg, title){
  if (!el.jobOverlay || !el.jobOverlay.classList.contains('on')) return;
  if (title && el.jobTitle) el.jobTitle.textContent = title;
  if (el.jobMsg && el.jobOverlay?.dataset?.mode !== 'done') el.jobMsg.textContent = JOB_ESTIMATE_MSG;
}
function hideJobOverlay(){
  if (!el.jobOverlay) return;
  _stopJobTimer();
  _setJobOverlayMode('running');
  if (el.jobTimer) el.jobTimer.textContent = 'Tiempo: 00:00';
  el.jobOverlay.classList.remove('on');
  el.jobOverlay.setAttribute('aria-hidden','true');
}
function markJobOverlayDone(totalSecs){
  if (!el.jobOverlay || !el.jobOverlay.classList.contains('on')) return;
  _stopJobTimer();
  const secs = Number.isFinite(totalSecs) ? totalSecs : ((Date.now() - _jobTimerStartedAt) / 1000);
  const pretty = _fmtJobSecs(secs);
  if (el.jobTitle) el.jobTitle.textContent = 'Finalizado';
  if (el.jobMsg) el.jobMsg.textContent = 'Proceso completado correctamente.';
  if (el.jobTimer) el.jobTimer.textContent = `Tiempo final: ${pretty}`;
  _setJobOverlayMode('done');
}
function requestCancelJob(){
  if (el.jobOverlay?.dataset?.mode === 'done'){
    hideJobOverlay();
    return;
  }
  const ok = confirm('¿Cancelar el proceso en curso?');
  if (!ok) return;
  // reutiliza el cancel existente
  try{ el.btnCancelar?.click(); }catch{}
  hideJobOverlay();
}
if (el.jobCancel){
  el.jobCancel.addEventListener('click', requestCancelJob);
}
/* ========= Scroll lock (evita que haga scroll el fondo al usar el overlay) ========= */
let _bodyScrollLocked = false;

function lockBodyScroll(){
  if (_bodyScrollLocked) return;
  _bodyScrollLocked = true;
  document.body.classList.add('overlay-open');
}

function unlockBodyScroll(){
  if (!_bodyScrollLocked) return;
  _bodyScrollLocked = false;
  document.body.classList.remove('overlay-open');
}

/* ========= Visor de imagen + edición (overlay) ========= */
// Devuelve base64 de la imagen asociada a una filiación (por fi), aunque haya filiaciones manuales.
function getImgBase64ByFi(fi){
  const nfi = Number(fi);
  if (!Number.isFinite(nfi)) return "";
  // Preferente: match explícito por propiedad fi
  const hit = Array.isArray(state?.images)
    ? state.images.find(im => Number(im?.fi) === nfi && im?.base64)
    : null;
  if (hit && hit.base64) return hit.base64;
  // Fallback: índice directo (solo funciona si array está alineado)
  return (state?.images?.[nfi]?.base64) || "";
}
const ov = {
  root: document.getElementById('imgOverlay'),
  close: document.getElementById('ovClose'),
  closeTop: document.getElementById('ovCloseTop'),
  img: document.getElementById('ovImg'),
  title: document.getElementById('ovTitle'),
  form: document.getElementById('ovForm')
};
let _overlayKbTrackingOn = false;

function updateOverlayKeyboardState(){
  if (!ov.root) return;
  const vv = window.visualViewport;
  const baseH = window.innerHeight || document.documentElement.clientHeight || 0;
  const vvH = vv && typeof vv.height === 'number' ? vv.height : baseH;
  const vvTop = vv && typeof vv.offsetTop === 'number' ? vv.offsetTop : 0;
  const keyboardPx = Math.max(0, Math.round(baseH - vvH - vvTop));
  const kbOpen = keyboardPx > 120;

  ov.root.classList.toggle('kb-open', kbOpen);
}

function _bindOverlayKeyboardTracking(on){
  const vv = window.visualViewport;
  if (!vv) return;
  if (on){
    if (_overlayKbTrackingOn) return;
    _overlayKbTrackingOn = true;
    vv.addEventListener('resize', updateOverlayKeyboardState, { passive:true });
    vv.addEventListener('scroll', updateOverlayKeyboardState, { passive:true });
    return;
  }
  if (!_overlayKbTrackingOn) return;
  _overlayKbTrackingOn = false;
  vv.removeEventListener('resize', updateOverlayKeyboardState);
  vv.removeEventListener('scroll', updateOverlayKeyboardState);
}

// ---- Pinch-zoom dentro del área superior (no ocupa más espacio) ----
const zoom = {
  active: false,
  pointers: new Map(),
  startDist: 0,
  startScale: 1,
  scale: 1,
  x: 0,
  y: 0,
  startX: 0,
  startY: 0
};

function _clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function resetOverlayZoom(){
  zoom.pointers.clear();
  zoom.startDist = 0;
  zoom.startScale = 1;
  zoom.scale = 1;
  zoom.x = 0;
  zoom.y = 0;
  zoom.startX = 0;
  zoom.startY = 0;
  if (ov.img) ov.img.style.transform = 'translate3d(0px,0px,0px) scale(1)';
}

function applyOverlayZoom(){
  if (!ov.img) return;
  // límites de pan: aproximación por escala y tamaño del contenedor
  const wrap = ov.img.closest('.imgwrap');
  if (!wrap) return;
  const r = wrap.getBoundingClientRect();
  const maxX = (r.width * (zoom.scale - 1)) / 2;
  const maxY = (r.height * (zoom.scale - 1)) / 2;
  zoom.x = _clamp(zoom.x, -maxX, maxX);
  zoom.y = _clamp(zoom.y, -maxY, maxY);

  ov.img.style.transform = `translate3d(${zoom.x}px,${zoom.y}px,0) scale(${zoom.scale})`;
}

function setupOverlayZoom(){
  if (!ov.img || ov.img.__zoomBound) return;
  ov.img.__zoomBound = true;

  ov.img.addEventListener('pointerdown', (e) => {
    // capturar dentro del área de imagen
    ov.img.setPointerCapture?.(e.pointerId);
    zoom.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    if (zoom.pointers.size === 1){
      zoom.startX = zoom.x;
      zoom.startY = zoom.y;
    }
    if (zoom.pointers.size === 2){
      const pts = [...zoom.pointers.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      zoom.startDist = Math.hypot(dx, dy);
      zoom.startScale = zoom.scale;
    }
  }, {passive:false});

  ov.img.addEventListener('pointermove', (e) => {
    if (!zoom.pointers.has(e.pointerId)) return;
    zoom.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    if (zoom.pointers.size === 2){
      const pts = [...zoom.pointers.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy) || 1;
      let next = zoom.startScale * (dist / (zoom.startDist || 1));
      next = _clamp(next, 1, 4);
      zoom.scale = next;
      // si vuelve a 1, resetea pan
      if (zoom.scale === 1){ zoom.x = 0; zoom.y = 0; }
      applyOverlayZoom();
      e.preventDefault();
      return;
    }

    if (zoom.pointers.size === 1 && zoom.scale > 1){
      // pan con un dedo cuando hay zoom
      const p = zoom.pointers.get(e.pointerId);
      // usamos movement aproximado respecto al punto anterior guardado en start
      // (actualizamos start a cada move para suavidad)
      const prev = (ov.img.__lastPan || {x:p.x, y:p.y});
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      zoom.x += dx;
      zoom.y += dy;
      ov.img.__lastPan = {x:p.x, y:p.y};
      applyOverlayZoom();
      e.preventDefault();
    }
  }, {passive:false});

  function endPtr(e){
    if (zoom.pointers.has(e.pointerId)) zoom.pointers.delete(e.pointerId);
    if (zoom.pointers.size < 2){
      zoom.startDist = 0;
      zoom.startScale = zoom.scale;
    }
    if (zoom.pointers.size === 0){
      ov.img.__lastPan = null;
    }
  }

  ov.img.addEventListener('pointerup', endPtr);
  ov.img.addEventListener('pointercancel', endPtr);
  ov.img.addEventListener('pointerout', endPtr);
  ov.img.addEventListener('pointerleave', endPtr);
}

function openFiliacionOverlay(i){
  const p = (state.lastJson && Array.isArray(state.lastJson.filiaciones)) ? state.lastJson.filiaciones[i] : null;
  const img64 = getImgBase64ByFi(i) || "";

  ov.title.textContent = `Filiación ${i+1}`;
  ov.img.src = img64 || "";
  ov.img.style.display = img64 ? "block" : "none";
  resetOverlayZoom();
  setupOverlayZoom();

  const schema = [
    "Condición",
    "Nombre","Apellidos","Tipo de documento","Nº Documento","Sexo",
    "Nacionalidad","Fecha de nacimiento","Lugar de nacimiento",
    "Nombre de los Padres","Domicilio","Teléfono"
  ];

  ov.form.innerHTML = `
    <div class="fili-grid">
      ${schema.map(k => {
        const v = (p && typeof p === 'object' && typeof p[k] === 'string') ? p[k] : '';
        const id = `ov_${i}_${k.replaceAll(' ','_').replaceAll('º','o').replaceAll('/','_')}`;
        return `
          <div>
            <label for="${escapeHtml(id)}">${escapeHtml(k)}</label>
            ${k === "Condición" ? `
              <select id="${escapeHtml(id)}" data-ov-fi="${i}" data-ov-k="Condición">
                <option value=""></option>
                <option value="Perjudicado">Perjudicado</option>
                <option value="Testigo">Testigo</option>
                <option value="Víctima">Víctima</option>
                <option value="Requirente">Requirente</option>
                <option value="Denunciado">Denunciado</option>
                <option value="Identificado">Identificado</option>
                <option value="Infractor">Infractor</option>
              </select>
            ` : `
              <input id="${escapeHtml(id)}" data-ov-fi="${i}" data-ov-k="${escapeHtml(k)}" value="${escapeHtml(v)}" />
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;

  ov.form.querySelectorAll('input[data-ov-fi][data-ov-k], select[data-ov-fi][data-ov-k]').forEach(inp => {
    const ev = (inp.tagName === 'SELECT') ? 'change' : 'input';
    inp.addEventListener(ev, () => {
      const fi = Number(inp.getAttribute('data-ov-fi'));
      const k = inp.getAttribute('data-ov-k');
      if (!state.lastJson) state.lastJson = {};
      if (!Array.isArray(state.lastJson.filiaciones)) state.lastJson.filiaciones = [];
      if (!state.lastJson.filiaciones[fi] || typeof state.lastJson.filiaciones[fi] !== 'object') state.lastJson.filiaciones[fi] = {};
      state.lastJson.filiaciones[fi][k] = inp.value;

      // refleja también en los inputs/selects del panel inferior (si existen)
      const sel = `[data-fi="${fi}"][data-k="${CSS.escape(k)}"]`;
      const twin = document.querySelector(sel);
      if (twin && twin !== inp) twin.value = inp.value;
    });
  });

  // Sincroniza el valor del select Condición tras render del overlay
  ov.form.querySelectorAll('select[data-ov-fi][data-ov-k="Condición"]').forEach(sel => {
    const fi = Number(sel.getAttribute('data-ov-fi'));
    const cur = (state.lastJson?.filiaciones?.[fi] && typeof state.lastJson.filiaciones[fi] === 'object')
      ? (state.lastJson.filiaciones[fi]["Condición"] || "")
      : "";
    sel.value = String(cur || "");
  });

  // Persistencia de Condición (front-end) aunque vuelva del backend
  ov.form.querySelectorAll('input[data-ov-fi][data-ov-k], select[data-ov-fi][data-ov-k]').forEach(inp => {
    inp.addEventListener((inp.tagName === 'SELECT') ? 'change' : 'input', () => {
      const fi = Number(inp.getAttribute('data-ov-fi'));
      const k = inp.getAttribute('data-ov-k');
      if (k === "Condición"){
        try{ _ensureOverride(fi).condicion = inp.value; }catch(e){}
      }
    });
  });

  lockBodyScroll();
  _bindOverlayKeyboardTracking(true);
  ov.root.classList.add('on');
  ov.root.setAttribute('aria-hidden','false');
  updateOverlayKeyboardState();
}

function closeFiliacionOverlay(){
  resetOverlayZoom();
  unlockBodyScroll();
  _bindOverlayKeyboardTracking(false);
  ov.root.classList.remove('kb-open');
  ov.root.classList.remove('on');
  ov.root.setAttribute('aria-hidden','true');
  ov.img.src = '';
  ov.img.style.display = 'block';
  ov.form.innerHTML = '';
}
function openThumbOverlay(i){
  const img64 = getImgBase64ByFi(i) || "";
  const o = _ensureOverride(i);

  ov.title.textContent = `Imagen ${i+1}`;
  ov.img.src = img64 || "";
  ov.img.style.display = img64 ? "block" : "none";
  resetOverlayZoom();
  setupOverlayZoom();

  ov.form.innerHTML = `
  <div class="fili-grid" style="grid-template-columns:1fr;gap:10px">
    <div>
      <label for="thumb_cond_${i}">Condición</label>
      <select id="thumb_cond_${i}">
        <option value=""></option>
        <option value="Perjudicado">Perjudicado</option>
        <option value="Testigo">Testigo</option>
        <option value="Víctima">Víctima</option>
        <option value="Requirente">Requirente</option>
        <option value="Denunciado">Denunciado</option>
        <option value="Identificado">Identificado</option>
        <option value="Infractor">Infractor</option>
      </select>
    </div>
    <div>
      <label for="thumb_dom_${i}">Domicilio</label>
      <input id="thumb_dom_${i}" value="${escapeHtml(o.domicilio || '')}" />
    </div>
    <div>
      <label for="thumb_tel_${i}">Teléfono</label>
      <input id="thumb_tel_${i}" type="tel" inputmode="numeric" pattern="[0-9]*" value="${escapeHtml(o.telefono || '')}" />
    </div>
  </div>
`;

  const domInp = document.getElementById(`thumb_dom_${i}`);
  const telInp = document.getElementById(`thumb_tel_${i}`);
  const condSel = document.getElementById(`thumb_cond_${i}`);

  // Inicializa Condición: prioriza override (front-end persistente)
  const curCond = (o && String(o.condicion || '').trim())
    ? o.condicion
    : ((state.lastJson?.filiaciones?.[i] && typeof state.lastJson.filiaciones[i] === 'object')
        ? (state.lastJson.filiaciones[i]["Condición"] || "")
        : "");
  if (condSel) condSel.value = String(curCond || "");

  const sync = () => {
    const o2 = _ensureOverride(i);
    o2.domicilio = domInp ? domInp.value : (o2.domicilio || "");
    o2.telefono  = telInp ? telInp.value : (o2.telefono || "");

    // Condición: dato FRONT-END. Se mantiene aunque vuelva del backend.
    if (condSel){
      try{ _ensureOverride(i).condicion = condSel.value; }catch(e){}

      if (!state.lastJson) state.lastJson = {};
      if (!Array.isArray(state.lastJson.filiaciones)) state.lastJson.filiaciones = [];
      if (!state.lastJson.filiaciones[i] || typeof state.lastJson.filiaciones[i] !== 'object') state.lastJson.filiaciones[i] = {};
      state.lastJson.filiaciones[i]["Condición"] = condSel.value;

      // Si ya existe el panel inferior, sincroniza su select también
      const twin = document.querySelector(`select[data-fi="${i}"][data-k="Condición"]`);
      if (twin) twin.value = condSel.value;
    }

    // Si ya tenemos resultado de IA, aplicamos al JSON de trabajo y refrescamos UI
    if (state.lastJson && state.aiJson){
      try{
        applyThumbOverrides();
        renderFiliaciones(state.lastJson);
      }catch(e){}
    }
  };

  domInp?.addEventListener('input', sync);
  telInp?.addEventListener('input', sync);
  condSel?.addEventListener('change', sync);

  lockBodyScroll();
  _bindOverlayKeyboardTracking(true);
  ov.root.classList.add('on');
  ov.root.setAttribute('aria-hidden','false');
  updateOverlayKeyboardState();
}

if (ov.close){
  ov.close.addEventListener('click', closeFiliacionOverlay);
}
if (ov.closeTop){
  ov.closeTop.addEventListener('click', closeFiliacionOverlay);
}
if (ov.root){
  ov.root.addEventListener('click', (e)=>{
    if (e.target === ov.root) closeFiliacionOverlay();
  });
}


/* ========= Preprocesado “modo noche” (solo imagen, no OCR) =========
   Si hay baja luz/contraste, aumentamos contraste y levantamos sombras.
   - NO recorta: trabaja sobre la imagen ya reescalada a MAX.
   - Se activa por Auto (si detecta baja luz) o por Forzar.
*/
function analyzeImageLuma(imgData){
  const d = imgData.data;
  let min=255, max=0, sum=0;
  // muestreo 1/2 para ir rápido
  for(let i=0; i<d.length; i+=8){
    const y = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) | 0;
    if (y<min) min=y;
    if (y>max) max=y;
    sum += y;
  }
  const n = Math.max(1, (d.length/8));
  const mean = sum / n;
  const contrast = max - min;
  return {min, max, mean, contrast};
}

function applyNightEnhance(ctx, w, h){
  const img = ctx.getImageData(0,0,w,h);
  const d = img.data;

  let min=255, max=0, sum=0;
  for(let i=0; i<d.length; i+=4){
    const y = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) | 0;
    if (y<min) min=y;
    if (y>max) max=y;
    sum += y;
  }
  const n = d.length/4;
  const mean = sum / Math.max(1,n);
  const contrast = max - min;

  const denom = Math.max(10, (max - min));
  const gamma = mean < 90 ? 0.72 : (mean < 115 ? 0.82 : 0.92);
  const invGamma = 1 / gamma;

  // contraste + gamma SUAVE manteniendo color (sin blanco/negro duro)
  for(let i=0; i<d.length; i+=4){
    let r = d[i];
    let g = d[i+1];
    let b = d[i+2];

    // normalizar por canal
    let rn = (r - min) / denom;
    let gn = (g - min) / denom;
    let bn = (b - min) / denom;

    if (rn < 0) rn = 0; if (rn > 1) rn = 1;
    if (gn < 0) gn = 0; if (gn > 1) gn = 1;
    if (bn < 0) bn = 0; if (bn > 1) bn = 1;

    // aplicar gamma suave
    r = Math.pow(rn, invGamma) * 255;
    g = Math.pow(gn, invGamma) * 255;
    b = Math.pow(bn, invGamma) * 255;

    d[i]   = r|0;
    d[i+1] = g|0;
    d[i+2] = b|0;
  }

  ctx.putImageData(img, 0, 0);
  return {mean, contrast};
}

function maybeEnhanceCanvas(ctx, w, h){
  // Automático: se activa solo si detecta baja luz o bajo contraste.
  const img = ctx.getImageData(0,0,w,h);
  const s = analyzeImageLuma(img);
  const lowLight = (s.mean < 105);
  const lowContrast = (s.contrast < 55);
  const should = (lowLight || lowContrast);

  if (!should) return {enhanced:false, ...s};
  const after = applyNightEnhance(ctx, w, h);
  return {enhanced:true, ...s, after};
}



/* ===== iOS viewport fix (fullscreen cámara estable al girar) ===== */
(function(){
  const setVVH = ()=>{
    const h = (window.visualViewport && window.visualViewport.height)
      ? window.visualViewport.height
      : window.innerHeight;
    document.documentElement.style.setProperty('--vvh', (h/100)+'px');
  };
  setVVH();
  window.addEventListener('resize', setVVH, {passive:true});
  window.addEventListener('orientationchange', ()=>setTimeout(setVVH,50), {passive:true});
  if (window.visualViewport){
    window.visualViewport.addEventListener('resize', setVVH, {passive:true});
  }
})();

/* ========= Fotos ========= */
el.f.onchange = async (e) => {
  const files = [...(e.target.files || [])];
  if (!files.length) return;

  setStatus("Procesando imágenes…");
  if (el.btnEnviar) el.btnEnviar.disabled = true;

  try{
    let okCount = 0;
    let skipCount = 0;

    for (let i = 0; i < files.length; i++){
      const file = files[i];
      setStatus(`Procesando ${i+1}/${files.length}: ${file.name}`);

      try{
        const out = await fileToResizedBase64(file);

        // AUTO: 1 foto => 1 filiación, pero sin depender de que el índice coincida (hay filiaciones manuales).
        if (!state.lastJson || typeof state.lastJson !== 'object') state.lastJson = {};
        if (!Array.isArray(state.lastJson.filiaciones)) state.lastJson.filiaciones = [];

        const fi = state.lastJson.filiaciones.length; // la nueva filiación será este índice

        // Imagen vinculada explícitamente a esa filiación
state.images.push({ fi, name: `Filiación ${fi+1}`, ...out, captured: false });

        // Crea la filiación vacía asociada a la imagen
        state.lastJson.filiaciones.push({
          "Condición":"",
          "Nombre":"","Apellidos":"","Tipo de documento":"","Nº Documento":"","Sexo":"",
          "Nacionalidad":"","Fecha de nacimiento":"","Lugar de nacimiento":"",
          "Nombre de los Padres":"","Domicilio":"","Teléfono":""
        });
        okCount++;
      }catch(errOne){
        console.error('Fallo imagen:', file?.name, errOne);
        skipCount++;
        // seguimos con el resto
      }
    }

    renderThumbs();
    renderFiliaciones(state.lastJson);
    if (okCount === 0){
      setStatus(`No se pudo procesar ninguna imagen. (Saltadas: ${skipCount})`, 'err');
    } else if (skipCount > 0){
      setStatus(`Imágenes listas: ${okCount} · Saltadas: ${skipCount}`, 'muted');
    } else {
      setStatus(`Imágenes listas: ${okCount}`, 'ok');
    }
  }catch(err){
    console.error(err);
    setStatus("Error procesando imágenes.", "err");
  }finally{
    if (el.btnEnviar) el.btnEnviar.disabled = false;
    el.f.value = "";
    updateMainContentVisibility();
  }
};

/* ========= Enviar (NO SE CORTA) ========= */
function _apiCandidates(kind){
  const arr = (kind === 'result')
    ? (window.API_RESULT_CANDIDATES || [API_RESULT])
    : (window.API_PROCESS_CANDIDATES || [API_PROCESS]);
  return Array.from(new Set((arr || []).filter(Boolean)));
}

async function _fetchWithCandidates(urls, init){
  let lastErr = null;
  for (const u of (urls || [])){
    try{
      const r = await fetch(u, init);
      return { r, url: u };
    }catch(e){
      lastErr = e;
    }
  }
  throw (lastErr || new Error('network_error'));
}

async function startJob(payload){
  const ctrl = new AbortController();
  state.abort = ctrl;

  // 1) Intento cifrado (si hay clave). Si el server aún no lo soporta, reintenta en claro.
  let bodyObj = payload;
  let triedEnc = false;

  try{
    bodyObj = await maybeEncryptPayload(payload);
    triedEnc = (bodyObj !== payload);
  }catch(e){
    bodyObj = payload;
    triedEnc = false;
  }

  const processUrls = _apiCandidates('process');
  let first = await _fetchWithCandidates(processUrls, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
    signal: ctrl.signal
  });
  let r = first.r;

  let text = await r.text();

  // Reintento en claro si el server rechaza el envelope cifrado
  if (triedEnc && (r.status === 400 || r.status === 415 || r.status === 422)){
    const second = await _fetchWithCandidates(processUrls, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    r = second.r;
    text = await r.text();
  }

  // Si viene cifrado, descifra aquí
  const maybe = await maybeParseAndDecrypt(text);
  if (maybe) {
    // "maybe" es el objeto real ya descifrado
    if (r.status === 200){
      return { mode:"sync", out: maybe };
    }
    if (r.status === 202 || r.status === 201){
      if (!maybe.job_id) throw new Error("No llegó job_id del backend.");
      return { mode:"async", job_id: maybe.job_id };
    }
    throw new Error(`HTTP ${r.status}: ${JSON.stringify(maybe).slice(0,200)}`);
  }

  // Si el backend aún es sync, aquí vendrá el JSON final con 200.
  if (r.status === 200){
    try { return { mode:"sync", out: JSON.parse(text) }; }
    catch { return { mode:"sync", out: { raw:text } }; }
  }

  // Async: esperamos {job_id} con 202 (o 200 si tu backend lo hace así)
  if (r.status === 202 || r.status === 201){
    let j;
    try { j = JSON.parse(text); } catch { j = {}; }
    if (!j.job_id) throw new Error("No llegó job_id del backend.");
    return { mode:"async", job_id: j.job_id };
  }

  // Otros errores
  throw new Error(`HTTP ${r.status}: ${text.slice(0,200)}`);
}

async function pollResult(job_id){
  // Poll inteligente: respeta retry_after_ms del servidor y evita spam (menos 502 y menos latencia percibida)
  let delay = 1200;
  let polls = 0;

  while(true){
    if (!state.polling) throw new Error("cancelled");
    await sleep(delay);

    const resultUrls = _apiCandidates('result')
      .map(base => `${base}?job_id=${encodeURIComponent(job_id)}`);

    let rr, t;
    try{
      const got = await _fetchWithCandidates(resultUrls, { credentials:"include" });
      rr = got.r;
      t = await rr.text();
    }catch(e){
      // fallo puntual de red o Cloudflare → backoff suave
      polls++;
      delay = Math.min(3500, delay + 300);
      continue;
    }

    // Si Cloudflare responde 502/520/522 mientras el job sigue vivo → NO tratar como error duro
    if (!rr.ok){
      polls++;
      delay = Math.min(3500, delay + 250);
      continue;
    }

    let j;
    try { j = JSON.parse(t); } catch { j = { status:"error", error:"Respuesta no JSON" }; }

    try{
      j = await maybeDecryptObject(j);
    }catch(e){}

    // 🔵 NUEVO: el server puede indicar cuánto esperar
    if (j && typeof j.retry_after_ms === "number"){
      delay = Math.max(700, Math.min(4000, j.retry_after_ms));
    }

    if (j.status === "running"){
      polls++;
      // backoff progresivo si el server no manda retry_after_ms
      if (!j.retry_after_ms){
        if (polls >= 6) delay = 1500;
        if (polls >= 16) delay = 2000;
        if (polls >= 36) delay = 3000;
      }
      continue;
    }

    if (j.status === "done"){
      let out = (j.out ?? j);
      try{ out = await maybeDecryptObject(out); }catch(e){}
      return out;
    }

    if (j.status === "error"){
      throw new Error(j.error || "error");
    }

    // Compatibilidad con respuestas directas
    if (rr.ok && j && typeof j === "object" && (j.filiaciones || j.filiaciones_incorporadas || j.filiacion || j.doc)){
      return j;
    }

    throw new Error(`Respuesta inesperada: ${t.slice(0,200)}`);
  }
}
