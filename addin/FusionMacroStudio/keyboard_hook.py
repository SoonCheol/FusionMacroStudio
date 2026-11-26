"""Windows foreground-only, mapped F13-F24 input. No global key recording."""
import ctypes as c
from ctypes import wintypes as w
import os
import threading
import time
from .mapping import PressState, KnobTrace
from .direct_codes import DirectInput, COMMON_KEYS

U = c.WinDLL("user32", use_last_error=True)
K = c.WinDLL("kernel32", use_last_error=True)
LRESULT = c.c_ssize_t
HOOKPROC = c.WINFUNCTYPE(LRESULT, c.c_int, w.WPARAM, w.LPARAM)
class KBD(c.Structure):
    _fields_ = [("vkCode", w.DWORD), ("scanCode", w.DWORD), ("flags", w.DWORD),
                ("time", w.DWORD), ("extra", c.c_size_t)]
U.SetWindowsHookExW.argtypes = [c.c_int, HOOKPROC, w.HINSTANCE, w.DWORD]
U.SetWindowsHookExW.restype = w.HANDLE
U.CallNextHookEx.argtypes = [w.HANDLE, c.c_int, w.WPARAM, w.LPARAM]
U.CallNextHookEx.restype = LRESULT
U.UnhookWindowsHookEx.argtypes = [w.HANDLE]
U.GetForegroundWindow.restype = w.HWND
U.GetWindowThreadProcessId.argtypes = [w.HWND, c.POINTER(w.DWORD)]
U.GetAsyncKeyState.argtypes = [c.c_int]
U.GetAsyncKeyState.restype = c.c_short
U.PostThreadMessageW.argtypes = [w.DWORD, w.UINT, w.WPARAM, w.LPARAM]
U.GetMessageW.argtypes = [c.POINTER(w.MSG), w.HWND, w.UINT, w.UINT]
U.PeekMessageW.argtypes = [c.POINTER(w.MSG), w.HWND, w.UINT, w.UINT, w.UINT]
K.GetCurrentThreadId.restype = w.DWORD
K.GetModuleHandleW.argtypes = [w.LPCWSTR]
K.GetModuleHandleW.restype = w.HMODULE

def foreground():
    pid = w.DWORD()
    U.GetWindowThreadProcessId(U.GetForegroundWindow(), c.byref(pid))
    return pid.value == os.getpid()
def modifiers():
    return sum(bit for bit, keys in [(1,[0x11]),(2,[0x10]),(4,[0x12]),(8,[0x5b,0x5c])]
               if any(U.GetAsyncKeyState(k) & 0x8000 for k in keys))

class Hook:
    def __init__(self, dispatch, codes=()):
        self.mapping = {}
        self.generation = 0
        self.dispatch = dispatch
        self.press = PressState()
        self.direct = DirectInput(codes)
        self.trace = KnobTrace()
        self.lock = threading.RLock()
        self.thread = None
        self.tid = 0
        self.ready = threading.Event()
        self.error = None
        self.callback = HOOKPROC(self._callback)
    def set_mapping(self, mapping):
        with self.lock:
            self.press.cancel()
            self.direct.reset()
            self.mapping = mapping
            self.generation += 1
    def tick(self):
        with self.lock:
            now, active = time.monotonic(), foreground()
            self.direct.tick(now, active)
            for cmd in self.press.tick(now, active):
                self.dispatch(cmd, self.generation)
    def _callback(self, code, msg, data):
        try:
            if code >= 0:
                k = c.cast(data,c.POINTER(KBD)).contents
                vk = k.vkCode
                if msg in (0x100,0x104) and not 0x7c <= vk <= 0x87 and vk not in COMMON_KEYS and vk not in (0x10,0x11,0x12,0x5b,0x5c,0xa0,0xa1,0xa2,0xa3,0xa4,0xa5):
                    with self.lock:
                        self.direct.cancel()
                if (0x7c <= vk <= 0x87 or vk in COMMON_KEYS) and not k.flags & 0x10:
                    with self.lock:
                        active = foreground()
                        if not active:
                            self.press.cancel()
                        now = time.monotonic()
                        if msg in (0x100,0x104):
                            mods = modifiers() if active else 0
                            marker_vk=self.direct.marker_key(vk)
                            marker_before=marker_vk in self.direct.marker_edges
                            if self.direct.down(vk,mods,now,active):
                                if not marker_before and marker_vk in self.direct.markers:
                                    self.trace.direct_event(self.direct.markers[marker_vk],'down',active,now)
                                return 1
                            if vk in COMMON_KEYS:
                                return U.CallNextHookEx(None,code,msg,data)
                            self.trace.observe(vk,mods,True,active,self.mapping,now)
                            action = self.mapping.get((mods,vk)) if active else None
                            if self.press.down(vk,action,now):
                                return 1
                        elif msg in (0x101,0x105):
                            marker=self.direct.markers.get(self.direct.marker_key(vk))
                            consume, cmd = self.direct.up(vk,now,active)
                            if consume:
                                if marker:
                                    self.trace.direct_event(marker,'up',active,now)
                                if cmd:
                                    if cmd.startswith('__fms_'):
                                        self.trace.direct_event(cmd,'decoded'+(' · '+self.direct.last_pair_mode if self.direct.last_pair_mode else ''),active,now)
                                    self.dispatch(cmd,self.generation)
                                return 1
                            if vk in COMMON_KEYS:
                                return U.CallNextHookEx(None,code,msg,data)
                            self.trace.observe(vk,0,False,active,self.mapping,now)
                            consume, cmd = self.press.up(vk,now,active)
                            if cmd:
                                self.dispatch(cmd,self.generation)
                            if consume:
                                return 1
        except Exception:
            pass
        return U.CallNextHookEx(None,code,msg,data)
    def _run(self):
        handle = None
        try:
            self.tid = K.GetCurrentThreadId()
            msg = w.MSG()
            U.PeekMessageW(c.byref(msg),None,0,0,0)
            handle = U.SetWindowsHookExW(13,self.callback,K.GetModuleHandleW(None),0)
            if not handle:
                raise c.WinError(c.get_last_error())
            self.ready.set()
            while U.GetMessageW(c.byref(msg),None,0,0) > 0:
                U.TranslateMessage(c.byref(msg))
                U.DispatchMessageW(c.byref(msg))
        except Exception as exc:
            self.error = str(exc)
        finally:
            self.ready.set()
            if handle:
                U.UnhookWindowsHookEx(handle)
            with self.lock:
                self.press.held.clear()
    def start(self):
        self.thread = threading.Thread(target=self._run,daemon=True)
        self.thread.start()
        if not self.ready.wait(3) or self.error:
            self.stop()
            raise RuntimeError(self.error or "Keyboard hook timeout")
    def stop(self):
        if self.tid:
            U.PostThreadMessageW(self.tid,0x12,0,0)
        if self.thread:
            self.thread.join(2)
