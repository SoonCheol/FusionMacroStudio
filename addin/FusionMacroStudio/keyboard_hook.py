"""Windows foreground-only, mapped F13-F24 input. No global key recording."""
import ctypes as c
from ctypes import wintypes as w
import os
import threading
import time
from .mapping import PressState

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
    def __init__(self, dispatch):
        self.mapping = {}
        self.generation = 0
        self.dispatch = dispatch
        self.press = PressState()
        self.lock = threading.RLock()
        self.thread = None
        self.tid = 0
        self.ready = threading.Event()
        self.error = None
        self.callback = HOOKPROC(self._callback)
    def set_mapping(self, mapping):
        with self.lock:
            self.press.cancel()
            self.mapping = mapping
            self.generation += 1
    def tick(self):
        with self.lock:
            for cmd in self.press.tick(time.monotonic(), foreground()):
                self.dispatch(cmd, self.generation)
    def _callback(self, code, msg, data):
        try:
            if code >= 0:
                k = c.cast(data,c.POINTER(KBD)).contents
                vk = k.vkCode
                if 0x7c <= vk <= 0x87 and not k.flags & 0x10:
                    with self.lock:
                        active = foreground()
                        if not active:
                            self.press.cancel()
                        now = time.monotonic()
                        if msg in (0x100,0x104):
                            action = self.mapping.get((modifiers(),vk)) if active else None
                            if self.press.down(vk,action,now):
                                return 1
                        elif msg in (0x101,0x105):
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
