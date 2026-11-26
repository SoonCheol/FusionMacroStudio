import json, pathlib, sys, tempfile, unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))
from FusionMacroStudio.local_editor import start_editor, stop_editor

class LocalEditorTest(unittest.TestCase):
    def test_profile_sync_and_access(self):
        with tempfile.TemporaryDirectory() as temp:
            home=pathlib.Path(temp)
            web=pathlib.Path(__file__).parents[2]/"site"
            class FakeUpdater:
                def snapshot(self):return {'current':'0.3.21','state':'idle'}
                def request(self,action):return {'action':action}
            server, thread=start_editor(home,web,0,updater=FakeUpdater())
            origin="http://127.0.0.1:%s"%server.server_port
            try:
                def request(path, body=None, header=None):
                    headers={"X-FMS-Local":"1","Origin":origin}
                    if body is not None:headers["Content-Type"]="application/json"
                    headers.update(header or {})
                    with urlopen(Request(origin+path,data=json.dumps(body).encode() if body is not None else None,headers=headers),timeout=5) as response:
                        return json.load(response)
                self.assertEqual(request("/api/update")["current"],"0.3.21")
                self.assertEqual(request("/api/update",{"action":"check"})["action"],"check")
                self.assertEqual(request("/api/update",{"action":"install"})["action"],"install")
                for body,headers,code in [({"action":"install","url":"https://example.com"},{},400),({"action":"install"},{"Origin":"https://example.com"},403),({"action":"install"},{"X-FMS-Local":"0"},403)]:
                    with self.assertRaises(HTTPError) as error:request("/api/update",body,headers)
                    self.assertEqual(error.exception.code,code)
                initial=request("/api/profile")
                self.assertIsNone(initial["profile"])
                profile={"format":"fusion-macro-studio-v1","knobBase":16,"layers":[{"fusion":{"1":{"id":"DrawPolyline"}},"bindings":{"1":{"type":"key","steps":[{"mods":0,"code":104}],"delay":0}}},{"fusion":{},"bindings":{}},{"fusion":{},"bindings":{}}]}
                saved=request("/api/profile",{"profile":profile,"revision":initial["revision"]})
                self.assertEqual(saved["mapped"],1)
                self.assertEqual(request("/api/profile")["profile"],profile)
                profile["layers"][0]["fusion"]["1"]["id"]="SketchMidpointLine"
                updated=request("/api/profile",{"profile":profile,"revision":saved["revision"]})
                self.assertNotEqual(updated["revision"],saved["revision"])
                self.assertEqual(json.loads((home/"profile.previous.json").read_text())["layers"][0]["fusion"]["1"]["id"],"DrawPolyline")
                for body, headers, code in [
                    ({"profile":profile,"revision":""},{},409),
                    ({"profile":{},"revision":updated["revision"]},{},400),
                    ({"profile":profile,"revision":updated["revision"]},{"Origin":"https://example.com"},403),
                    (None,{"X-FMS-Local":"0"},403),
                    (None,{"Host":"evil.example"},403),
                ]:
                    with self.assertRaises(HTTPError) as error:request("/api/profile",body,headers)
                    self.assertEqual(error.exception.code,code)
                self.assertEqual(request("/api/profile")["revision"],updated["revision"])
                with urlopen(origin+"/",timeout=5) as response:self.assertIn(b"Fusion Macro Studio",response.read())
            finally:stop_editor(server,thread)
