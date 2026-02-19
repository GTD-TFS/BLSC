from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import urllib.request
import mimetypes
import os
import base64, hashlib
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import sys
import importlib
import traceback
import subprocess
import tempfile
import pathlib
import time
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5:14b-instruct"   # cambia aquí por tu modelo real

# === CLAVE FIJA (debe coincidir con index.html) ===
FIXED_PASSPHRASE = "adejegtd"

# === Ejecutar compa_agent como CLI (según su "Uso:" real) ===
AGENT_FILE = os.path.expanduser("~/compa_agent.py")

# === Async job store (evita cortes cuando el móvil bloquea pantalla) ===
JOBS = {}  # job_id -> {status, out, error, ts, wants_enc}
JOBS_LOCK = threading.Lock()
JOBS_TTL_SECONDS = 60 * 30  # 30 min
EXECUTOR = ThreadPoolExecutor(max_workers=4)

def _new_job_id():
    return uuid.uuid4().hex

def _jobs_cleanup():
    now = time.time()
    with JOBS_LOCK:
        dead = [jid for jid, j in JOBS.items() if (now - float(j.get('ts', now))) > JOBS_TTL_SECONDS]
        for jid in dead:
            try:
                JOBS.pop(jid, None)
            except Exception:
                pass

def _set_job(job_id, **kwargs):
    with JOBS_LOCK:
        j = JOBS.get(job_id) or {}
        j.update(kwargs)
        j['ts'] = time.time()
        JOBS[job_id] = j

def _get_job(job_id):
    with JOBS_LOCK:
        j = JOBS.get(job_id)
        return dict(j) if isinstance(j, dict) else None


def process_payload(req_json: dict) -> dict:
    """Procesa exactamente igual que antes, pero en background."""
    # Decide: if there are images -> OCR/agent; else -> text-only
    images = []
    if isinstance(req_json, dict):
        images = req_json.get("images_base64") or []
    has_images = isinstance(images, list) and len(images) > 0

    if has_images:
        # Ejecuta OCR/IA real vía compa_agent (usa texto + images_base64 si vienen)
        try:
            out = run_compa_agent_cli(req_json if isinstance(req_json, dict) else {})
        except Exception as e:
            out = {
                "status": "error",
                "error": f"compa_agent_failed: {e}",
                "trace": traceback.format_exc()[-2000:]
            }
    else:
        # Solo texto -> usar compa_agent para respetar prompts policiales.
        # 1) Intento con DOC-TEXTO
        # 2) Si no devuelve doc o falla, reintento con DOC-SOLO
        try:
            texto_only = (req_json.get("texto") if isinstance(req_json, dict) else "") or ""
            out = run_compa_agent_cli({
                "texto": texto_only,
                "images_base64": []
            }, force_order="DOC-TEXTO")

            # Si el agente no devuelve doc/respuesta_modelo, reintenta DOC-SOLO
            doc_candidate = ""
            if isinstance(out, dict):
                doc_candidate = (out.get("doc") or out.get("respuesta_modelo") or "")
            if not isinstance(doc_candidate, str) or not doc_candidate.strip():
                out2 = run_compa_agent_cli({
                    "texto": texto_only,
                    "images_base64": []
                }, force_order="DOC-SOLO")
                # Si el segundo intento sí trae doc, úsalo
                if isinstance(out2, dict):
                    doc2 = (out2.get("doc") or out2.get("respuesta_modelo") or "")
                    if isinstance(doc2, str) and doc2.strip():
                        out = out2
        except Exception as e:
            out = {
                "status": "error",
                "error": f"compa_agent_text_failed: {e}",
                "trace": traceback.format_exc()[-2000:]
            }

    # Compatibilidad con el front: asegura claves esperadas
    if isinstance(out, dict):
        if "status" not in out:
            out["status"] = "ok"
        if "doc" not in out and "respuesta_modelo" in out:
            out["doc"] = out.get("respuesta_modelo")
        if "respuesta_modelo" not in out and "doc" in out:
            out["respuesta_modelo"] = out.get("doc")
        out.setdefault("filiaciones", [])
        out.setdefault("ocr_raw", "")
    else:
        out = {"status": "error", "error": "output_invalid"}

    return out


