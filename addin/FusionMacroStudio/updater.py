"""Explicit opt-in updates from the project's HTTPS Pages release manifest."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import time
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

def fetch(name, limit, progress=None):
    # No caller-supplied URL or redirect to another origin.
    with urlopen(BASE + name, timeout=30) as response:
        if response.geturl() != BASE + name:
            raise ValueError("Unexpected update redirect")
        if progress is None:
            data = response.read(limit + 1)
            if len(data) > limit:
                raise ValueError("Update exceeds size limit")
            return data
        chunks = []
        size = 0
        deadline = time.monotonic() + 600
        while True:
            if time.monotonic() > deadline:
                raise TimeoutError("Update download timed out")
            chunk = response.read(min(65536, limit + 1 - size))
            if not chunk:
                break
            size += len(chunk)
            if size > limit:
                raise ValueError("Update exceeds size limit")
            chunks.append(chunk)
            progress(min(99, size * 100 // limit))
        return b"".join(chunks)

def regular(path):
    try:
        st = path.lstat()
        return stat.S_ISREG(st.st_mode) and not getattr(st, "st_file_attributes", 0) & 0x400
    except OSError:
        return False

def verified(raw, info):
    return len(raw) == info["size"] and hashlib.sha256(raw).hexdigest() == info["sha256"]

def cached_package(directory, info, progress, fetcher=None):
    directory.mkdir(parents=True, exist_ok=True)
    st = directory.lstat()
    if not stat.S_ISDIR(st.st_mode) or getattr(st,"st_file_attributes",0) & 0x400:
        raise ValueError("Unsafe update cache")
    path = directory / info["file"]
    if regular(path) and path.stat().st_size == info["size"]:
        raw = path.read_bytes()
        if verified(raw, info):
            progress(100)
            return raw
    if path.exists() and not regular(path) or path.is_symlink():
        raise ValueError("Unsafe cached package")
    raw = (fetcher or fetch)(info["file"], info["size"], progress)
    if not verified(raw, info):
        raise ValueError("Update package checksum mismatch")
    fd, name = tempfile.mkstemp(prefix=".fms-update-",suffix=".part",dir=directory)
    try:
        with os.fdopen(fd,"wb") as stream:
            stream.write(raw)
        os.replace(name,path)
    finally:
        if os.path.exists(name):
            os.unlink(name)
    progress(100)
    return raw

def retain_packages(directory, latest):
    """Keep latest and newest older managed ZIP; never touch unrelated files."""
    versions = []
    for path in directory.iterdir():
        match = re.fullmatch(r"FusionMacroStudio-Addin-Setup-([0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5})\.zip",path.name)
        if match and regular(path):
            versions.append((version_tuple(match[1]),path))
    current = version_tuple(latest)
    older = sorted((v for v in versions if v[0] < current),key=lambda v:v[0],reverse=True)
    for _,path in older[1:]:
        try:
            if regular(path):
                path.unlink()
        except OSError:
            pass

def unpack(raw, folder, info):
    if not verified(raw, info):
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
        self.progress = 0
        self.cache = self.home / "updates"
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
                    "state": self.state, "error": self.error, "last_result": result, "progress":self.progress}
    def request(self, action):
        with self.lock:
            if self.state in ("checking", "downloading", "preparing", "scheduled"):
                raise ValueError("Update already in progress")
            if action == "check":
                self.state = "checking"
                self.progress = 0
                job = self.check
            elif action == "download" and self.info and version_tuple(self.info["version"]) > version_tuple(self.version):
                self.state = "downloading"
                self.progress = 0
                job = self.download
            elif action == "install" and self.state == "ready":
                self.state = "preparing"
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
    def set_progress(self, value):
        with self.lock:
            self.progress = value
    def download(self):
        info = dict(self.info)
        raw = cached_package(self.cache, info, self.set_progress)
        # Validate the archive structure and manifest before offering installation.
        with tempfile.TemporaryDirectory(prefix="verify-", dir=self.home) as folder:
            unpack(raw, Path(folder), info)
        retain_packages(self.cache, info["version"])
        with self.lock:
            self.state = "ready"
    def install(self):
        info = dict(self.info)
        path = self.cache / info["file"]
        if not regular(path) or path.stat().st_size != info["size"]:
            raise ValueError("Verified package missing; download again")
        raw = path.read_bytes()
        if not verified(raw, info):
            raise ValueError("Cached package checksum mismatch; download again")
        self.home.mkdir(parents=True, exist_ok=True)
        folder = Path(tempfile.mkdtemp(prefix="update-", dir=self.home))
        try:
            unpack(raw, folder, info)
            exe = Path(os.environ["SystemRoot"]) / "System32/WindowsPowerShell/v1.0/powershell.exe"
            if self.result.exists():
                self.result.unlink()
            proc = subprocess.Popen([str(exe), "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
                                     "-File", str(folder / "setup.ps1"), "-AutomaticUpdate",
                                     "-WaitForPid", str(os.getpid()), "-ExpectedVersion", info["version"],
                                     "-RestartFusion", "-RequestClose"],
                                    cwd=str(folder), creationflags=0x00000008 | 0x00000200,
                                    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            shutil.rmtree(folder, ignore_errors=True)
            raise
        with self.lock:
            self.folder = folder
            self.process = proc
            self.state = "scheduled"
