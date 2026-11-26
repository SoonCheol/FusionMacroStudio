import adsk.core
import json
import math
import os
from pathlib import Path
import queue
import re
import shutil
import threading
import time
import traceback
from .mapping import load_mapping
from .keyboard_hook import Hook, foreground

HOME = Path(os.environ["LOCALAPPDATA"]) / "FusionMacroStudio"
EVENT = "FusionMacroStudio.Command.v1"
VERSION = "0.2.0"
app = None
handler = None
event = None
hook = None
worker = None
stop_event = threading.Event()
actions = queue.Queue(maxsize=128)
def log(message):
    HOME.mkdir(parents=True,exist_ok=True)
    with (HOME/"addin.log").open("a",encoding="utf-8") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + str(message) + "\n")
def status(state, **extra):
    HOME.mkdir(parents=True,exist_ok=True)
    target = HOME/"status.json"
    tmp = HOME/"status.tmp"
    tmp.write_text(json.dumps({"version":VERSION,"state":state,"pid":os.getpid(),"time":time.time(),**extra}),encoding="utf-8")
    tmp.replace(target)
def enqueue(value):
    try:
        actions.put_nowait(value)
    except queue.Full:
        pass

def export_catalog():
    """Local only; never sends Autodesk artwork to GitHub or the web."""
    dest = HOME/"export"
    icons = dest/"icons"
    icons.mkdir(parents=True,exist_ok=True)
    rows = []
    defs = app.userInterface.commandDefinitions
    for i in range(defs.count):
        try:
            d = defs.item(i)
            row = {"id":d.id,"name":d.name}
            try:
                row["description"] = d.tooltip or ""
            except Exception:
                pass
            rows.append(row)
            if not re.fullmatch(r"[A-Za-z0-9_.-]+", d.id):
                continue
            try:
                folder = Path(d.resourceFolder)
                if not folder.is_absolute() or not folder.is_dir():
                    continue
                candidates = [folder/"32x32.png",folder/"64x64.png",folder/"16x16.png"]
                src = next((p for p in candidates if p.is_file()),None)
                if src:
                    shutil.copyfile(src,icons/(d.id+".png"))
            except Exception:
                pass
        except Exception:
            continue
    (dest/"commands.json").write_text(json.dumps(rows,ensure_ascii=False),encoding="utf-8")
    log("Exported %s definitions, %s local PNGs" % (len(rows),len(list(icons.glob("*.png")))))

def camera_action(command):
    viewport = app.activeViewport
    if not viewport:
        return
    cam = viewport.camera
    cam.isSmoothTransition = False
    if command == "__fms_fit__":
        cam.isFitView = True
    elif command in ("__fms_zoom_in__","__fms_zoom_out__"):
        # Legacy property is supported on older Fusion versions; newer API
        # can be adopted after verifying the installed Fusion version.
        cam.viewExtents = max(0.000001,cam.viewExtents*(0.85 if command.endswith("in__") else 1/0.85))
    else:
        up = cam.upVector
        if command in ("__fms_orbit_up__","__fms_orbit_down__"):
            direction = cam.eye.vectorTo(cam.target)
            axis = direction.crossProduct(up)
        else:
            axis = up.copy()
        if not axis.normalize():
            return
        angle = math.radians(7 if command in ("__fms_orbit_left__","__fms_orbit_up__") else -7)
        matrix = adsk.core.Matrix3D.create()
        if not matrix.setToRotation(angle,axis,cam.target):
            return
        eye = cam.eye
        eye.transformBy(matrix)
        cam.eye = eye
        up.transformBy(matrix)
        cam.upVector = up
    viewport.camera = cam
    viewport.refresh()

CAMERA = {"__fms_fit__","__fms_zoom_in__","__fms_zoom_out__","__fms_orbit_left__","__fms_orbit_right__","__fms_orbit_up__","__fms_orbit_down__"}
class Dispatch(adsk.core.CustomEventHandler):
    def __init__(self):
        super().__init__()
    def notify(self,args):
        try:
            cmd = args.additionalInfo
            if cmd == "__fms_export__":
                export_catalog()
                return
            if not foreground():
                return
            ui = app.userInterface
            if cmd == "__fms_escape__":
                ui.terminateActiveCommand()
            elif cmd in CAMERA:
                camera_action(cmd)
            else:
                definition = ui.commandDefinitions.itemById(cmd)
                if definition and definition.isEnabled:
                    definition.execute()
                else:
                    log("Unavailable command: "+cmd)
        except Exception:
            log(traceback.format_exc())

def poll():
    last = None
    stamp = 0
    while not stop_event.is_set():
        try:
            path = HOME/"profile.json"
            current = path.stat().st_mtime_ns if path.exists() else None
            if current != last:
                try:
                    hook.mapping = load_mapping(json.loads(path.read_text(encoding="utf-8-sig"))) if current else {}
                except Exception:
                    hook.mapping = {}
                    log("Invalid profile; mapping disabled")
                last = current
                log("Loaded %s command mappings" % len(hook.mapping))
            request = HOME/"export.request"
            if request.exists():
                request.unlink()
                enqueue("__fms_export__")
            if time.monotonic()-stamp > 3:
                status("running",mapped=len(hook.mapping))
                stamp=time.monotonic()
            try:
                action = actions.get(timeout=.2)
            except queue.Empty:
                continue
            app.fireCustomEvent(EVENT,action)
        except Exception:
            log(traceback.format_exc())
            stop_event.wait(1)
def run(context):
    global app, handler, event, hook, worker
    try:
        HOME.mkdir(parents=True,exist_ok=True)
        app=adsk.core.Application.get()
        stop_event.clear()
        event=app.registerCustomEvent(EVENT)
        handler=Dispatch()
        event.add(handler)
        hook=Hook(enqueue)
        hook.start()
        worker=threading.Thread(target=poll,daemon=True)
        worker.start()
        log("Add-in started "+VERSION)
    except Exception:
        log(traceback.format_exc())
        stop(context)
        status("error")
def stop(context):
    global hook, worker, event, handler
    stop_event.set()
    if hook:
        hook.stop()
    if worker:
        worker.join(3)
    if event and handler:
        event.remove(handler)
    if app and event:
        app.unregisterCustomEvent(EVENT)
    hook=worker=event=handler=None
    while not actions.empty():
        try:
            actions.get_nowait()
        except queue.Empty:
            break
    status("stopped")
