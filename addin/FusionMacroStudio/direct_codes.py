"""Fixed registry decoder; independent of slot and legacy profile."""
import json
from pathlib import Path

CAPACITY = 11**4
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
    def cancel(self):
        self.frame=None
    def tick(self,now,active):
        if not active or now>self.deadline:
            self.cancel()
    def down(self,vk,mods,now,active):
        self.tick(now,active)
        if vk in self.held:
            return True
        if not active or mods!=1 or not 124<=vk<=135:
            self.cancel()
            return False
        overlap=bool(self.held)
        self.held.add(vk)
        if overlap:
            self.cancel()
        elif vk==135:
            self.frame=[]
        elif self.frame is not None:
            self.frame.append(vk-124)
        self.deadline=now+self.timeout
        # Orphan Ctrl-only symbols are reserved and never invoke a legacy command.
        return True
    def up(self,vk,now,active):
        self.tick(now,active)
        if vk not in self.held:
            return False,None
        self.held.remove(vk)
        if self.frame is None or self.held:
            return True,None
        self.deadline=now+self.timeout
        if len(self.frame)!=4:
            return True,None
        index=0
        for digit in self.frame:
            index=index*11+digit
        self.cancel()
        return True,self.ids[index] if index<len(self.ids) else None
