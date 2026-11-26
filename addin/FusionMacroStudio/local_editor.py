"""Loopback-only web editor and validated profile storage. No external access."""
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import tempfile
import threading
from urllib.parse import urlsplit
from .mapping import load_mapping

PORT = 18472
LIMIT = 8 * 1024 * 1024

def revision(raw):
    return hashlib.sha256(raw).hexdigest() if raw is not None else ""

def atomic_write(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=str(path.parent), prefix=".fms-")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)

def read_profile(path):
    if not path.exists():
        return None
    if path.stat().st_size > LIMIT:
        raise ValueError("Profile too large")
    return path.read_bytes()

def read_orbit_mode(home):
    try:
        mode=json.loads((Path(home)/"orbit-settings.json").read_text(encoding="utf-8"))["mode"]
        if mode in ("free","constrained"):
            return mode
    except (OSError,ValueError,KeyError,TypeError):
        pass
    return "constrained"

def start_editor(home, web, port=PORT, trace=None, updater=None):
    home, web = Path(home), Path(web)
    if not (web / "index.html").is_file():
        raise FileNotFoundError("Local editor assets missing")
    target = home / "profile.json"
    lock = threading.Lock()
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(web), **kwargs)
        def log_message(self, *args):
            pass
        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")
            self.send_header("Content-Security-Policy", "frame-ancestors 'none'; default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'")
            super().end_headers()
        def reply(self, code, value):
            raw = json.dumps(value, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        def permitted(self, api=False, write=False):
            host = "127.0.0.1:%s" % self.server.server_port
            origin = self.headers.get("Origin")
            if self.headers.get("Host") != host or (origin and origin != "http://" + host):
                return False
            if api and self.headers.get("X-FMS-Local") != "1":
                return False
            return not write or origin == "http://" + host
        def do_OPTIONS(self):
            self.send_error(403)
        def list_directory(self, path):
            self.send_error(403)
        def do_HEAD(self):
            if not self.permitted() or urlsplit(self.path).path.startswith("/api/"):
                self.send_error(403)
                return
            super().do_HEAD()
        def do_GET(self):
            path = urlsplit(self.path).path
            api = path.startswith("/api/")
            if not self.permitted(api):
                self.send_error(403)
                return
            if not api:
                super().do_GET()
                return
            try:
                if path == "/api/profile":
                    with lock:
                        raw = read_profile(target)
                    self.reply(200, {"profile": json.loads(raw.decode("utf-8-sig")) if raw is not None else None, "revision": revision(raw)})
                elif path == "/api/knob-trace" and trace is not None:
                    self.reply(200, trace.snapshot())
                elif path == "/api/orbit-mode":
                    self.reply(200, {"mode":read_orbit_mode(home)})
                elif path == "/api/update" and updater is not None:
                    self.reply(200, updater.snapshot())
                elif path == "/api/status":
                    file = home / "status.json"
                    self.reply(200, json.loads(file.read_text(encoding="utf-8")) if file.exists() else {})
                else:
                    self.reply(404, {"error": "Unknown endpoint"})
            except (ValueError, OSError) as exc:
                self.reply(500, {"error": str(exc)})
        def do_POST(self):
            path = urlsplit(self.path).path
            if path not in ("/api/profile", "/api/knob-trace", "/api/update", "/api/orbit-mode") or not self.permitted(True, True):
                self.send_error(403)
                return
            try:
                if self.headers.get_content_type() != "application/json":
                    raise ValueError("Expected JSON")
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= LIMIT:
                    raise ValueError("Invalid profile size")
                self.connection.settimeout(5)
                request = json.loads(self.rfile.read(length))
                if path == "/api/orbit-mode":
                    if request not in ({"mode":"free"},{"mode":"constrained"}):
                        raise ValueError("Invalid orbit mode")
                    with lock:
                        atomic_write(home/"orbit-settings.json",json.dumps(request).encode("utf-8"))
                    self.reply(200,request)
                    return
                if path == "/api/update":
                    if updater is None or request not in ({"action":"check"},{"action":"download"},{"action":"install"}):
                        raise ValueError("Invalid update request")
                    self.reply(200, updater.request(request["action"]))
                    return
                if path == "/api/knob-trace":
                    if trace is None or request != {"start": True}:
                        raise ValueError("Invalid trace request")
                    self.reply(200, trace.start())
                    return
                profile = request["profile"]
                count = len(load_mapping(profile))
                raw = json.dumps(profile, ensure_ascii=False).encode("utf-8")
                with lock:
                    old = read_profile(target)
                    if request.get("revision") != revision(old):
                        self.reply(409, {"error": "Profile changed outside this editor; reopen the local editor."})
                        return
                    if old != raw:
                        if old is not None:
                            atomic_write(home / "profile.previous.json", old)
                        atomic_write(target, raw)
                self.reply(200, {"revision": revision(raw), "mapped": count})
            except (KeyError, TypeError, ValueError) as exc:
                self.reply(400, {"error": str(exc)})
            except OSError as exc:
                self.reply(500, {"error": str(exc)})
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread

def stop_editor(server, thread):
    server.shutdown()
    server.server_close()
    thread.join(2)