def _run_job(job_id: str, req_json: dict):
    try:
        out = process_payload(req_json)
        # Guardamos resultado (plano). Se cifra al responder /result si wants_enc.
        if isinstance(out, dict) and out.get('status') == 'error':
            _set_job(job_id, status='error', error=out.get('error') or 'error', out=out)
        else:
            _set_job(job_id, status='done', out=out)
    except Exception as e:
        _set_job(job_id, status='error', error=f"job_failed: {e}", out={"status":"error","error":f"job_failed: {e}"})


def _strip_data_url(b64: str) -> str:
    if not isinstance(b64, str):
        return ""
    s = b64.strip()
    if s.startswith("data:"):
        # data:image/jpeg;base64,XXXX
        i = s.find("base64,")
        if i != -1:
            return s[i + len("base64,"):]
    return s


def _extract_first_json_from_text(s: str) -> dict:
    if not isinstance(s, str):
        raise ValueError("stdout_not_text")
    a = s.find('{')
    if a == -1:
        raise ValueError("no_json_in_stdout")
    sub = s[a:]
    dec = json.JSONDecoder()
    obj, _ = dec.raw_decode(sub)
    if not isinstance(obj, dict):
        raise ValueError("json_not_object")
    return obj


def run_compa_agent_cli(payload: dict, force_order: str = None) -> dict:
    """Run compa_agent.py using its CLI contract:

    Uso (del propio compa_agent):
      python ~/compa_agent.py --doc ~/doc.txt OCR-COMPARECENCIA img1 [mas...]
      python ~/compa_agent.py OCR-SOLO img1 [mas...]

    Este server recibe `texto` y `images_base64` (dataURL o base64). Si hay imágenes,
    creamos ficheros temporales y ejecutamos OCR-COMPARECENCIA para devolver
    `filiaciones`, `ocr_raw` y `doc` si aplica.
    """
    if not isinstance(payload, dict):
        payload = {}

    images = payload.get("images_base64") or []

    texto = (payload.get("texto") or "")

    if not os.path.exists(AGENT_FILE):
        return {"status": "error", "error": f"agent_not_found: {AGENT_FILE}"}

    with tempfile.TemporaryDirectory(prefix="compa_agent_") as td:
        tdir = pathlib.Path(td)

        # Escribir doc.txt
        doc_path = tdir / "doc.txt"
        doc_path.write_text(texto, encoding="utf-8", errors="ignore")

        # Escribir imágenes a disco
        img_paths = []
        for idx, b64 in enumerate(images):
            b64_clean = _strip_data_url(b64)
            try:
                data = base64.b64decode(b64_clean, validate=False)
            except Exception:
                return {"status": "error", "error": f"bad_base64_image_{idx}"}

            p = tdir / f"img_{idx+1}.jpg"
            p.write_bytes(data)
            img_paths.append(str(p))

        # Elegir modo según entrada real (o forzado)
        if force_order:
            orden = force_order
        else:
            if img_paths and texto.strip():
                orden = "OCR-COMPARECENCIA"
            elif img_paths and not texto.strip():
                orden = "OCR-SOLO"
            elif texto.strip():
                # Texto sin imágenes: generar DOC
                orden = "DOC-TEXTO"
            else:
                return {"status": "error", "error": "empty_payload"}

        cmd = [sys.executable, AGENT_FILE]
        if orden in ("OCR-COMPARECENCIA", "DOC-TEXTO", "DOC-SOLO"):
            cmd += ["--doc", str(doc_path), orden]
        else:
            cmd += [orden]
        cmd += img_paths

        try:
            cp = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=900,
            )
        except subprocess.TimeoutExpired:
            return {"status": "error", "error": "compa_agent_timeout"}

        out_text = (cp.stdout or "").strip()
        err_text = (cp.stderr or "").strip()

        if cp.returncode != 0:
            return {
                "status": "error",
                "error": f"compa_agent_exit_{cp.returncode}",
                "stderr": err_text[-2000:],
                "stdout": out_text[-2000:],
            }

        try:
            return _extract_first_json_from_text(out_text)
        except Exception as e:
            return {
                "status": "error",
                "error": f"compa_agent_bad_output: {e}",
                "stderr": err_text[-2000:],
                "stdout": out_text[-2000:],
            }

def _b64u_decode(s):
    s = s.replace("-","+").replace("_","/")
    s += "=" * ((4 - len(s) % 4) % 4)
    return base64.b64decode(s)

def _b64u_encode(b):
    return base64.b64encode(b).decode().replace("+","-").replace("/","_").replace("=","")

