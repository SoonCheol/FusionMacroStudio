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
from .mapping import load_mapping, zoom_extents, execute_definition
from .keyboard_hook import Hook, foreground
from .direct_codes import load_codes
from .local_editor import start_editor, stop_editor, revision

HOME = Path(os.environ["LOCALAPPDATA"]) / "FusionMacroStudio"
EVENT = "FusionMacroStudio.Command.v1"
VERSION = "0.3.16"
app = None
handler = None
event = None
hook = None
worker = None
editor_server = editor_thread = None
stop_event = threading.Event()
actions = queue.Queue(maxsize=128)
def log(message):
    HOME.mkdir(parents=True,exist_ok=True)
    with (HOME/"addin.log").open("a",encoding="utf-8") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + str(message) + "\n")
def write_json(target, value):
    HOME.mkdir(parents=True,exist_ok=True)
    tmp = target.with_name(target.name + ".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False),encoding="utf-8")
    tmp.replace(target)

def status(state, **extra):
    write_json(HOME/"status.json", {"version":VERSION,"state":state,"pid":os.getpid(),"time":time.time(),**extra})

def export_status(state, **extra):
    write_json(HOME/"export-status.json", {"state":state,"time":time.time(),**extra})
def enqueue(value, generation=None):
    try:
        actions.put_nowait((value, generation, time.monotonic()))
        return True
    except queue.Full:
        return False

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
    write_json(dest/"commands.json", rows)
    count = len(list(icons.glob("*.png")))
    export_status("completed", commands=len(rows), local_pngs=count)
    log("Exported %s definitions, %s local PNGs" % (len(rows),count))

def camera_action(command):
    viewport = app.activeViewport
    if not viewport:
        raise RuntimeError("No active viewport")
    cam = viewport.camera
    cam.isSmoothTransition = False
    if command == "__fms_fit__":
        cam.isFitView = True
    elif command in ("__fms_zoom_in__","__fms_zoom_out__"):
        factor = 0.85 if command.endswith("in__") else 1/0.85
        if hasattr(cam, "getExtents") and hasattr(cam, "setExtents"):
            ok, width, height = cam.getExtents()
            if ok:
                if not cam.setExtents(*zoom_extents(width,height,factor)):
                    raise RuntimeError("Camera setExtents failed")
            else:
                # Perspective: change eye distance while preserving target and orientation.
                eye, target = cam.eye, cam.target
                delta = target.vectorTo(eye)
                distance = delta.length
                if not math.isfinite(distance) or distance <= 0:
                    raise RuntimeError("Invalid camera eye distance")
                scale = min(max(factor,1e-6/distance),1e9/distance)
                delta.scaleBy(scale)
                point = target.copy()
                point.translateBy(delta)
                cam.eye = point
        else:
            # Compatibility fallback for pre-October 2023 Fusion versions.
            cam.viewExtents = max(0.000001,cam.viewExtents*factor)
    elif command in ("__fms_pan_left__","__fms_pan_right__","__fms_pan_up__","__fms_pan_down__"):
        eye, target = cam.eye, cam.target
        forward = eye.vectorTo(target)
        distance = forward.length
        if not math.isfinite(distance) or distance <= 0:
            raise RuntimeError("Invalid pan distance")
        right = forward.crossProduct(cam.upVector)
        if not right.normalize():
            raise RuntimeError("Invalid pan axis")
        vertical = right.crossProduct(forward)
        if not vertical.normalize():
            raise RuntimeError("Invalid vertical pan axis")
        width = height = distance
        if hasattr(cam, "getExtents"):
            ok, w, h = cam.getExtents()
            if ok and all(math.isfinite(v) and v > 0 for v in (w,h)):
                width, height = w, h
        else:
            extents = cam.viewExtents
            if math.isfinite(extents) and extents > 0:
                width = height = extents
        horizontal = command in ("__fms_pan_left__","__fms_pan_right__")
        axis = right if horizontal else vertical
        # Translate camera opposite to the desired apparent model movement.
        sign = 1 if command in ("__fms_pan_left__","__fms_pan_down__") else -1
        axis.scaleBy(sign * 0.05 * (width if horizontal else height))
        eye.translateBy(axis)
        target.translateBy(axis)
        cam.eye = eye
        cam.target = target
    else:
        up = cam.upVector
        if command in ("__fms_orbit_up__","__fms_orbit_down__"):
            direction = cam.eye.vectorTo(cam.target)
            axis = direction.crossProduct(up)
        else:
            axis = up.copy()
        if not axis.normalize():
            raise RuntimeError('Invalid orbit axis')
        angle = math.radians(7 if command in ("__fms_orbit_left__","__fms_orbit_up__") else -7)
        matrix = adsk.core.Matrix3D.create()
        if not matrix.setToRotation(angle,axis,cam.target):
            raise RuntimeError('Orbit rotation failed')
        eye = cam.eye
        eye.transformBy(matrix)
        cam.eye = eye
        up.transformBy(matrix)
        cam.upVector = up
    viewport.camera = cam
    viewport.refresh()

CAMERA = {"__fms_fit__","__fms_zoom_in__","__fms_zoom_out__","__fms_orbit_left__","__fms_orbit_right__","__fms_orbit_up__","__fms_orbit_down__","__fms_pan_left__","__fms_pan_right__","__fms_pan_up__","__fms_pan_down__"}
class Dispatch(adsk.core.CustomEventHandler):
    def __init__(self):
        super().__init__()
    def notify(self,args):
        try:
            payload = json.loads(args.additionalInfo)
            cmd = payload['command']
            if stop_event.is_set():
                return
            if cmd == "__fms_export__":
                export_status("running")
                try:
                    export_catalog()
                except Exception as exc:
                    export_status("error", message=str(exc))
                    log(traceback.format_exc())
                return
            if not hook or payload["generation"] != hook.generation or not foreground() or time.monotonic()-payload["created"] > 1.5:
                return
            ui = app.userInterface
            if not ui.isUIEnabled:
                log("Fusion UI disabled: "+cmd)
                return
            if cmd == "__fms_escape__":
                if not ui.terminateActiveCommand():
                    log("No active command terminated")
            elif cmd in CAMERA:
                camera_action(cmd)
            else:
                result = execute_definition(ui.commandDefinitions, cmd)
                log(result + ": " + cmd)
        except Exception:
            log(traceback.format_exc())

def poll():
    last = object()
    stamp = 0
    profile_state = "missing"
    profile_error = ""
    profile_revision = ""
    while not stop_event.is_set():
        try:
            path = HOME/"profile.json"
            st = path.stat() if path.exists() else None
            current = (st.st_mtime_ns, st.st_size) if st else None
            if current != last:
                try:
                    if st and st.st_size > 8*1024*1024:
                        raise ValueError("Profile too large")
                    raw = path.read_bytes() if st else None
                    hook.set_mapping(load_mapping(json.loads(raw.decode("utf-8-sig"))) if raw is not None else {})
                    profile_revision = revision(raw)
                    profile_state = "loaded" if st else "missing"
                    profile_error = ""
                except Exception as exc:
                    hook.set_mapping({})
                    profile_revision = ""
                    profile_state = "invalid"
                    profile_error = str(exc)
                    log("Invalid profile; mapping disabled: " + profile_error)
                last = current
                log("Loaded %s command mappings" % len(hook.mapping))
                status("running",mapped=len(hook.mapping),profile=profile_state,profile_error=profile_error,profile_revision=profile_revision,editor=bool(editor_server))
            request = HOME/"export.request"
            if request.exists() and enqueue("__fms_export__"):
                request.unlink(missing_ok=True)
                export_status("queued")
            if not hook.thread or not hook.thread.is_alive():
                hook.set_mapping({})
                status("error", message=hook.error or "Keyboard hook stopped",mapped=0)
                return
            if time.monotonic()-stamp > 3:
                status("running",mapped=len(hook.mapping),profile=profile_state,profile_error=profile_error,profile_revision=profile_revision,editor=bool(editor_server))
                stamp=time.monotonic()
            hook.tick()
            try:
                action, generation, created = actions.get(timeout=.025)
            except queue.Empty:
                continue
            if action != "__fms_export__" and (generation != hook.generation or time.monotonic()-created > 1.5 or not foreground()):
                continue
            if not app.fireCustomEvent(EVENT,json.dumps({"command":action,"generation":generation,"created":created})):
                log("Fusion event queue returned false (no retry): "+action)
                if action == "__fms_export__":
                    export_status("error",message="Fusion event rejected")
        except Exception:
            log(traceback.format_exc())
            stop_event.wait(1)
def run(context):
    global app, handler, event, hook, worker, editor_server, editor_thread
    try:
        HOME.mkdir(parents=True,exist_ok=True)
        app=adsk.core.Application.get()
        stop_event.clear()
        event=app.registerCustomEvent(EVENT)
        handler=Dispatch()
        event.add(handler)
        codes=load_codes(Path(__file__).parent / 'web' / 'data' / 'command-codes.json')
        hook=Hook(enqueue,codes)
        hook.start()
        try:
            editor_server, editor_thread = start_editor(HOME, Path(__file__).parent / 'web', trace=hook.trace)
            log('Local editor: http://127.0.0.1:18472/')
        except Exception:
            log('Local editor unavailable: ' + traceback.format_exc())
        worker=threading.Thread(target=poll,daemon=True)
        worker.start()
        log("Add-in started "+VERSION+" / fixed command codes: "+str(len(codes)))
    except Exception:
        log(traceback.format_exc())
        stop(context)
        status("error")
def stop(context):
    global hook, worker, event, handler, editor_server, editor_thread
    stop_event.set()
    if editor_server:
        stop_editor(editor_server, editor_thread)
        editor_server = editor_thread = None
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
