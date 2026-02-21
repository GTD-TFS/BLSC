/* js/cifrado.js — COMPA·POL
   - Cifra/descifra expediente en wrapper JSON
   - Autoprueba contraseñas: "compapol" y "Compapol"
   - AES-GCM + PBKDF2(SHA-256, 200000 iter)
*/
(function(){
  'use strict';

  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  const PASSWORDS = ["adejegtd"];
  const ITERATIONS = 200000;

  // Wrapper (JSON válido)
  const WRAP_KEY = "__compapol_enc_v1";
  const WRAP_META = {
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    it: ITERATIONS
  };

  function toBase64(u8){
    let s = "";
    const chunk = 0x8000;
    for(let i=0;i<u8.length;i+=chunk){
      s += String.fromCharCode.apply(null, u8.subarray(i, i+chunk));
    }
    return btoa(s);
  }
  function fromBase64(b64){
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveKey(password, salt){
    const pwKey = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
      pwKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptJSON(obj, password){
    const jsonStr = JSON.stringify(obj);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const key  = await deriveKey(password, salt);

    const cipherBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      textEncoder.encode(jsonStr)
    );

    const cipherBytes = new Uint8Array(cipherBuf);
    const full = new Uint8Array(salt.length + iv.length + cipherBytes.length);
    full.set(salt, 0);
    full.set(iv, salt.length);
    full.set(cipherBytes, salt.length + iv.length);

    return toBase64(full);
  }

  async function decryptJSON(cipherBase64, password){
    const full = fromBase64((cipherBase64 || "").trim());
    if (full.length < 16 + 12 + 1) throw new Error("Datos insuficientes");

    const salt = full.slice(0, 16);
    const iv   = full.slice(16, 28);
    const data = full.slice(28);

    const key = await deriveKey(password, salt);

    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    const jsonStr = textDecoder.decode(plainBuf);
    return JSON.parse(jsonStr);
  }

  function isWrappedEncryptedJSON(obj){
    return !!(obj && typeof obj === "object" && typeof obj[WRAP_KEY] === "string" && obj[WRAP_KEY].trim());
  }

  // Devuelve string JSON (wrapper) listo para descargar
  async function wrapEncryptedJSON(plainObj){
    const pass = PASSWORDS[0];
    const b64 = await encryptJSON(plainObj, pass);
    const wrapped = Object.assign({}, WRAP_META, {
      [WRAP_KEY]: b64
    });

    // Compatibilidad COMPA-POL GTD SIN DILIGENCIAS:
    // ese import legacy espera { meta_encrypted:true, data:"..." } con CryptoJS AES(passphrase).
    if (window.CryptoJS && window.CryptoJS.AES && typeof window.CryptoJS.AES.encrypt === "function"){
      try{
        const legacyCipher = window.CryptoJS.AES.encrypt(JSON.stringify(plainObj), pass).toString();
        wrapped.meta_encrypted = true;
        wrapped.data = legacyCipher;
      }catch(_){
        // Si falla legado, mantenemos wrapper moderno.
      }
    }

    return JSON.stringify(wrapped, null, 2);
  }

  // Acepta texto de fichero y devuelve objeto plano ya descifrado si procede.
  async function parseMaybeDecrypted(text){
    const raw = (text || "").trim();
    if (!raw) throw new Error("Archivo vacío");

    // 1) Intentar parsear como JSON normal
    let obj = null;
    try{
      obj = JSON.parse(raw);
    }catch(_){
      obj = null;
    }

    // 2) Si es wrapper cifrado, intentar descifrar con ambas pw sin preguntar
    if (isWrappedEncryptedJSON(obj)){
      const cipher = obj[WRAP_KEY];
      let lastErr = null;
      for (const pw of PASSWORDS){
        try{ return await decryptJSON(cipher, pw); }
        catch(e){ lastErr = e; }
      }
      throw lastErr || new Error("No se pudo descifrar");
    }

    // 2b) Compat legacy: {meta_encrypted:true, data:"..."} con CryptoJS
    if (obj && obj.meta_encrypted === true && typeof obj.data === "string" && obj.data.trim()){
      if (!window.CryptoJS) throw new Error("CryptoJS no disponible para formato legacy");
      let lastErr = null;
      for (const pw of PASSWORDS){
        try{
          const bytes = window.CryptoJS.AES.decrypt(obj.data, pw);
          const txt = bytes.toString(window.CryptoJS.enc.Utf8);
          if (txt && txt.trim()) return JSON.parse(txt);
        }catch(e){ lastErr = e; }
      }
      throw lastErr || new Error("No se pudo descifrar formato legacy");
    }

    // 3) Si era JSON normal, devolverlo
    if (obj && typeof obj === "object") return obj;

    // 4) Si no era JSON, por compatibilidad permitir “raw base64” (opcional)
    //    (por si guardaste cifrados como texto sin wrapper en algún sitio)
    let lastErr = null;
    for (const pw of PASSWORDS){
      try{ return await decryptJSON(raw, pw); }
      catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("Formato no reconocido");
  }

  // Export público mínimo
  window.CompaCifrado = {
    PASSWORDS,
    WRAP_KEY,
    deriveKey,
    encryptJSON,
    decryptJSON,
    wrapEncryptedJSON,
    parseMaybeDecrypted,
    isWrappedEncryptedJSON
  };
})();
