/* Clipboard parser for filiaciones (DNI/NIE/Pasaporte)
 * Archivo aislado: no modifica el flujo existente, solo añade un botón en el overlay de edición.
 */
(function(){
  'use strict';

  function notify(msg, type){
    try{
      if (typeof setStatus === 'function') {
        setStatus(String(msg || ''), type || 'muted');
        return;
      }
    }catch{}
    try{
      if (typeof window.setStatus === 'function') {
        window.setStatus(String(msg || ''), type || 'muted');
        return;
      }
    }catch{}
    try{ alert(String(msg || '')); }catch{}
  }

  function getAppState(){
    try{
      if (typeof state !== 'undefined' && state && typeof state === 'object') return state;
    }catch{}
    try{
      if (window.state && typeof window.state === 'object') return window.state;
    }catch{}
    return null;
  }

  function normSpaces(s){
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function normKey(s){
    return String(s || '')
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function dedupeTwinPhrase(s){
    const v = normSpaces(s);
    if (!v) return v;
    const parts = v.split(' ').filter(Boolean);
    if (parts.length >= 4 && parts.length % 2 === 0){
      const half = parts.length / 2;
      const left = parts.slice(0, half).join(' ');
      const right = parts.slice(half).join(' ');
      if (normKey(left) === normKey(right)) return left;
    }
    return v;
  }

  function uniqueByNorm(values){
    const out = [];
    const seen = new Set();
    for (const raw of (values || [])){
      const v = dedupeTwinPhrase(normSpaces(raw));
      if (!v) continue;
      const key = normKey(v);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  }

  function cleanCountryLabel(v){
    const s = normSpaces(v);
    const k = normKey(s);
    if (!k) return s;
    if (/^ESPANOL(A|AS|ES)?$/.test(k)) return 'ESPAÑA';
    return s;
  }

  function findValueNearLabel(lines, labelRe, maxAhead){
    const ahead = Number.isFinite(maxAhead) ? maxAhead : 3;
    for (let i = 0; i < lines.length; i++){
      if (!labelRe.test(lines[i])) continue;
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + ahead); j++){
        const v = normSpaces(lines[j]);
        if (!v) continue;
        if (/(NOMBRE|APELLID|NACIONAL|SEXO|BIRTH|NACIMIENTO|PASSPORT|DOMICILIO|ADDRESS|REMARKS|OBSERVACIONES)/i.test(v)) continue;
        return v;
      }
    }
    return '';
  }

  function normalizePlaceBirth(v){
    const s = normSpaces(v);
    const m = s.match(/^(.+?)\s*\((.+)\)$/);
    if (m){
      const a = normSpaces(m[1]);
      const b = normSpaces(m[2]);
      if (normKey(a) === normKey(b)) return a;
    }
    return dedupeTwinPhrase(s);
  }

  function normalizeMrzLine(s){
    return String(s || '')
      .toUpperCase()
      .replace(/[«»]/g, '<')
      .replace(/[く‹›＜＞]/g, '<')
      .replace(/[|]/g, 'I')
      .replace(/[+]/g, '<')
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9<]/g, '');
  }

  function normalizeMrzDocCore(v){
    return String(v || '')
      .toUpperCase()
      .replace(/[^A-Z0-9<]/g, '')
      .replace(/<+/g, '')
      .trim();
  }

  function isKnownIso3(code){
    const c = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!/^[A-Z]{3}$/.test(c)) return false;
    try{
      if (window.PAISES_ISO3?.countryNameFromIso3?.(c)) return true;
    }catch{}
    return c === 'ESP';
  }

  function normalizeDocCandidate(v){
    return String(v || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/O/g, '0')
      .replace(/Q/g, '0')
      .replace(/I/g, '1')
      .replace(/L/g, '1');
  }

  function isLikelyDocId(v){
    const s = normalizeDocCandidate(v);
    if (!s) return false;
    if (s.length < 6 || s.length > 12) return false;
    if (!/\d/.test(s)) return false;
    return true;
  }

  function fmtYYMMDD(v){
    const m = String(v || '').match(/^(\d{2})(\d{2})(\d{2})$/);
    if (!m) return '';
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
    const nowYY = Number(String(new Date().getFullYear()).slice(-2));
    const yyyy = (yy > nowYY ? 1900 : 2000) + yy;
    return `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`;
  }

  function cleanPersonName(s){
    const v = String(s || '')
      .replace(/[<]+/g, ' ')
      .replace(/[^A-ZÁÉÍÓÚÑ' -]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!v || /\d/.test(v)) return '';
    return v;
  }

  function cleanMrzSurname(s){
    let v = String(s || '')
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[く＜«»\s]+/g, '<')
      .replace(/[^A-Z<]/g, '')
      .replace(/<+/g, '<');

    const m = v.match(/^([PIAC])K?<*([A-Z]{3})(.*)$/);
    if (m && isKnownIso3(m[2]) && /[A-Z]/.test(m[3] || '')){
      v = m[3] || '';
    }

    v = v.replace(/^<+/, '').replace(/<+/g, ' ');
    return cleanPersonName(v);
  }

  function findLineAfter(lines, re){
    for (let i = 0; i < lines.length; i++){
      if (re.test(lines[i])){
        return {
          index: i,
          current: lines[i],
          next: lines[i + 1] || '',
          next2: lines[i + 2] || ''
        };
      }
    }
    return null;
  }

  function parseMrz(lines){
    const mrz = (lines || [])
      .map(normalizeMrzLine)
      .filter(l => l.length >= 20 && l.includes('<') && /[A-Z0-9]/.test(l));

    const out = {};
    if (!mrz.length) return out;

    const joinedMrz = mrz.join('');
    let l2 = mrz.find(l => /^[A-Z0-9<]{9}[0-9<][A-Z]{3}\d{6}[0-9<][MF<]\d{6}[0-9<]/.test(l)) || '';
    if (!l2){
      for (const l of mrz){
        const hit = l.match(/\d{6}[0-9<][MF]\d{6}[0-9<][A-Z<]{3}/);
        if (hit && hit.index != null){
          // Si vienen 2 líneas MRZ pegadas en una sola, tomamos el tramo que contiene fecha/sexo/nacionalidad.
          l2 = l.slice(hit.index);
          break;
        }
      }
    }
    if (!l2) l2 = mrz.find(l => /\d{6}[0-9<][MF]\d{6}/.test(l)) || (mrz[1] || '');
    const l1 = mrz.find(l => l !== l2 && /^(I|P|A|C)/.test(l)) || (mrz[0] || '');
    const nameLine = [...mrz]
      .filter(l => l.includes('<<'))
      .sort((a, b) => {
        const sa = (a.match(/[A-Z]/g) || []).length - (a.match(/\d/g) || []).length;
        const sb = (b.match(/[A-Z]/g) || []).length - (b.match(/\d/g) || []).length;
        return sb - sa;
      })[0] || '';

    if (/^I[D<]/.test(l1)) out['Tipo de documento'] = 'DNI';
    if (/^P</.test(l1)) out['Tipo de documento'] = 'PASAPORTE';

    const line1NoFill = l1.replace(/</g, '');
    const allDocHits = [];
    const dniRe = /\d{8}[A-Z]/g;
    const nieRe = /[XYZ]\d{7}[A-Z]/g;
    let m;
    while ((m = dniRe.exec(line1NoFill)) !== null) allDocHits.push({ v: m[0], idx: m.index, kind: 'DNI' });
    while ((m = nieRe.exec(line1NoFill)) !== null) allDocHits.push({ v: m[0], idx: m.index, kind: 'NIE' });
    allDocHits.sort((a, b) => b.idx - a.idx); // prioriza el que aparece más al final de la línea 1 MRZ
    if (allDocHits.length){
      const best = allDocHits[0];
      out['Nº Documento'] = best.v;
      if (best.kind === 'NIE') out['Tipo de documento'] = 'NIE';
      if (best.kind === 'DNI' && /^I[D<]/.test(l1)) out['Tipo de documento'] = 'DNI';
    }

    if (!out['Nº Documento']){
      const passJoined = joinedMrz.match(/([A-Z0-9<]{9})([0-9<])([A-Z]{3})(\d{6})([0-9<])([MF<])(\d{6})([0-9<])/);
      if (passJoined){
        const birthOk = fmtYYMMDD(passJoined[4]);
        if (birthOk){
          const doc = normalizeMrzDocCore(passJoined[1]);
          if (doc.length >= 7 && doc.length <= 9){
            out['Nº Documento'] = doc;
            if (!out['Tipo de documento']) out['Tipo de documento'] = 'PASAPORTE';
          }
        }
      }
    }

    if (!out['Nº Documento'] && l1.length >= 14){
      const docRaw = normalizeDocCandidate(l1.slice(5, 14).replace(/</g, '').trim());
      if (isLikelyDocId(docRaw)) out['Nº Documento'] = docRaw;
    }
    if (!out['Nº Documento'] && l2.length >= 13){
      const td3 = l2.match(/^([A-Z0-9<]{9})([0-9<])([A-Z]{3})/);
      if (td3){
        const docMrz = normalizeMrzDocCore(td3[1]);
        if (docMrz.length >= 7 && docMrz.length <= 9){
          out['Nº Documento'] = docMrz;
          if (!out['Tipo de documento']) out['Tipo de documento'] = 'PASAPORTE';
        }
      }
    }
    if (!out['Nº Documento'] && l2.length >= 9){
      const doc2 = normalizeDocCandidate(l2.slice(0, 9).replace(/</g, ''));
      if (isLikelyDocId(doc2)) out['Nº Documento'] = doc2;
    }

    if (l2.length >= 18){
      const mBio = l2.match(/(\d{6})([0-9<])([MF])(\d{6})/);
      const birth = fmtYYMMDD(mBio ? mBio[1] : '');
      if (birth) out['Fecha de nacimiento'] = birth;
      const sx = mBio ? mBio[3] : '';
      if (sx === 'M') out['Sexo'] = 'MASCULINO';
      if (sx === 'F') out['Sexo'] = 'FEMENINO';
      const nat = l2.slice(15, 18);
      if (nat){
        const code = String(nat || '').toUpperCase().replace(/[^A-Z]/g, '');
        if (code.length === 3){
          const fromIso = window.PAISES_ISO3?.countryNameFromIso3?.(code);
          if (fromIso) out['Nacionalidad'] = fromIso;
          else if (code === 'ESP') out['Nacionalidad'] = 'ESPAÑA';
          else out['Nacionalidad'] = code;
        }
      }
    }

    if (out['Tipo de documento'] === 'DNI'){
      out['Nacionalidad'] = 'ESPAÑA';
    }

    if (nameLine){
      const parts = nameLine.split('<<');
      if (parts.length >= 2){
        const ap = cleanMrzSurname(parts[0]);
        const nom = cleanPersonName(parts.slice(1).join(' ').replace(/<+/g, ' '));
        if (ap) out['Apellidos'] = ap;
        if (nom) out['Nombre'] = nom;
      }
    }

    return out;
  }

  function extractMrzBioFromJoined(lines){
    const joined = (lines || []).map(normalizeMrzLine).join('');
    if (!joined) return {};

    // Patrón robusto: nacimiento(YYMMDD)+check+sexo(M/F)+caducidad(YYMMDD)+check+nacionalidad(ISO3)
    const rx = /(\d{6})([0-9<])([MF])(\d{6})([0-9<])([A-Z]{3})/g;
    let m;
    let hit = null;
    while ((m = rx.exec(joined)) !== null){
      const birth = fmtYYMMDD(m[1]);
      if (!birth) continue;
      hit = { birth, sex: m[3], iso: String(m[6] || '').toUpperCase() };
      break;
    }
    if (!hit) return {};

    const out = {};
    out['Fecha de nacimiento'] = hit.birth;
    if (hit.sex === 'M') out['Sexo'] = 'MASCULINO';
    if (hit.sex === 'F') out['Sexo'] = 'FEMENINO';

    const iso = hit.iso;
    if (iso){
      const fromIso = window.PAISES_ISO3?.countryNameFromIso3?.(iso);
      out['Nacionalidad'] = fromIso || (iso === 'ESP' ? 'ESPAÑA' : iso);
    }
    return out;
  }

  function extractPassportMrzFromJoined(lines){
    const joined = (lines || []).map(normalizeMrzLine).join('');
    if (!joined) return {};
    const out = {};
    // TD3 pasaporte: doc(9)+chk + ISO + DOB + chk + SEX + EXP + chk
    const rx = /([A-Z0-9<]{9})([0-9<])([A-Z]{3})(\d{6})([0-9<])([MF<])(\d{6})([0-9<])/g;
    let m;
    while ((m = rx.exec(joined)) !== null){
      const iso = String(m[3] || '').toUpperCase();
      const birth = fmtYYMMDD(m[4]);
      const sx = String(m[6] || '').toUpperCase();
      if (!birth) continue;
      const doc = normalizeMrzDocCore(m[1]);
      if (doc.length >= 7 && doc.length <= 9){
        out['Nº Documento'] = doc;
      }
      out['Fecha de nacimiento'] = birth;
      if (sx === 'M') out['Sexo'] = 'MASCULINO';
      if (sx === 'F') out['Sexo'] = 'FEMENINO';
      if (iso){
        const n = window.PAISES_ISO3?.countryNameFromIso3?.(iso);
        out['Nacionalidad'] = n || (iso === 'ESP' ? 'ESPAÑA' : iso);
      }
      break;
    }
    if (!out['Fecha de nacimiento'] || !out['Sexo'] || !out['Nacionalidad']){
      // Fallback más laxo para OCR degradado: ISO + DOB + chk + SEX + EXP
      const rxLoose = /([A-Z]{3})(\d{6})([0-9<])([MF<])(\d{6})/g;
      let k;
      while ((k = rxLoose.exec(joined)) !== null){
        const iso = String(k[1] || '').toUpperCase();
        const birth = fmtYYMMDD(k[2]);
        const sx = String(k[4] || '').toUpperCase();
        if (!birth) continue;
        if (!out['Fecha de nacimiento']) out['Fecha de nacimiento'] = birth;
        if (!out['Sexo']){
          if (sx === 'M') out['Sexo'] = 'MASCULINO';
          if (sx === 'F') out['Sexo'] = 'FEMENINO';
        }
        if (!out['Nacionalidad']){
          const n = window.PAISES_ISO3?.countryNameFromIso3?.(iso);
          out['Nacionalidad'] = n || (iso === 'ESP' ? 'ESPAÑA' : iso);
        }
        break;
      }
    }
    if (out['Nº Documento']) out['Tipo de documento'] = 'PASAPORTE';
    return out;
  }

  function inferDocType(out){
    const doc = String(out['Nº Documento'] || '').toUpperCase();
    if (out['Tipo de documento']) return;
    if (/^[XYZ]\d{7}[A-Z]$/.test(doc)) out['Tipo de documento'] = 'NIE';
    else if (/^\d{8}[A-Z]$/.test(doc)) out['Tipo de documento'] = 'DNI';
    else if (/^[A-Z]{3}\d{5,9}$/.test(doc)) out['Tipo de documento'] = 'PASAPORTE';
  }

  function parseClipboardText(rawText){
    const text = String(rawText || '').replace(/\r/g, '\n');
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    const up = text.toUpperCase();
    const out = {};

    Object.assign(out, parseMrz(lines));
    const bioMrz = extractMrzBioFromJoined(lines);
    const passMrz = extractPassportMrzFromJoined(lines);
    if (!out['Fecha de nacimiento'] && bioMrz['Fecha de nacimiento']) out['Fecha de nacimiento'] = bioMrz['Fecha de nacimiento'];
    if (!out['Sexo'] && bioMrz['Sexo']) out['Sexo'] = bioMrz['Sexo'];
    if (!out['Nacionalidad'] && bioMrz['Nacionalidad']) out['Nacionalidad'] = bioMrz['Nacionalidad'];
    if (!out['Fecha de nacimiento'] && passMrz['Fecha de nacimiento']) out['Fecha de nacimiento'] = passMrz['Fecha de nacimiento'];
    if (!out['Sexo'] && passMrz['Sexo']) out['Sexo'] = passMrz['Sexo'];
    if (!out['Nacionalidad'] && passMrz['Nacionalidad']) out['Nacionalidad'] = passMrz['Nacionalidad'];
    if (!out['Nº Documento'] && passMrz['Nº Documento']) out['Nº Documento'] = passMrz['Nº Documento'];
    if (!out['Tipo de documento'] && passMrz['Tipo de documento']) out['Tipo de documento'] = passMrz['Tipo de documento'];

    if (!out['Apellidos'] || !out['Nombre']){
      const mrzName = lines
        .map(normalizeMrzLine)
        .filter(l => l.includes('<<') && /[A-Z]/.test(l))
        .sort((a, b) => {
          const sa = (a.match(/[A-Z]/g) || []).length - (a.match(/\d/g) || []).length;
          const sb = (b.match(/[A-Z]/g) || []).length - (b.match(/\d/g) || []).length;
          return sb - sa;
        })[0] || '';
      if (mrzName){
        const parts = mrzName.split('<<');
        if (parts.length >= 2){
          const ap = cleanMrzSurname(parts[0]);
          const nom = cleanPersonName(parts.slice(1).join(' ').replace(/<+/g, ' '));
          if (!out['Apellidos'] && ap) out['Apellidos'] = ap;
          if (!out['Nombre'] && nom) out['Nombre'] = nom;
        }
      }
    }

    // Limpieza final obligatoria de apellidos provenientes de MRZ/OCR sucio.
    if (out['Apellidos']){
      const fixedApe = cleanMrzSurname(out['Apellidos']);
      if (fixedApe) out['Apellidos'] = fixedApe;
    }

    // Apple OCR suele incluir una línea suelta de doc alfanumérico (8-10 chars), p.ej. 38397L6D1
    if (!out['Nº Documento']){
      const genericDocLine = lines.find(l => {
        const s = String(l || '').toUpperCase().replace(/\s+/g, '');
        if (s.length < 8 || s.length > 12) return false;
        if (!/^[A-Z0-9]+$/.test(s)) return false;
        if (!/[A-Z]/.test(s) || !/\d/.test(s)) return false;
        if (s.includes('ESP') || s.includes('ID') || s.includes('<<<')) return false;
        return true;
      });
      if (genericDocLine){
        const candidate = String(genericDocLine).toUpperCase().replace(/\s+/g, '');
        out['Nº Documento'] = candidate;
      }
    }

    const mDoc = up.match(/\b([XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]{3}\d{5,9})\b/);
    if (!out['Nº Documento'] && mDoc && isLikelyDocId(mDoc[1])) out['Nº Documento'] = normalizeDocCandidate(mDoc[1]);

    const mTipo = up.match(/\b(DNI|NIE|PASAPORTE)\b/);
    if (!out['Tipo de documento'] && mTipo) out['Tipo de documento'] = mTipo[1];

    const mSexo = up.match(/\b(MASCULINO|FEMENINO|HOMBRE|MUJER|VARON|VARÓN)\b/);
    if (!out['Sexo'] && mSexo){
      const sx = mSexo[1];
      out['Sexo'] = (sx === 'FEMENINO' || sx === 'MUJER') ? 'FEMENINO' : 'MASCULINO';
    }

    const mNac = text.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/);
    if (!out['Fecha de nacimiento'] && mNac) out['Fecha de nacimiento'] = mNac[1];
    if (!out['Fecha de nacimiento']){
      const mNacSp = text.match(/\b(\d{1,2})\s+(\d{1,2})\s+(\d{4})\b/);
      if (mNacSp) out['Fecha de nacimiento'] = `${String(mNacSp[1]).padStart(2,'0')}/${String(mNacSp[2]).padStart(2,'0')}/${mNacSp[3]}`;
    }

    const mNacionalidad = up.match(/NACIONALIDAD\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ ]{3,})/);
    if (!out['Nacionalidad'] && mNacionalidad) out['Nacionalidad'] = normSpaces(mNacionalidad[1]);
    if (!out['Nacionalidad']){
      const nVal = findValueNearLabel(lines, /(NACIONALIDAD|NATIONALITY|NATA|NATIONA)/i, 3);
      if (nVal) out['Nacionalidad'] = nVal;
    }

    const mNombre = up.match(/NOMBRE\S*\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ' ]{2,})/);
    if (!out['Nombre'] && mNombre){
      const v = cleanPersonName(mNombre[1]);
      if (v) out['Nombre'] = v;
    }
    if (!out['Nombre']){
      const nVal = findValueNearLabel(lines, /(NOMBRE|GIVEN|PRONOMS|GEN N)/i, 3);
      const v = cleanPersonName(nVal);
      if (v) out['Nombre'] = v;
    }

    const mApe = up.match(/APELLIDOS?\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ' ]{2,})/);
    if (!out['Apellidos'] && mApe){
      const v = cleanPersonName(mApe[1]);
      if (v) out['Apellidos'] = v;
    }
    if (!out['Apellidos']){
      const aVal = findValueNearLabel(lines, /(APELLID|SURNAM|NOM)/i, 3);
      const v = cleanPersonName(aVal);
      if (v) out['Apellidos'] = v;
    }

    const dom = findLineAfter(lines, /DOMICILIO|ADDRESS/i);
    if (dom){
      const stopLabel = /(OBSERVACIONES|REMARKS|FECHA DE EMISION|DATE OF ISSUE|LUGAR DE NACIMIENTO|PLACE OF BIRTH|HIJO\/A DE|NOMBRE|APELLIDOS|NACIONALIDAD|PASSPORT|DOCUMENT|^I[A-Z<0-9]{10,}|^\d{6}[MF<]\d{6})/i;
      const domPartsRaw = [];
      for (let j = dom.index + 1; j < lines.length; j++){
        const ln = String(lines[j] || '').trim();
        if (!ln) continue;
        if (stopLabel.test(ln)) break;
        domPartsRaw.push(ln.replace(/^[-*•·\s]+/, ''));
        if (domPartsRaw.length >= 4) break;
      }
      const domParts = uniqueByNorm(domPartsRaw);
      if (domParts.length) out['Domicilio'] = domParts.join(', ');
    }

    const tel = text.match(/(?:TEL[ÉE]FONO|MOVIL|MÓVIL|TLF)\s*[:\-]?\s*(\+?\d[\d\s]{6,})/i);
    if (tel) out['Teléfono'] = normSpaces(tel[1]);

    const lugar = findLineAfter(lines, /(LUGAR\s+DE\s+NACIMIENTO|LUGAR\s+DE\s+HACIMIENTO|PLACE\s+OF\s+BIRTH)/i);
    if (lugar){
      let v = '';
      for (let j = lugar.index + 1; j <= Math.min(lines.length - 1, lugar.index + 4); j++){
        const cand = normalizePlaceBirth(lines[j] || '');
        if (!cand) continue;
        if (/\d/.test(cand)) continue; // lugar: solo texto, sin números
        if (/(FECHA|DATE|NACIMIENTO|BIRTH|PLACE|LUGAR)/i.test(cand)) continue; // evita enunciados
        v = cand;
        break;
      }
      if (v && window.PAISES_ISO3?.normalizeField){
        try{ v = window.PAISES_ISO3.normalizeField(v, 'Lugar de nacimiento'); }catch{}
      }
      if (v) out['Lugar de nacimiento'] = v;
    }
    if (!out['Lugar de nacimiento']){
      const placeVal = findValueNearLabel(lines, /(LUGAR\s+DE\s+NACIMIENTO|PLACE\s+OF\s+BIRTH)/i, 3);
      if (placeVal && !/\d/.test(placeVal)) out['Lugar de nacimiento'] = normalizePlaceBirth(placeVal);
    }
    if (!out['Lugar de nacimiento']){
      const dateLineIdx = lines.findIndex(l => /\b\d{1,2}[\/\-. ]\d{1,2}[\/\-. ]\d{2,4}\b/.test(String(l || '')));
      if (dateLineIdx >= 0){
        for (let j = dateLineIdx + 1; j <= Math.min(lines.length - 1, dateLineIdx + 4); j++){
          const cand = normalizePlaceBirth(lines[j] || '');
          if (!cand) continue;
          if (/\d/.test(cand)) continue;
          if (/(FECHA|DATE|NACIMIENTO|BIRTH|PLACE|LUGAR|AUTORIDAD|AUTHORITY)/i.test(cand)) continue;
          out['Lugar de nacimiento'] = cand;
          break;
        }
      }
    }

    const padres = findLineAfter(lines, /(HIJO\/A\s+DE|HIJO\s+DE|HIJA\s+DE)/i);
    if (padres){
      const v = normSpaces(padres.next || '');
      if (v) out['Nombre de los Padres'] = v;
    }

    inferDocType(out);
    if (out['Tipo de documento'] === 'DNI') out['Nacionalidad'] = 'ESPAÑA';
    if (out['Nacionalidad']) out['Nacionalidad'] = cleanCountryLabel(out['Nacionalidad']);
    if (!out['Nacionalidad']){
      const mrz = lines.map(normalizeMrzLine);
      const l2 = mrz.find(l => /\d{6}[MF<]\d{6}/.test(l)) || '';
      if (l2.length >= 18){
        const iso = l2.slice(15, 18).replace(/[^A-Z]/g, '');
        if (iso.length === 3){
          const name = window.PAISES_ISO3?.countryNameFromIso3?.(iso);
          out['Nacionalidad'] = name || (iso === 'ESP' ? 'ESPAÑA' : iso);
        }
      }
    }
    return out;
  }

  function ensureFili(fi){
    const appState = getAppState();
    if (!appState || typeof appState !== 'object') return null;
    if (!appState.lastJson || typeof appState.lastJson !== 'object') appState.lastJson = {};
    if (!Array.isArray(appState.lastJson.filiaciones)) appState.lastJson.filiaciones = [];
    if (!appState.lastJson.filiaciones[fi] || typeof appState.lastJson.filiaciones[fi] !== 'object'){
      appState.lastJson.filiaciones[fi] = {
        'Condición':'',
        'Nombre':'','Apellidos':'','Tipo de documento':'','Nº Documento':'','Sexo':'',
        'Nacionalidad':'','Fecha de nacimiento':'','Lugar de nacimiento':'',
        'Nombre de los Padres':'','Domicilio':'','Teléfono':''
      };
    }
    return appState.lastJson.filiaciones[fi];
  }

  async function readClipboardOrPrompt(){
    let text = '';
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function'){
      try{
        text = await navigator.clipboard.readText();
      }catch{}
    }
    if (String(text || '').trim()) return text;
    const pasted = prompt('No se pudo leer el portapapeles automáticamente.\nPega aquí el texto OCR y pulsa Aceptar:') || '';
    return pasted;
  }

  function syncOverlayInputs(fi){
    const form = document.getElementById('ovForm');
    const appState = getAppState();
    if (!form || !appState?.lastJson?.filiaciones?.[fi]) return;
    const src = appState.lastJson.filiaciones[fi];
    const els = form.querySelectorAll(`[data-ov-fi="${fi}"][data-ov-k]`);
    els.forEach(el => {
      const k = el.getAttribute('data-ov-k');
      if (!k) return;
      const v = (typeof src[k] === 'string') ? src[k] : '';
      if ('value' in el) el.value = v;
    });
  }

  async function parseFromClipboardIntoFi(fi){
    const text = await readClipboardOrPrompt();
    if (!String(text || '').trim()){
      notify('No hay texto OCR para parsear.', 'err');
      return;
    }

    const parsed = parseClipboardText(text);
    const keys = Object.keys(parsed).filter(k => String(parsed[k] || '').trim());
    if (!keys.length){
      notify('No se detectaron campos parseables (DNI/NIE/Pasaporte).', 'err');
      return;
    }

    const dst = ensureFili(fi);
    if (!dst) throw new Error('Estado no disponible.');

    let applied = 0;
    for (const k of keys){
      if (!dst[k] || !String(dst[k]).trim()){
        dst[k] = String(parsed[k]).trim();
        applied++;
      }
    }

    let overwritten = 0;
    if (applied === 0){
      const candidates = keys.filter(k => {
        const cur = String(dst[k] || '').trim();
        const next = String(parsed[k] || '').trim();
        return !!next && cur !== next;
      });
      if (candidates.length){
        const ok = confirm(`No hay campos vacíos para rellenar en filiación ${fi + 1}. ¿Sobrescribir ${candidates.length} campo(s) con el OCR del portapapeles?`);
        if (ok){
          for (const k of candidates){
            dst[k] = String(parsed[k]).trim();
            overwritten++;
          }
          applied = overwritten;
        }
      }
    }

    const appState = getAppState();
    syncOverlayInputs(fi);
    if (typeof renderFiliaciones === 'function') renderFiliaciones(appState?.lastJson || {});
    if (typeof setExportEnabled === 'function') setExportEnabled(!!appState?.lastJson);
    if (applied > 0){
      if (overwritten > 0) notify(`OCR: ${applied} campos aplicados (${overwritten} sobreescritos) en filiación ${fi + 1}.`, 'ok');
      else notify(`OCR: ${applied} campos aplicados en filiación ${fi + 1}.`, 'ok');
      return;
    }
    notify(`OCR detectado (${keys.length} campos), pero no se aplicaron cambios en filiación ${fi + 1}.`, 'muted');
  }

  function styleFloatingButton(btn){
    btn.type = 'button';
    btn.textContent = '⎘';
    btn.title = 'Pegar OCR del portapapeles';
    btn.setAttribute('aria-label', 'Pegar OCR del portapapeles');
    const ref = document.getElementById('ovRotate') || document.getElementById('ovCloseTop');
    if (ref){
      const cs = window.getComputedStyle(ref);
      const props = [
        'min-width','min-height','width','height','border-radius','padding','font-size','line-height',
        'border','background','color','text-shadow','backdrop-filter','-webkit-backdrop-filter',
        'box-shadow','font-family','font-weight','letter-spacing'
      ];
      for (const p of props){
        const v = cs.getPropertyValue(p);
        if (v) btn.style.setProperty(p, v);
      }
    } else {
      btn.style.minWidth = '42px';
      btn.style.width = '42px';
      btn.style.height = '42px';
      btn.style.borderRadius = '999px';
      btn.style.padding = '0';
      btn.style.fontSize = '20px';
      btn.style.lineHeight = '1';
      btn.style.border = '1px solid rgba(255,255,255,.28)';
      btn.style.background = 'rgba(8,18,34,.18)';
      btn.style.color = '#e7f3ff';
      btn.style.textShadow = 'none';
      btn.style.backdropFilter = 'blur(2px)';
      btn.style.webkitBackdropFilter = 'blur(2px)';
    }
    btn.style.position = 'absolute';
    btn.style.right = '6px';
    btn.style.bottom = '6px';
    btn.style.zIndex = '4';
    // Símbolo algo mayor, manteniendo mismo estilo de botón que back/girar.
    btn.style.fontSize = '24px';
    btn.style.lineHeight = '1';
  }

  function getOverlayFi(){
    const form = document.getElementById('ovForm');
    if (!form) return null;
    const el = form.querySelector('[data-ov-fi][data-ov-k]');
    if (!el) return null;
    const fi = Number(el.getAttribute('data-ov-fi'));
    return (Number.isFinite(fi) && fi >= 0) ? fi : null;
  }

  function ensureOverlayButton(){
    const ov = document.getElementById('imgOverlay');
    const imgwrap = ov?.querySelector('.imgwrap');
    if (!ov || !imgwrap) return;

    let btn = document.getElementById('ovClipParse');
    if (!btn){
      btn = document.createElement('button');
      btn.id = 'ovClipParse';
      styleFloatingButton(btn);
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const fi = getOverlayFi();
        if (!Number.isFinite(fi)){
          notify('No hay filiación activa en el overlay.', 'err');
          return;
        }
        try{
          await parseFromClipboardIntoFi(fi);
        }catch(err){
          notify(`Error al leer/parsing portapapeles: ${err?.message || err}`, 'err');
        }
      });
      imgwrap.appendChild(btn);
    }

    const hasImage = !ov.classList.contains('mode-no-image');
    const isOpen = ov.classList.contains('on');
    const fi = getOverlayFi();
    btn.style.display = (isOpen && hasImage && Number.isFinite(fi)) ? '' : 'none';
  }

  function boot(){
    const ov = document.getElementById('imgOverlay');
    const form = document.getElementById('ovForm');
    if (!ov || !form) return;
    ensureOverlayButton();
    const mo1 = new MutationObserver(() => ensureOverlayButton());
    mo1.observe(ov, { attributes: true, attributeFilter: ['class'] });
    const mo2 = new MutationObserver(() => ensureOverlayButton());
    mo2.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ov-fi'] });
    notify('Parser Apple de portapapeles activo.', 'muted');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
