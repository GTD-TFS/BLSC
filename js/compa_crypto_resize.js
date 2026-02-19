/* ========= Cifrado extremo-a-extremo (browser<->server) =========
   - Sin UI: pide clave 1 vez por sesión (sessionStorage).
   - Envío: intenta cifrado; si el server no lo soporta aún, reintenta en claro.
   Envelope:
     {"enc":{"v":1,"alg":"A256GCM","it":150000,"salt":"...","iv":"...","ct":"..."}}
*/
const ENC = { it: 150000 };
// Clave fija compartida (debe coincidir en server.py)
// Cambia este valor por una cadena larga y secreta antes de usar en produccion.
const FIXED_PASSPHRASE = "adejegtd";

function _b64uFromBytes(u8){
  let s = "";
  for (let i=0;i<u8.length;i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}
function _bytesFromB64u(b64u){
  const b64 = b64u.replaceAll("-","+").replaceAll("_","/") + "===".slice((b64u.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function _getPassphrase(){
  // Sin UI: clave fija
  return FIXED_PASSPHRASE;
}

async function _deriveAesKey(passphrase, saltBytes){
  const te = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name:"PBKDF2", salt: saltBytes, iterations: ENC.it, hash:"SHA-256" },
    baseKey,
    { name:"AES-GCM", length: 256 },
    false,
    ["encrypt","decrypt"]
  );
}

async function maybeEncryptPayload(obj){
  // Activa cifrado solo si hay WebCrypto y estamos en HTTPS
  if (!window.crypto?.subtle || location.protocol !== "https:") return obj;

  const pass = await _getPassphrase();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await _deriveAesKey(pass, salt);

  const te = new TextEncoder();
  const pt = te.encode(JSON.stringify(obj));

  const ctBuf = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, pt);
  const ct = new Uint8Array(ctBuf);

  return {
    enc: {
      v: 1,
      alg: "A256GCM",
      it: ENC.it,
      salt: _b64uFromBytes(salt),
      iv: _b64uFromBytes(iv),
      ct: _b64uFromBytes(ct)
    }
  };
}

async function maybeDecryptObject(j){
  if (!j || typeof j !== "object" || !j.enc) return j;
  if (!window.crypto?.subtle) throw new Error("no_crypto");

  const enc = j.enc || {};
  const pass = await _getPassphrase();

  const salt = _bytesFromB64u(enc.salt || "");
  const iv   = _bytesFromB64u(enc.iv || "");
  const ct   = _bytesFromB64u(enc.ct || "");

  const it = Number(enc.it || ENC.it) || ENC.it;
  ENC.it = it; // respeta lo que mande el server

  const key = await _deriveAesKey(pass, salt);
  const ptBuf = await crypto.subtle.decrypt({name:"AES-GCM", iv}, key, ct);
  const td = new TextDecoder();
  const txt = td.decode(ptBuf);

  return JSON.parse(txt);
}

async function maybeParseAndDecrypt(text){
  let j;
  try { j = JSON.parse(text); } catch { return null; }
  return await maybeDecryptObject(j);
}


function fileToResizedBase64(file){
  // Evita “cuelgues” silenciosos en iOS (HEIC/decodificación): timeout + fallback.
  const TIMEOUT_MS = 25000;

  const withTimeout = (p) => Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout_decode')), TIMEOUT_MS))
  ]);

  const drawToCanvas = (source, sw, sh) => {
    // Reducir manteniendo proporción: límite por lado mayor (MAX)
    const maxSide = Math.max(sw, sh);
    const scale = maxSide > MAX ? (MAX / maxSide) : 1;
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));

    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', {alpha:false});
    ctx.drawImage(source, 0, 0, w, h);

    // Preprocesado automático baja luz/contraste (NO recorta)
    const enh = maybeEnhanceCanvas(ctx, w, h);
    if (enh.enhanced){
      // No spamear: dejamos un aviso suave (se verá si se procesa)
      // setStatus('Aplicada mejora de baja luz a una imagen.', 'muted');
    }

    const base64 = c.toDataURL('image/jpeg', JPEG_QUALITY);
    return { base64, w, h };
  };

  // 1) Camino rápido: createImageBitmap (cuando está disponible)
  if (window.createImageBitmap){
    return withTimeout(
      createImageBitmap(file).then(bmp => {
        try{
          const out = drawToCanvas(bmp, bmp.width, bmp.height);
          try{ bmp.close?.(); }catch{}
          return out;
        }catch(e){
          try{ bmp.close?.(); }catch{}
          throw e;
        }
      })
    ).catch(() => {
      // si falla (HEIC / decode raro), caemos al fallback con <img>
      return _fileToResizedBase64_img(file, withTimeout, drawToCanvas);
    });
  }

  // 2) Fallback
  return _fileToResizedBase64_img(file, withTimeout, drawToCanvas);
}

function _fileToResizedBase64_img(file, withTimeout, drawToCanvas){
  return new Promise((resolve, reject) => {
    const img = new Image();
    let url = null;

    const cleanup = () => {
      try{ if (url) URL.revokeObjectURL(url); }catch{}
      url = null;
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      try{
        const out = drawToCanvas(img, img.width, img.height);
        cleanup();
        resolve(out);
      }catch(e){
        cleanup();
        reject(e);
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('img_decode_failed'));
    };

    try{
      url = URL.createObjectURL(file);
      img.src = url;

      // Safari a veces no dispara onerror/onload: forzamos timeout
      withTimeout(new Promise(r => { img.onload = () => r('ok'); img.onerror = () => r('err'); }))
        .then((st) => {
          if (st === 'err'){
            cleanup();
            reject(new Error('img_decode_failed'));
          }
          // si es ok, el onload real ya resolvió arriba
        })
        .catch(() => {
          cleanup();
          reject(new Error('timeout_decode'));
        });

    }catch(e){
      cleanup();
      reject(e);
    }
  });
}