def _derive_key_pbkdf2(salt, iterations):
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
        backend=default_backend()
    )
    return kdf.derive(FIXED_PASSPHRASE.encode("utf-8"))

def decrypt_envelope(obj):
    enc = obj.get("enc") or {}
    salt = _b64u_decode(enc.get("salt",""))
    iv   = _b64u_decode(enc.get("iv",""))
    ct   = _b64u_decode(enc.get("ct",""))
    it = int(enc.get("it", 150000) or 150000)

    key = _derive_key_pbkdf2(salt, it)
    aes = AESGCM(key)
    pt = aes.decrypt(iv, ct, None)
    return json.loads(pt.decode("utf-8"))

def encrypt_envelope(obj):
    salt = hashlib.sha256(b"compa_pol_salt").digest()[:16]
    iv   = hashlib.sha256(str(obj).encode()).digest()[:12]
    key  = _derive_key_pbkdf2(salt,150000)

    aes = AESGCM(key)
    data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    ct = aes.encrypt(iv, data, None)

    return {
        "enc":{
            "v":1,
            "alg":"A256GCM",
            "it":150000,
            "salt":_b64u_encode(salt),
            "iv":_b64u_encode(iv),
            "ct":_b64u_encode(ct)
        }
    }


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _serve_static(self, rel_path: str):
        """Serve a file relative to the folder where server.py lives.
        Only intended for your PWA static assets (js/css/images)."""
        base_dir = os.path.dirname(os.path.abspath(__file__))

        # Normaliza y evita path traversal (..)
        rel_path = (rel_path or "").lstrip("/")
        rel_path = rel_path.replace("\\", "/")
        if ".." in rel_path.split("/"):
            self.send_response(403)
            self._cors()
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"forbidden")
            return True

        file_path = os.path.join(base_dir, rel_path)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return False

        ctype, _ = mimetypes.guess_type(file_path)
        if not ctype:
            # Fallback razonable
            if file_path.endswith('.js'):
                ctype = 'application/javascript; charset=utf-8'
            elif file_path.endswith('.css'):
                ctype = 'text/css; charset=utf-8'
            else:
                ctype = 'application/octet-stream'

        with open(file_path, "rb") as f:
            body = f.read()

        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        # Sin cache agresiva para desarrollo
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(body)
        except BrokenPipeError:
            return True
        return True
    def _cors(self):
        # Ajusta el Origin si lo necesitas, pero esto cubre tu PWA
        self.send_header("Access-Control-Allow-Origin", "https://pwa.0904198.xyz")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Connection", "keep-alive")

    def _norm_path(self, raw_path: str):
        """Normaliza rutas cuando la app está publicada bajo /compa_api/"""
        if not raw_path:
            return "/"
        p = raw_path.split('?',1)[0]
        # Si el reverse proxy expone bajo /compa_api/, reescribe a raíz
        if p.startswith("/compa_api/"):
            p = "/" + p[len("/compa_api/"):]
        elif p == "/compa_api":
            p = "/"
        return p

    def do_OPTIONS(self):
        # Preflight CORS
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_HEAD(self):
        p = self._norm_path(self.path)
        if p in ("/", "/index.html", "/health"):
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type","text/html; charset=utf-8")
            self.end_headers()
            return
        self.send_response(404)
        self._cors()
        self.end_headers()

    def do_GET(self):
        # Normaliza path (soporta hosting bajo /compa_api/)
        p = self._norm_path(self.path)

        # Servir la PWA (index.html) desde ESTA MISMA carpeta en el puerto 8080
        if p in ("/", "/index.html"):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            index_path = os.path.join(base_dir, "index.html")
            if not os.path.exists(index_path):
                self.send_response(404)
                self._cors()
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"index.html no encontrado junto a server.py")
                return

            with open(index_path, "rb") as f:
                body = f.read()

            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Health simple
        if p == "/health":
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            body_bytes = json.dumps({"status":"ok"}).encode("utf-8")
            self.send_header("Content-Length", str(len(body_bytes)))
            self.end_headers()
            self.wfile.write(body_bytes)
            return

        # Result async: /result?job_id=...
        if self.path.startswith("/result") or p.startswith("/result"):
            try:
                from urllib.parse import urlparse, parse_qs
                q = urlparse(self.path)
                qs = parse_qs(q.query or "")
                job_id = (qs.get('job_id') or [""])[0]
            except Exception:
                job_id = ""

            _jobs_cleanup()
            job = _get_job(job_id) if job_id else None
            if not job:
                self.send_response(404)
                self._cors()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                body_bytes = json.dumps({"status":"error","error":"job_not_found"}).encode("utf-8")
                self.send_header("Content-Length", str(len(body_bytes)))
                self.end_headers()
                self.wfile.write(body_bytes)
                return

            wants_enc = bool(job.get('wants_enc'))
            st = job.get('status') or 'running'

            if st == 'running':
                payload = {"status":"running","retry_after_ms":500}
            elif st == 'done':
                payload = {"status":"done", "out": job.get('out')}
            else:
                payload = {"status":"error", "error": job.get('error') or 'error', "retry_after_ms":1500}

            if wants_enc:
                payload = encrypt_envelope(payload)

            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_header("Content-Length", str(len(body_bytes)))
            self.end_headers()
            try:
                self.wfile.write(body_bytes)
            except BrokenPipeError:
                return
            return

        # Static files for the PWA (JS/CSS/images/icons/manifest)
        # Sirve cualquier archivo estático (css/js/png/ico/webmanifest/svg/jpg...) desde la carpeta
        # donde vive server.py. Esto permite usar <link rel="stylesheet" href="compa.css">.
        if (
            p.startswith('/js/') or
            p.startswith('/css/') or
            p.startswith('/img/') or
            p.endswith('.css') or
            p.endswith('.js') or
            p.endswith('.png') or
            p.endswith('.jpg') or
            p.endswith('.jpeg') or
            p.endswith('.webp') or
            p.endswith('.svg') or
            p.endswith('.ico') or
            p.endswith('.webmanifest') or
            p.endswith('.json') or
            p in (
                '/paises.js','/provincias_es.js','/municipios.js',
                '/manifest.webmanifest','/sw.js',
                '/favicon.ico',
                '/icon-192.png','/icon-512.png',
                '/apple-touch-icon.png'
            )
        ):
            if self._serve_static(p):
                return

        self.send_response(404)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        body_bytes = json.dumps({"status":"error","error":"not_found"}).encode("utf-8")
        self.send_header("Content-Length", str(len(body_bytes)))
        self.end_headers()
        self.wfile.write(body_bytes)

    def do_POST(self):
        if self.path != "/process":
            self.send_response(404)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            body_bytes = json.dumps({"status":"error","error":"not_found"}).encode("utf-8")
            self.send_header("Content-Length", str(len(body_bytes)))
            self.end_headers()
            self.wfile.write(body_bytes)
            return

        # Lee el JSON que envía la PWA
        try:
            length = int(self.headers.get('Content-Length', '0') or '0')
        except Exception:
            length = 0
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            req_json = json.loads(raw.decode('utf-8'))
        except Exception:
            req_json = {}

        # Si viene cifrado (envelope {enc:{...}}), descífralo
        wants_enc = isinstance(req_json, dict) and ('enc' in req_json)
        if wants_enc:
            try:
                req_json = decrypt_envelope(req_json)
            except Exception:
                req_json = {}

        # Crear job y ejecutar en background (evita cortes por pantalla bloqueada)
        _jobs_cleanup()
        job_id = _new_job_id()
        _set_job(job_id, status='running', wants_enc=bool(wants_enc))

        # Lanzar procesamiento en background
        try:
            EXECUTOR.submit(_run_job, job_id, req_json if isinstance(req_json, dict) else {})
        except Exception as e:
            _set_job(job_id, status='error', error=f"enqueue_failed: {e}")

        # Responder INMEDIATO
        resp = {"job_id": job_id}
        if wants_enc:
            resp = encrypt_envelope(resp)

        self.send_response(202)
        self._cors()
        self.send_header("Content-Type","application/json; charset=utf-8")
        body_bytes = json.dumps(resp, ensure_ascii=False).encode("utf-8")
        self.send_header("Content-Length", str(len(body_bytes)))
        self.end_headers()
        try:
            self.wfile.write(body_bytes)
        except BrokenPipeError:
            return
        return

httpd = ThreadingHTTPServer(("0.0.0.0",8080),Handler)
print("PWA+API LISTO EN 8080  (GET / -> index.html, POST /process -> (texto->Ollama | fotos->compa_agent))")
httpd.serve_forever()
