"""Explicit opt-in updates from the project's HTTPS Pages release manifest."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tempfile
import threading
from urllib.request import urlopen
import zipfile

BASE = "https://sooncheol.github.io/FusionMacroStudio/downloads/"
MAX_ZIP = 100 * 1024 * 1024
MAX_UNPACKED = 200 * 1024 * 1024

def version_tuple(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{1,5}(\.[0-9]{1,5}){2}", value):
        raise ValueError("Invalid version")
    return tuple(map(int, value.split(".")))

def release_info(raw):
    info = json.loads(raw)
    version = info["version"]
    version_tuple(version)
    expected = "FusionMacroStudio-Addin-Setup-" + version + ".zip"
    if info["file"] != expected or not re.fullmatch(r"[0-9a-f]{64}", info["sha256"]):
        raise ValueError("Invalid release metadata")
    size = info["size"]
    if type(size) is not int or not 0 < size <= MAX_ZIP:
        raise ValueError("Invalid release size")
    return {"version": version, "file": expected, "sha256": info["sha256"], "size": size}

def fetch(name, limit):
    # No caller-supplied URL or redirect to another origin.
    with urlopen(BASE + name, timeout=30) as response:
        if response.geturl() != BASE + name:
            raise ValueError("Unexpected update redirect")
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Update exceeds size limit")
    return data

def unpack(raw, folder, info):
    if len(raw) != info["size"] or hashlib.sha256(raw).hexdigest() != info["sha256"]:
        raise ValueError("Update package checksum mismatch")
    from io import BytesIO
    with zipfile.ZipFile(BytesIO(raw)) as archive:
        seen = set()
        total = 0
        for entry in archive.infolist():
            name = entry.filename
            path = PurePosixPath(name)
            mode = (entry.external_attr >> 16) & 0o170000
            if (path.is_absolute() or "\\" in name or ":" in name or ".." in path.parts
                    or mode == 0o120000 or not path.parts
                    or path.parts[0] not in ("FusionMacroStudio", "Setup.cmd", "setup.ps1", "README.txt")
                    or any(part.endswith((" ", ".")) for part in path.parts)):
                raise ValueError("Unsafe package entry")
            key = str(path).casefold()
            if key in seen:
                raise ValueError("Duplicate package entry")
            seen.add(key)
            total += entry.file_size
            if total > MAX_UNPACKED:
                raise ValueError("Unpacked package exceeds size limit")
        archive.extractall(folder)
    manifest = json.loads((folder / "FusionMacroStudio" / "FusionMacroStudio.manifest").read_text(encoding="utf-8-sig"))
    if manifest.get("version") != info["version"] or manifest.get("type") != "addin" or not manifest.get("runOnStartup"):
        raise ValueError("Package manifest mismatch")
    if not (folder / "setup.ps1").is_file():
        raise ValueError("Missing update installer")

class Updater:
    def __init__(self, home, version):
        self.home = Path(home)
        self.version = version
        self.lock = threading.RLock()
        self.info = None
        self.state = "idle"
        self.error = ""
        self.folder = None
        self.process = None
        self.result = self.home / "update-result.json"
    def snapshot(self):
        with self.lock:
            if self.state == "scheduled" and self.process and self.process.poll() is not None:
                self.state = "error"
                self.error = "Installer exited before Fusion closed"
                if self.result.is_file():
                    try:
                        self.error = json.loads(self.result.read_text(encoding="utf-8-sig")).get("error") or self.error
                    except (ValueError, OSError):
                        pass
            result = None
            if self.result.is_file():
                try:
                    result = json.loads(self.result.read_text(encoding="utf-8-sig"))
                except (ValueError, OSError):
                    pass
            return {"current": self.version, "latest": self.info["version"] if self.info else None,
                    "state": self.state, "error": self.error, "last_result": result}
    def request(self, action):
        with self.lock:
            if self.state in ("checking", "downloading", "scheduled"):
                raise ValueError("Update already in progress")
            if action == "check":
                self.state = "checking"
                job = self.check
            elif action == "install" and self.info and version_tuple(self.info["version"]) > version_tuple(self.version):
                self.state = "downloading"
                job = self.install
            else:
                raise ValueError("Check for a newer version first")
            self.error = ""
            threading.Thread(target=self._run, args=(job,), daemon=True).start()
            return self.snapshot()
    def _run(self, job):
        try:
            job()
        except Exception as exc:
            with self.lock:
                self.state = "error"
                self.error = str(exc)
    def check(self):
        info = release_info(fetch("latest.json", 4096))
        with self.lock:
            self.info = info
            self.state = "available" if version_tuple(info["version"]) > version_tuple(self.version) else "current"
    def install(self):
        info = dict(self.info)
        raw = fetch(info["file"], info["size"])
        self.home.mkdir(parents=True, exist_ok=True)
        folder = Path(tempfile.mkdtemp(prefix="update-", dir=self.home))
        try:
            unpack(raw, folder, info)
            exe = Path(os.environ["SystemRoot"]) / "System32/WindowsPowerShell/v1.0/powershell.exe"
            if self.result.exists():
                self.result.unlink()
            proc = subprocess.Popen([str(exe), "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
                                     "-File", str(folder / "setup.ps1"), "-AutomaticUpdate",
                                     "-WaitForPid", str(os.getpid()), "-ExpectedVersion", info["version"]],
                                    cwd=str(folder), creationflags=0x00000008 | 0x00000200,
                                    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            shutil.rmtree(folder, ignore_errors=True)
            raise
        with self.lock:
            self.folder = folder
            self.process = proc
            self.state = "scheduled"
