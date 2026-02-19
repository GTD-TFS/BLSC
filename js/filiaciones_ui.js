/* /js/filiaciones_ui.js
   Requiere cargados ANTES:
   - /paises.js        -> window.PAISES

   Objetivo (alineado con Fil.html):
   - Sexo: opciones MASCULINO / FEMENINO (select si existe; datalist si es <input>)
   - Nacionalidad: datalist de países (usa el mismo /paises.js)
   - Tipo de documento: opciones DNI / NIE / PASAPORTE (datalist si es <input>)
   - Extensible para futuros selects/datalists.
*/

(() => {
  "use strict";

  const UI = {
    cfg: {
      countrySpain: "ESPAÑA",

      dlCountriesId: "dl_compa_paises",

      dlSexoId: "dl_compa_sexo",
      dlTipoDocId: "dl_compa_tipodoc",
      dlCondicionId: "dl_compa_condicion",

      // Opciones para selects de Sexo y Tipo de documento
      sexoOptions: ["", "MASCULINO", "FEMENINO"],
      tipoDocOptions: [
        "",
        "DNI",
        "NIE",
        "PASAPORTE",
        "INDOCUMENTADO",
        "CARTA NACIONAL DE IDENTIDAD",
        "OTRO DOCUMENTO DE IDENTIDAD",
      ],
      domicilioPanelClass: "domicilio-panel-compa",
    },
    booted: false,
  };

  /* ---------------- Utilities ---------------- */
  const normUp = (s) => String(s ?? "").trim().toUpperCase();
  const normTrim = (s) => String(s ?? "").trim();
  const splitCsv = (s) => String(s ?? "").split(",").map(x => x.trim()).filter(Boolean);
  const getCountryToken = (s) => normUp(splitCsv(s)[0] || "");
  const escapeHtml = (s) => String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const on = (el, ev, fn, opts) => { if (el) el.addEventListener(ev, fn, opts || false); };
  const dispatchInput = (el) => {
    try {
      if (!el) return;
      // evita bucles (input/change -> handler -> dispatchInput -> ...)
      if (el.__compaDispatchingInput) return;
      el.__compaDispatchingInput = true;
      // microtask para no reentrar en el mismo stack
      queueMicrotask(() => {
        try {
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.dispatchEvent(new Event("keyup", { bubbles: true }));
        }
        catch {}
        finally { el.__compaDispatchingInput = false; }
      });
    } catch {}
  };

  function hasGlobals() {
    const okPaises = (Array.isArray(window.PAISES) || (window.PAISES && typeof window.PAISES === "object"));
    // Provincias/municipios pueden no estar cargados en algunos módulos; se usan solo si existen.
    return okPaises;
  }

// Helpers tolerantes: aceptan arrays u objetos (según cómo exporten paises.js/provincias_es.js)
function _getCountriesFlat(){
  const P = window.PAISES;
  const out = [];
  if (Array.isArray(P)) return P.map(normUp).filter(Boolean);
  if (P && typeof P === "object"){
    const featured = Array.isArray(P.featured) ? P.featured : [];
    const groups = Array.isArray(P.groups) ? P.groups : [];
    featured.forEach(x => out.push(normUp(x)));
    groups.forEach(g => (Array.isArray(g?.items) ? g.items : []).forEach(it => out.push(normUp(it))));
  }
  return out.filter(Boolean);
}

function _getProvinciasES(){
  const P = window.PROVINCIAS_ES;
  if (Array.isArray(P)) return P.map(normTrim).filter(Boolean);
  return [];
}

function _getMunicipiosMap(){
  const M0 = (window.MUNICIPIOS_ES && typeof window.MUNICIPIOS_ES === "object") ? window.MUNICIPIOS_ES
           : (window.MUNICIPIOS && typeof window.MUNICIPIOS === "object") ? window.MUNICIPIOS
           : null;
  return M0 && typeof M0 === "object" ? M0 : {};
}

function _fillProvinciasSelect(sel){
  if (!sel) return;
  const arr = _getProvinciasES();
  sel.innerHTML = `<option value=""></option>` + arr.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
}

function _fillMunicipiosSelect(prov, sel){
  if (!sel) return;
  const M = _getMunicipiosMap();
  const arr = Array.isArray(M?.[prov]) ? M[prov] : [];
  sel.innerHTML = `<option value=""></option>` + arr.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
}
function _ensurePickerPanel(anchorInput, kind){
  // kind: "nacimiento" | "domicilio"
  if (!anchorInput || anchorInput.dataset.compaPickerBuilt === "1") return null;

  // No rompemos layout: metemos un panel justo después del input.
  const panel = document.createElement("div");
  panel.className = UI.cfg.domicilioPanelClass;
  panel.style.marginTop = "8px";
  panel.style.padding = "10px";
  panel.style.border = "1px dashed rgba(160,160,160,.45)";
  panel.style.borderRadius = "10px";
  panel.style.background = "rgba(255,255,255,.03)";

  const row1 = document.createElement("div");
  row1.style.display = "grid";
  row1.style.gridTemplateColumns = "1fr";
  row1.style.gap = "8px";

  const labPais = document.createElement("div");
  labPais.textContent = (kind === "nacimiento") ? "País (nacimiento)" : "País (domicilio)";
  labPais.style.fontSize = "12px";
  labPais.style.fontWeight = "700";
  labPais.style.opacity = ".8";

  const inpPais = document.createElement("input");
  inpPais.type = "text";
  inpPais.placeholder = "ESPAÑA / FRANCIA / …";
  inpPais.autocomplete = "off";
  inpPais.spellcheck = false;
  // Asegura que el datalist exista y esté rellenado antes de enlazarlo (Safari/iOS es quisquilloso)
  try{ ensureDatalist(UI.cfg.dlCountriesId); fillCountriesDatalist(); }catch(_){ }
  attachDatalistToInput(inpPais, UI.cfg.dlCountriesId, "compaDlCountries2");
  strictCountry(inpPais);

  row1.appendChild(labPais);
  row1.appendChild(inpPais);

  const esBox = document.createElement("div");
  esBox.style.display = "none";
  esBox.style.gap = "8px";
  esBox.style.marginTop = "8px";
  esBox.style.gridTemplateColumns = "1fr 1fr";
  esBox.style.alignItems = "center";
  esBox.style.width = "100%";
  esBox.style.maxWidth = "100%";
  esBox.style.boxSizing = "border-box";

  const provWrap = document.createElement("div");
  const labProv = document.createElement("div");
  labProv.textContent = "Provincia";
  labProv.style.fontSize = "12px";
  labProv.style.fontWeight = "700";
  labProv.style.opacity = ".8";
  const selProv = document.createElement("select");

  const munWrap = document.createElement("div");
  const labMun = document.createElement("div");
  labMun.textContent = "Municipio";
  labMun.style.fontSize = "12px";
  labMun.style.fontWeight = "700";
  labMun.style.opacity = ".8";
  const selMun = document.createElement("select");

  provWrap.appendChild(labProv);
  provWrap.appendChild(selProv);
  munWrap.appendChild(labMun);
  munWrap.appendChild(selMun);
  esBox.appendChild(provWrap);
  esBox.appendChild(munWrap);

  let dirWrap = null;
  let inpDir = null;
  if (kind === "domicilio"){
    dirWrap = document.createElement("div");
    dirWrap.style.marginTop = "8px";
    const labDir = document.createElement("div");
    labDir.textContent = "Dirección";
    labDir.style.fontSize = "12px";
    labDir.style.fontWeight = "700";
    labDir.style.opacity = ".8";
    inpDir = document.createElement("input");
    inpDir.type = "text";
    inpDir.placeholder = "Calle, nº, piso…";
    dirWrap.appendChild(labDir);
    dirWrap.appendChild(inpDir);
  }

  panel.appendChild(row1);
  panel.appendChild(esBox);
  if (dirWrap) panel.appendChild(dirWrap);

  // Inserta panel y marca.
  anchorInput.insertAdjacentElement("afterend", panel);
  anchorInput.dataset.compaPickerBuilt = "1";
  // Wrapper inline para que INPUT + botón queden en la misma fila (el input es width:100% por CSS)
  const wrapLine = document.createElement("div");
  wrapLine.style.display = "flex";
  wrapLine.style.alignItems = "center";
  wrapLine.style.gap = "6px";
  wrapLine.style.width = "100%";
  wrapLine.style.maxWidth = "100%";
  // Inserta el wrapper en el sitio del input y mete el input dentro
  anchorInput.insertAdjacentElement("beforebegin", wrapLine);
  wrapLine.appendChild(anchorInput);
  // En flex, el CSS global pone inputs/buttons a width:100%; forzamos proporciones aquí
  anchorInput.style.flex = "1 1 auto";
  anchorInput.style.minWidth = "0";
  // Evita que el input se “encoj(a)” raro en algunos móviles
  anchorInput.style.width = "100%";
  // El campo final NO es editable: se autocompone desde el panel.
  anchorInput.readOnly = true;
  anchorInput.setAttribute("aria-readonly", "true");
  anchorInput.style.background = "rgba(160,170,180,.16)"; // grisáceo
  anchorInput.style.borderColor = "rgba(160,170,180,.35)";
  anchorInput.style.color = "rgba(255,255,255,.88)";
  anchorInput.style.cursor = "default";
  anchorInput.title = "Se completa automáticamente";

  // Botón para mostrar/ocultar el panel (para no enseñar tanto de golpe)
  const btnToggle = document.createElement("button");
  btnToggle.type = "button";
  btnToggle.textContent = "⌁";
  btnToggle.title = "Editar";
  btnToggle.style.marginTop = "0";
  btnToggle.style.marginLeft = "6px";
  btnToggle.style.padding = "4px 8px";
  btnToggle.style.fontSize = "12px";
  btnToggle.style.lineHeight = "1";
  btnToggle.style.borderRadius = "8px";
  btnToggle.style.border = "1px solid rgba(255,255,255,.18)";
  btnToggle.style.background = "rgba(255,255,255,.06)";
  btnToggle.style.color = "rgba(255,255,255,.86)";
  btnToggle.style.cursor = "pointer";
  btnToggle.style.verticalAlign = "middle";
  // Anula el CSS mobile que fuerza button{width:100%}
  btnToggle.style.width = "auto";
  btnToggle.style.minWidth = "0";
  btnToggle.style.flex = "0 0 auto";
  btnToggle.style.display = "inline-flex";
  btnToggle.style.alignItems = "center";
  btnToggle.style.justifyContent = "center";
  btnToggle.setAttribute("aria-expanded", "false");

  // Por defecto, el panel va oculto.
  panel.style.display = "none";

  // Inserta el botón al lado derecho del input final
  wrapLine.appendChild(btnToggle);

  const setOpen = (open) => {
    panel.style.display = open ? "block" : "none";
    btnToggle.textContent = open ? "▴" : "⌁";
    btnToggle.setAttribute("aria-expanded", open ? "true" : "false");
  };

  on(btnToggle, "click", () => {
    const open = panel.style.display !== "none";
    setOpen(!open);
  });

  // Estado en dataset del input original (para persistir y no depender de inputs auxiliares)
  const ds = anchorInput.dataset;
  ds.compaPais = ds.compaPais || "";
  ds.compaProv = ds.compaProv || "";
  ds.compaMun  = ds.compaMun  || "";
  if (kind === "domicilio") ds.compaDir = ds.compaDir || "";

  // Inicializa estado mínimo: si el campo ya contiene exactamente un país válido, lo usamos como país.
  const cur = normUp(anchorInput.value);
  if (cur && __countriesSet && __countriesSet.has(cur)) ds.compaPais = cur;

  // Si el backend ya rellenó el campo final (string compuesto), lo parseamos para sembrar el panel
  // y evitar que refreshUI() lo deje vacío.
  const raw0 = normTrim(anchorInput.value);
  if (raw0) {
    const parts = raw0.split(",").map(x => normTrim(x)).filter(Boolean);

    // Asegura set países
    if (!__countriesSet) refreshStrictSets();

    if (kind === "nacimiento") {
      // Formatos esperados:
      // - "PAIS" (si no ES)
      // - "MUNICIPIO, PROVINCIA" (si ES)  (mun puede contener comas si venía raro; unimos todo menos último)
      if (parts.length === 1) {
        const p0 = normUp(parts[0]);
        if (__countriesSet.has(p0)) {
          // País puro (no ES) o ESPAÑA
          ds.compaPais = p0;
          ds.compaProv = "";
          ds.compaMun  = "";
        } else {
          // Backend puede venir con solo municipio/provincia (p.ej. "MADRID").
          // Lo tratamos como España + municipio para no dejarlo en blanco.
          ds.compaPais = UI.cfg.countrySpain;
          ds.compaProv = "";
          ds.compaMun  = parts[0] || "";
        }
      } else if (parts.length >= 2) {
        ds.compaPais = UI.cfg.countrySpain;
        ds.compaProv = parts[parts.length - 1] || "";
        ds.compaMun  = parts.slice(0, -1).join(", ") || "";
      }
    }

    if (kind === "domicilio") {
      // Formatos esperados:
      // - "DIRECCION, PAIS" (si no ES)
      // - "DIRECCION, MUNICIPIO, PROVINCIA" (si ES)
      if (parts.length >= 2) {
        const last = normUp(parts[parts.length - 1]);
        if (__countriesSet.has(last) && last !== UI.cfg.countrySpain) {
          ds.compaPais = last;
          ds.compaDir  = parts.slice(0, -1).join(", ") || "";
          ds.compaProv = "";
          ds.compaMun  = "";
        } else {
          // Asumimos España si hay 3+ partes o si no encaja como país final
          ds.compaPais = UI.cfg.countrySpain;
          if (parts.length >= 3) {
            ds.compaProv = parts[parts.length - 1] || "";
            ds.compaMun  = parts[parts.length - 2] || "";
            ds.compaDir  = parts.slice(0, -2).join(", ") || "";
          } else {
            // 2 partes: no podemos distinguir bien; tratamos como "MUNICIPIO, PROVINCIA" sin dirección
            ds.compaProv = parts[1] || "";
            ds.compaMun  = parts[0] || "";
            ds.compaDir  = ds.compaDir || "";
          }
        }
      } else if (parts.length === 1) {
        // Solo dirección
        ds.compaDir = parts[0];
      }
    }
  }

  // Domicilio: si no viene país del backend, por defecto ESPAÑA
  if (kind === "domicilio") {
    const p = normUp(ds.compaPais);
    if (!p) ds.compaPais = UI.cfg.countrySpain;
  }

  const computeNacimiento = () => {
    const pais = normUp(ds.compaPais);
    ds.compaProv = ds.compaProv || "";
    ds.compaMun  = ds.compaMun  || "";
    if (!pais){
      return "";
    }
    if (pais !== UI.cfg.countrySpain){
      return pais;
    }
    const prov = normTrim(ds.compaProv);
    const mun  = normTrim(ds.compaMun);
    if (prov && mun){
      return (prov === mun) ? `${mun}` : `${mun}, ${prov}`;
    }
    return mun || prov || UI.cfg.countrySpain;
  };

  const computeDomicilio = () => {
    const pais = normUp(ds.compaPais);
    const dir  = normTrim(ds.compaDir || "");
    if (!pais) return dir;
    if (pais !== UI.cfg.countrySpain){
      return [dir, pais].filter(Boolean).join(", ");
    }
    const prov = normTrim(ds.compaProv || "");
    const mun  = normTrim(ds.compaMun  || "");
    const parts = [];
    if (dir) parts.push(dir);
    if (mun) parts.push(mun);
    if (prov) parts.push(prov);
    return parts.join(", ");
  };

  const refreshUI = () => {
    const pais = normUp(ds.compaPais);
    inpPais.value = ds.compaPais;

    const isEs = (pais === UI.cfg.countrySpain);
    esBox.style.display = isEs ? "grid" : "none";

    if (isEs){
      _fillProvinciasSelect(selProv);
      // re-aplica selección actual si existe
      if (ds.compaProv) selProv.value = ds.compaProv;
      _fillMunicipiosSelect(selProv.value || ds.compaProv || "", selMun);
      if (ds.compaMun) selMun.value = ds.compaMun;
    } else {
      selProv.innerHTML = `<option value=""></option>`;
      selMun.innerHTML  = `<option value=""></option>`;
    }

    if (inpDir) inpDir.value = ds.compaDir || "";

    const v = (kind === "nacimiento") ? computeNacimiento() : computeDomicilio();
    anchorInput.value = v;
    dispatchInput(anchorInput);
  };

  // Eventos
  on(inpPais, "input", () => {
    ds.compaPais = normUp(inpPais.value);
    // si deja de ser ES, limpia prov/mun
    if (normUp(ds.compaPais) !== UI.cfg.countrySpain){
      ds.compaProv = "";
      ds.compaMun  = "";
    }
    refreshUI();
  });
  on(inpPais, "blur", () => {
    // normaliza al valor de lista si es válido; si no, lo dejará strictCountry
    ds.compaPais = normUp(inpPais.value);
    refreshUI();
  });

  on(selProv, "change", () => {
    ds.compaProv = selProv.value;
    ds.compaMun  = "";
    _fillMunicipiosSelect(ds.compaProv, selMun);
    refreshUI();
  });

  on(selMun, "change", () => {
    ds.compaMun = selMun.value;
    refreshUI();
  });

  if (inpDir){
    on(inpDir, "input", () => {
      ds.compaDir = inpDir.value;
      refreshUI();
    });
  }

  // Si el usuario toca cualquier control interno, abrimos automáticamente
  [inpPais, selProv, selMun, inpDir].filter(Boolean).forEach(ctrl => {
    on(ctrl, "focus", () => setOpen(true), true);
  });

  // Si está incompleto, abre el panel para que el usuario complete
  // (Solo Nacimiento: en Domicilio lo dejamos oculto por defecto)
  try{
    const paisNow = normUp(ds.compaPais);
    if (kind === "nacimiento" && paisNow === UI.cfg.countrySpain){
      if (!normTrim(ds.compaMun) || !normTrim(ds.compaProv)) setOpen(true);
    }
  }catch(_){ }

  refreshUI();

  return { panel, inpPais, selProv, selMun, inpDir };
}


/* ---------------- Validación estricta (manual) ---------------- */
let __countriesSet = null;

function refreshStrictSets(){
  try{ __countriesSet = new Set(_getCountriesFlat()); }
  catch{ __countriesSet = new Set(); }
  // Asegura ESPAÑA / ESPANA en set
  try{
    __countriesSet.add(UI.cfg.countrySpain);
    __countriesSet.add("ESPANA");
  }catch(_){ }
}

// Marca que el usuario ha tocado el campo (para NO borrar valores importados por backend)
function markUserEdited(inp, key){
  if (!inp) return;
  const k = key || "compaUserEdited";
  if (inp.dataset[k] === "1") return;
  on(inp, "input", () => { inp.dataset[k] = "1"; });
}

  function strictCountry(inp){
    if (!inp || inp.dataset.compaStrictCountry === "1") return;
    inp.dataset.compaStrictCountry = "1";
    markUserEdited(inp, "compaUserEdited");
    on(inp, "blur", () => {
      // Solo validar si el usuario lo ha editado. Si viene importado/puesto por backend, se respeta.
      if (inp.dataset.compaUserEdited !== "1") return;
      const c = getCountryToken(inp.value);
      if (!c) return;
      if (!__countriesSet) refreshStrictSets();
      if (!__countriesSet.has(c)) {
        inp.value = "";
        dispatchInput(inp);
      }
    });
  }


  /* ---------------- Datalists base ---------------- */
  function ensureDatalist(id) {
    let dl = document.getElementById(id);
    if (dl && dl.tagName === "DATALIST") return dl;
    dl = document.createElement("datalist");
    dl.id = id;
    document.body.appendChild(dl);
    return dl;
  }

function fillCountriesDatalist() {
  const dl = ensureDatalist(UI.cfg.dlCountriesId);
  if (dl.dataset.filled === "1") return;

  const out = _getCountriesFlat();

  const seen = new Set();
  const uniq = [];
  for (const x of out) {
    const k = normUp(x);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    uniq.push(k);
  }

  // Asegura que ESPAÑA siempre esté disponible (algunos listados pueden traer ESPANA o no traerla).
  if (!seen.has(UI.cfg.countrySpain)) {
    uniq.unshift(UI.cfg.countrySpain);
    seen.add(UI.cfg.countrySpain);
  }
  if (!seen.has("ESPANA")) {
    // Variante sin ñ (por si el usuario teclea sin diacríticos)
    uniq.push("ESPANA");
    seen.add("ESPANA");
  }

  dl.innerHTML = uniq.map((x) => `<option value="${escapeHtml(x)}"></option>`).join("");
  dl.dataset.filled = "1";
}


  /* ---------------- Datalists: Sexo / TipoDoc (según Fil.html) ---------------- */
  function fillSexoDatalist() {
    const dl = ensureDatalist(UI.cfg.dlSexoId);
    if (dl.dataset.filled === "1") return;
    const opts = ["MASCULINO", "FEMENINO"];
    dl.innerHTML = opts.map((x) => `<option value="${escapeHtml(x)}"></option>`).join("");
    dl.dataset.filled = "1";
  }

  function fillTipoDocDatalist() {
    const dl = ensureDatalist(UI.cfg.dlTipoDocId);
    if (dl.dataset.filled === "1") return;
    const opts = [
      "DNI",
      "NIE",
      "PASAPORTE",
      "INDOCUMENTADO",
      "CARTA NACIONAL DE IDENTIDAD",
      "OTRO DOCUMENTO DE IDENTIDAD",
    ];
    dl.innerHTML = opts.map((x) => `<option value="${escapeHtml(x)}"></option>`).join("");
    dl.dataset.filled = "1";
  }

  function fillCondicionDatalist() {
    const dl = ensureDatalist(UI.cfg.dlCondicionId);
    if (dl.dataset.filled === "1") return;
    const opts = [
      "",
      "PERJUDICADO",
      "TESTIGO",
      "VÍCTIMA",
      "REQUIRENTE",
      "DENUNCIADO",
      "IDENTIFICADO",
      "INFRACTOR",
    ];
    dl.innerHTML = opts
      .filter((x) => x !== "")
      .map((x) => `<option value="${escapeHtml(x)}"></option>`)
      .join("");
    dl.dataset.filled = "1";
  }

  function ensureCondicionSelectOptions(sel) {
    if (!sel || sel.tagName !== "SELECT" || sel.dataset.compaCondicionOptions === "1") return;
    const have = new Set(
      [...sel.querySelectorAll("option")].map((o) => normUp(o.value || o.textContent))
    );
    const want = [
      "",
      "PERJUDICADO",
      "TESTIGO",
      "VÍCTIMA",
      "REQUIRENTE",
      "DENUNCIADO",
      "IDENTIFICADO",
      "INFRACTOR",
    ];
    const missing = want.filter((x) => !have.has(normUp(x)));
    if (missing.length) {
      const cur = sel.value;
      sel.innerHTML = want
        .map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)
        .join("");
      sel.value = cur;
    }
    sel.dataset.compaCondicionOptions = "1";
  }

  /* ---------------- Attach datalist / select ---------------- */
  function attachDatalistToInput(inp, listId, flagKey) {
    if (!inp || inp.tagName !== "INPUT" || inp.dataset[flagKey] === "1") return;
    inp.setAttribute("list", listId);
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.dataset[flagKey] = "1";
  }

  // Convierte un <input> en <select> con las mismas opciones, id, data-*, etc. y wiring de eventos
  function replaceInputWithSelect(inp, options, flagKey) {
    if (!inp || inp.tagName !== "INPUT") return inp;
    if (inp.dataset && inp.dataset[flagKey] === "1") return inp;

    const sel = document.createElement("select");

    // copy id/name/class/style
    if (inp.id) sel.id = inp.id;
    if (inp.name) sel.name = inp.name;
    if (inp.className) sel.className = inp.className;
    if (inp.getAttribute("style")) sel.setAttribute("style", inp.getAttribute("style"));

    // copy relevant attributes
    for (const attr of ["data-fi", "data-k", "data-ov-fi", "data-ov-k"]) {
      const v = inp.getAttribute(attr);
      if (v != null) sel.setAttribute(attr, v);
    }

    // build options
    const want = Array.isArray(options) ? options : [];
    sel.innerHTML = want
      .map((v) => {
        const vv = String(v ?? "");
        return `<option value="${escapeHtml(vv)}">${escapeHtml(vv)}</option>`;
      })
      .join("");

    // preserve current value
    const cur = String(inp.value ?? "");
    sel.value = cur;

    // if current value isn't in the list, append it so it doesn't disappear
    if (cur && !want.map((x) => String(x ?? "")).includes(cur)) {
      const o = document.createElement("option");
      o.value = cur;
      o.textContent = cur;
      sel.appendChild(o);
      sel.value = cur;
    }

    // wire: select change -> dispatch input on itself (and bubble)
    on(sel, "change", () => {
      try { sel.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
    });

    // mark and replace
    sel.dataset[flagKey] = "1";
    inp.replaceWith(sel);
    return sel;
  }

  function ensureSexoSelectOptions(sel) {
    if (!sel || sel.tagName !== "SELECT" || sel.dataset.compaSexoOptions === "1") return;
    const have = new Set([...sel.querySelectorAll("option")].map(o => normUp(o.value || o.textContent)));
    const want = UI.cfg.sexoOptions;
    // Si ya tiene, no toques; si falta alguno, rehace de forma mínima.
    const missing = want.filter(x => !have.has(normUp(x)));
    if (missing.length) {
      // preserva la selección actual
      const cur = sel.value;
      sel.innerHTML = want.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
      sel.value = cur;
    }
    sel.dataset.compaSexoOptions = "1";
  }

  function ensureTipoDocSelectOptions(sel) {
    if (!sel || sel.tagName !== "SELECT" || sel.dataset.compaTipoDocOptions === "1") return;
    const have = new Set([...sel.querySelectorAll("option")].map(o => normUp(o.value || o.textContent)));
    const want = UI.cfg.tipoDocOptions;
    const missing = want.filter(x => !have.has(normUp(x)));
    if (missing.length) {
      const cur = sel.value;
      sel.innerHTML = want.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
      sel.value = cur;
    }
    sel.dataset.compaTipoDocOptions = "1";
  }

  function isFiliField(el) {
    return el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute("data-fi") && el.hasAttribute("data-k");
  }
  const getFiliKey = (inp) => inp?.getAttribute?.("data-k") || "";


  /* ---------------- Discovery / wiring ---------------- */
  function enhanceExistingNodes(root) {
    if (!root) root = document;

    // Filiaciones: campos por data-k
    const filiNodes = root.querySelectorAll('[data-fi][data-k]');
    for (const node of filiNodes) {
      const k = getFiliKey(node);

      // Nacionalidad -> países
      if (k === "Nacionalidad") {
        attachDatalistToInput(node, UI.cfg.dlCountriesId, "compaDlCountries");
        strictCountry(node);
      }

      // Sexo -> usar SELECT como Condición (en vez de datalist)
      if (k === "Sexo") {
        if (node.tagName === "SELECT") {
          ensureSexoSelectOptions(node);
        } else if (node.tagName === "INPUT") {
          const sel = replaceInputWithSelect(node, UI.cfg.sexoOptions, "compaSexoAsSelect");
          ensureSexoSelectOptions(sel);
        }
      }

      // Tipo de documento -> usar SELECT como Condición (en vez de datalist)
      if (k === "Tipo de documento") {
        if (node.tagName === "SELECT") {
          ensureTipoDocSelectOptions(node);
        } else if (node.tagName === "INPUT") {
          const sel = replaceInputWithSelect(node, UI.cfg.tipoDocOptions, "compaTipoDocAsSelect");
          ensureTipoDocSelectOptions(sel);
        }
      }

      // Condición -> select (si existe) o datalist si es <input>
      if (k === "Condición") {
        if (node.tagName === "SELECT") ensureCondicionSelectOptions(node);
        else attachDatalistToInput(node, UI.cfg.dlCondicionId, "compaDlCondicion");
      }

      // Lugar de nacimiento -> picker País + (si ESPAÑA) Provincia/Municipio, y el input final se autocompone
      if (k === "Lugar de nacimiento" && node.tagName === "INPUT") {
        _ensurePickerPanel(node, "nacimiento");
      }

      // Domicilio -> picker País + (si ESPAÑA) Provincia/Municipio + Dirección, y el input final se autocompone
      if (k === "Domicilio" && node.tagName === "INPUT") {
        _ensurePickerPanel(node, "domicilio");
      }

      // Teléfono -> teclado numérico
      if (k === "Teléfono" && node.tagName === "INPUT") {
        node.setAttribute("inputmode", "numeric");
        node.setAttribute("autocomplete", "tel");
        node.setAttribute("pattern", "[0-9+ ]*");
      }
    }

    // Teléfono manual de overlay de miniatura: id thumb_tel_X
    const thumbTel = root.querySelectorAll('input[id^="thumb_tel_"]');
    for (const inp of thumbTel) {
      inp.setAttribute("inputmode", "numeric");
      inp.setAttribute("autocomplete", "tel");
      inp.setAttribute("pattern", "[0-9+ ]*");
    }

    // Domicilio del overlay de miniatura: id thumb_dom_X -> mismo comportamiento que Domicilio normal
    const thumbDom = root.querySelectorAll('input[id^="thumb_dom_"]');
    for (const inp of thumbDom) {
      _ensurePickerPanel(inp, "domicilio");
    }

    const thumbCondSel = root.querySelectorAll('select[id^="thumb_cond_"]');
    for (const sel of thumbCondSel) ensureCondicionSelectOptions(sel);

    const thumbCondInp = root.querySelectorAll('input[id^="thumb_cond_"]');
    for (const inp of thumbCondInp) attachDatalistToInput(inp, UI.cfg.dlCondicionId, "compaDlCondicion");

    // Overlay de edición: mismos data-k pero con data-ov-*
    const ovNodes = root.querySelectorAll('[data-ov-fi][data-ov-k]');
    for (const node of ovNodes) {
      const k = node.getAttribute('data-ov-k') || "";

      if (k === "Nacionalidad") {
        attachDatalistToInput(node, UI.cfg.dlCountriesId, "compaDlCountries");
        strictCountry(node);
      }
      if (k === "Sexo") {
        if (node.tagName === "SELECT") ensureSexoSelectOptions(node);
        else if (node.tagName === "INPUT") {
          const sel = replaceInputWithSelect(node, UI.cfg.sexoOptions, "compaSexoAsSelect");
          ensureSexoSelectOptions(sel);
        }
      }
      if (k === "Tipo de documento") {
        if (node.tagName === "SELECT") ensureTipoDocSelectOptions(node);
        else if (node.tagName === "INPUT") {
          const sel = replaceInputWithSelect(node, UI.cfg.tipoDocOptions, "compaTipoDocAsSelect");
          ensureTipoDocSelectOptions(sel);
        }
      }
      if (k === "Condición") {
        if (node.tagName === "SELECT") ensureCondicionSelectOptions(node);
        else attachDatalistToInput(node, UI.cfg.dlCondicionId, "compaDlCondicion");
      }

      if (k === "Lugar de nacimiento" && node.tagName === "INPUT") _ensurePickerPanel(node, "nacimiento");
      if (k === "Domicilio" && node.tagName === "INPUT") _ensurePickerPanel(node, "domicilio");

      if (k === "Teléfono" && node.tagName === "INPUT") {
        node.setAttribute("inputmode", "numeric");
        node.setAttribute("autocomplete", "tel");
        node.setAttribute("pattern", "[0-9+ ]*");
      }
    }
  }

  function observeMutations() {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (!n || n.nodeType !== 1) continue;
          enhanceExistingNodes(n);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------------- Public boot ---------------- */
  function boot() {
    if (UI.booted) return;
    UI.booted = true;

    if (!hasGlobals()) {
      console.warn("[filiaciones_ui] Falta global PAISES. No se activa.");
      return;
    }

    fillCountriesDatalist();
    fillSexoDatalist();
    fillTipoDocDatalist();
    fillCondicionDatalist();

    refreshStrictSets();

    enhanceExistingNodes(document);
    observeMutations();
    console.log("[filiaciones_ui] OK");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.FILIACIONES_UI = {
    boot,
    enhance: enhanceExistingNodes,
    _internals: UI,
  };
})();
