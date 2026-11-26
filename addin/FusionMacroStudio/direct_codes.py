"""Fixed registry decoder; independent of slot and legacy profile."""
import json
from pathlib import Path

CAPACITY = 11**4
FAST_CAMERA = ["__fms_fit__","__fms_orbit_down__","__fms_orbit_left__","__fms_orbit_right__","__fms_orbit_up__","__fms_pan_down__","__fms_pan_left__","__fms_pan_right__","__fms_pan_up__","__fms_zoom_in__","__fms_zoom_out__"]
HOLD_MARKERS = {133: "__fms_hold_pan__", 134: "__fms_hold_vertical__", **{127+i: f"__fms_knob_hold_{i+1}__" for i in range(3)}}
PAIR_DIGITS = (124,125,126,130,131,132)
PAN = {f"__fms_orbit_{d}__": f"__fms_pan_{d}__" for d in ("left","right","up","down")}
VERTICAL = {"__fms_orbit_left__":"__fms_orbit_up__", "__fms_orbit_right__":"__fms_orbit_down__",
            "__fms_pan_left__":"__fms_pan_up__", "__fms_pan_right__":"__fms_pan_down__"}
def load_codes(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    ids = data.get("ids")
    if (data.get("format") != "fms-direct-v1" or not isinstance(ids,list)
        or len(ids)>CAPACITY or any(not isinstance(i,str) or not i.strip() or len(i)>256
        or i in ("__fms_escape__","__fms_export__") for i in ids)
        or len(set(ids))!=len(ids)):
        raise ValueError("Invalid fixed command registry")
    return tuple(ids)

class DirectInput:
    """Only Ctrl+F13..F24, strict down/up pairs, no typing outside Fusion."""
    def __init__(self, ids, timeout=1.0):
        self.ids=ids
        self.timeout=timeout
        self.held=set()
        self.frame=None
        self.deadline=0
        self.short=False
        self.pair=None
        self.markers={}
        self.marker_edges=set()
        self.marker_deadline=0
    def reset(self):
        self.cancel()
        self.markers.clear()
        self.marker_edges.clear()
    def route(self,cmd,now):
        if self.markers:
            self.marker_deadline=now+10
        mode=next(reversed(self.markers.values()),None) if self.markers else None
        return PAN.get(cmd,cmd) if mode=="__fms_hold_pan__" else VERTICAL.get(cmd,cmd) if mode=="__fms_hold_vertical__" else cmd
    def cancel(self):
        self.frame=None
        self.short=False
        self.pair=None
    def tick(self,now,active):
        if not active:
            self.reset()
        else:
            if self.markers and now>self.marker_deadline:
                self.reset()
            elif now>self.deadline:
                self.cancel()
    def down(self,vk,mods,now,active):
        self.tick(now,active)
        if vk in self.marker_edges:
            return True
        if active and mods==2 and vk in HOLD_MARKERS:
            self.marker_edges.add(vk)
            self.markers[vk]=HOLD_MARKERS[vk]
            self.marker_deadline=now+10
            return True
        if vk in self.held:
            return True
        pair_prefix=active and mods==2 and 130<=vk<=132
        short_prefix=active and mods==2 and vk==135
        if not active or (not short_prefix and not pair_prefix and mods!=1 and not (self.markers and mods==3)) or not 124<=vk<=135:
            self.cancel()
            return False
        overlap=bool(self.held)
        self.held.add(vk)
        if overlap:
            self.cancel()
        elif pair_prefix or short_prefix or vk==135:
            self.frame=[]
            self.short=short_prefix
            self.pair=vk-130 if pair_prefix else None
        elif self.frame is not None:
            self.frame.append(vk-124)
        self.deadline=now+self.timeout
        # Orphan Ctrl-only symbols are reserved and never invoke a legacy command.
        return True
    def up(self,vk,now,active):
        self.tick(now,active)
        if vk in self.marker_edges:
            self.marker_edges.remove(vk)
            self.markers.pop(vk,None)
            return True,None
        if vk not in self.held:
            return False,None
        self.held.remove(vk)
        if self.frame is None or self.held:
            return True,None
        self.deadline=now+self.timeout
        if self.pair is not None:
            if len(self.frame)<3:
                return True,None
            knob=self.pair
            digits=[d+124 for d in self.frame]
            self.cancel()
            if any(d not in PAIR_DIGITS for d in digits):
                return True,None
            n=0
            for d in digits:n=n*6+PAIR_DIGITS.index(d)
            if n>=144:return True,None
            held=127+knob in self.markers
            if held:self.marker_deadline=now+10
            i=n%12 if held else n//12
            return True,FAST_CAMERA[i] if i<len(FAST_CAMERA) and FAST_CAMERA[i] in self.ids else None
        if self.short and len(self.frame)==1:
            i=self.frame[0]
            self.cancel()
            return True,self.route(FAST_CAMERA[i],now) if 0<=i<len(FAST_CAMERA) and FAST_CAMERA[i] in self.ids else None
        if len(self.frame)!=4:
            return True,None
        index=0
        for digit in self.frame:
            index=index*11+digit
        self.cancel()
        return True,self.route(self.ids[index],now) if index<len(self.ids) else None
