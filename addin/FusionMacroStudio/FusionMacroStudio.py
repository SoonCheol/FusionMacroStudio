import adsk.core
import adsk.fusion
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
from .mapping import load_mapping, zoom_extents, execute_definition, CameraRate, constrained_step, constrained_up
from .keyboard_hook import Hook, foreground
from .direct_codes import load_codes
from .local_editor import start_editor, stop_editor, revision, read_orbit_mode
from .updater import Updater

HOME = Path(os.environ["LOCALAPPDATA"]) / "FusionMacroStudio"
EVENT = "FusionMacroStudio.Command.v1"
VERSION = "0.4.0"
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

PIVOT_MODES={"__fms_pivot_auto__":"auto","__fms_pivot_body__":"body","__fms_pivot_origin__":"origin","__fms_pivot_camera__":"camera","__fms_pivot_point__":"point"}
pivot_mode="auto"
custom_pivot=None
custom_document=None
orbit_cache=None

def box_center(box):
    if box is None:
        return None
    lo,hi=box.minPoint,box.maxPoint
    xyz=[(getattr(lo,k)+getattr(hi,k))/2 for k in ("x","y","z")]
    return adsk.core.Point3D.create(*xyz) if all(math.isfinite(v) for v in xyz) else None

def select_pivot(command):
    global pivot_mode, custom_pivot, custom_document, orbit_cache
    mode=PIVOT_MODES[command]
    if mode=="point":
        selections=app.userInterface.activeSelections
        point=selections.item(0).point if selections.count else None
        if point is None or not all(math.isfinite(getattr(point,k)) for k in ("x","y","z")):
            log("Select a point on a model before setting the custom pivot")
            return
        custom_pivot=point.copy()
        custom_document=app.activeDocument
    pivot_mode=mode
    orbit_cache=None
    log("Orbit pivot: "+mode)

def orbit_center(cam):
    global orbit_cache
    if pivot_mode=="origin":
        return adsk.core.Point3D.create(0,0,0)
    if pivot_mode=="camera":
        return cam.target
    document=app.activeDocument
    if pivot_mode=="point":
        return custom_pivot.copy() if custom_pivot is not None and document==custom_document else cam.target
    now=time.monotonic()
    if orbit_cache and orbit_cache[0]==document and now-orbit_cache[1]<.25:
        point=orbit_cache[2]
        orbit_cache=(document,now,point)
        return point.copy() if point else cam.target
    point=None
    try:
        selections=app.userInterface.activeSelections
        for i in range(selections.count):
            entity=selections.item(i).entity
            body=adsk.fusion.BRepBody.cast(entity)
            if not body:
                owner=getattr(entity,"body",None)
                body=adsk.fusion.BRepBody.cast(owner) if owner else None
            if body:
                point=box_center(body.boundingBox)
                if point:break
        if point is None and pivot_mode=="auto":
            design=adsk.fusion.Design.cast(app.activeProduct)
            if design:
                root=design.rootComponent
                point=box_center(root.boundingBox2(7)) if hasattr(root,"boundingBox2") else box_center(root.boundingBox)
    except Exception:
        log("Orbit pivot fallback: "+traceback.format_exc())
    orbit_cache=(document,now,point)
    return point.copy() if point else cam.target

def vector_xyz(v):
    return (v.x,v.y,v.z)

def model_up():
    # Fusion's documented default modeling orientation (Z-up or Y-up).
    try:
        pref=app.preferences.generalPreferences.defaultModelingOrientation
        if pref==adsk.core.DefaultModelingOrientations.YUpModelingOrientation:
            return (0.,1.,0.)
    except Exception:
        pass
    return (0.,0.,1.)

def camera_action(command, amount=1.0):
    amount=max(1.0,min(20.0,float(amount)))
    viewport = app.activeViewport
    if not viewport:
        raise RuntimeError("No active viewport")
    cam = viewport.camera
    cam.isSmoothTransition = False
    if command == "__fms_fit__":
        cam.isFitView = True
    elif command in ("__fms_zoom_in__","__fms_zoom_out__"):
        factor = (0.85 if command.endswith("in__") else 1/0.85)**amount
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
        axis.scaleBy(sign * 0.05 * amount * (width if horizontal else height))
        eye.translateBy(axis)
        target.translateBy(axis)
        cam.eye = eye
        cam.target = target
    else:
        up = cam.upVector
        direction = cam.eye.vectorTo(cam.target)
        vertical = command in ("__fms_orbit_up__","__fms_orbit_down__")
        angle = math.radians((7 if command in ("__fms_orbit_left__","__fms_orbit_up__") else -7)*amount)
        constrained=read_orbit_mode(HOME)=="constrained"
        if constrained:
            world_up=model_up()
            axis_xyz,angle=constrained_step(vector_xyz(direction),vector_xyz(up),world_up,vertical,angle)
            if abs(angle)<1e-10:
                return
            axis=adsk.core.Vector3D.create(*axis_xyz)
        else:
            axis=direction.crossProduct(up) if vertical else up.copy()
        if not axis.normalize():
            raise RuntimeError('Invalid orbit axis')
        matrix = adsk.core.Matrix3D.create()
        if not matrix.setToRotation(angle,axis,orbit_center(cam)):
            raise RuntimeError('Orbit rotation failed')
        eye = cam.eye
        eye.transformBy(matrix)
        target=cam.target
        target.transformBy(matrix)
        cam.eye = eye
        cam.target = target
        up.transformBy(matrix)
        if constrained:
            forward=eye.vectorTo(target)
            up=adsk.core.Vector3D.create(*constrained_up(vector_xyz(forward),world_up,vector_xyz(up)))
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
            elif cmd in PIVOT_MODES:
                select_pivot(cmd)
            elif cmd in CAMERA:
                camera_action(cmd,payload.get('amount',1))
            elif cmd in ('__fms_hold_pan__','__fms_hold_vertical__'):
                return
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
    deferred=None
    rate=CameraRate()
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
                if deferred is not None:
                    action,generation,created=deferred
                    deferred=None
                else:
                    action, generation, created = actions.get(timeout=.025)
            except queue.Empty:
                continue
            if action != "__fms_export__" and (generation != hook.generation or time.monotonic()-created > 1.5 or not foreground()):
                continue
            amount=1.0
            if action in CAMERA and action!='__fms_fit__':
                amount=rate.step(action,created)
                deadline=time.monotonic()+.012
                for _ in range(7):
                    remaining=deadline-time.monotonic()
                    if remaining<=0:break
                    try:
                        item=actions.get(timeout=remaining)
                    except queue.Empty:break
                    if item[:2]!=(action,generation):
                        deferred=item
                        break
                    if time.monotonic()-item[2]<=1.5:
                        amount+=rate.step(action,item[2])
            else:
                rate.previous=None
            if not app.fireCustomEvent(EVENT,json.dumps({"command":action,"generation":generation,"created":created,"amount":amount})):
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
            editor_server, editor_thread = start_editor(HOME, Path(__file__).parent / 'web', trace=hook.trace, updater=Updater(HOME, VERSION))
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
