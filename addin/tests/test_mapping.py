import importlib.util, pathlib, unittest, copy
spec=importlib.util.spec_from_file_location("mapping",pathlib.Path(__file__).parents[1]/"FusionMacroStudio"/"mapping.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def profile():
    return {"format":"fusion-macro-studio-v1","knobBase":16,"layers":[{"fusion":{"1":{"id":"DrawPolyline"}},"bindings":{"1":{"type":"key","steps":[{"mods":0,"code":104}],"delay":0}}},{"fusion":{},"bindings":{}},{"fusion":{},"bindings":{}}]}
class Test(unittest.TestCase):
    def test_unique(self):
        self.assertEqual(len({m.trigger(l,s) for l in range(3) for s in m.SLOTS}),63)
    def test_press(self):
        self.assertEqual(m.resolve(("DrawPolyline",True),.1),"DrawPolyline")
        self.assertEqual(m.resolve(("DrawPolyline",True),.5),"DrawPolyline")
        self.assertEqual(m.resolve(("DrawPolyline",True),.699),"DrawPolyline")
        self.assertEqual(m.resolve(("DrawPolyline",True),.7),"__fms_escape__")
        self.assertEqual(m.resolve(("DrawPolyline",False),2),"DrawPolyline")
    def test_profile(self):
        self.assertEqual(m.load_mapping(profile()),{(0,124):("DrawPolyline",True)})
    def test_all_layers(self):
        p=profile()
        for l in range(3):
            p["layers"][l]={"bindings":{},"fusion":{}}
            for s in m.SLOTS:
                mods,vk=m.trigger(l,s)
                p["layers"][l]["bindings"][str(s)]={"type":"key","steps":[{"mods":mods,"code":vk-20}],"delay":0}
                p["layers"][l]["fusion"][str(s)]={"id":"command_"+str(s)}
        self.assertEqual(len(m.load_mapping(p)),63)
    def test_mismatch_and_bad_profile(self):
        for value in [None,{},{"format":"fusion-macro-studio-v1","knobBase":16,"layers":[None,None,None]}]:
            with self.assertRaises(ValueError):m.load_mapping(value)
        for change in ["code","missing","reserved","bad_slot"]:
            p=profile()
            if change=="code":p["layers"][0]["bindings"]["1"]["steps"][0]["code"]=105
            elif change=="missing":p["layers"][0]["bindings"]={}
            elif change=="reserved":p["layers"][0]["fusion"]["1"]["id"]="__fms_export__"
            else:p["layers"][0]["fusion"]["13"]={"id":"wrong"}
            with self.assertRaises(ValueError):m.load_mapping(p)
    def test_press_state_once_and_repeat(self):
        p=m.PressState()
        self.assertTrue(p.down(124,("DrawPolyline",True),0))
        self.assertTrue(p.down(124,("Other",True),.1))
        self.assertEqual(p.tick(.699,True),[])
        self.assertEqual(p.tick(.7,True),["__fms_escape__"])
        self.assertEqual(p.tick(1,True),[])
        self.assertEqual(p.up(124,2,True),(True,None))
        self.assertTrue(p.down(124,("DrawPolyline",True),13))
        self.assertEqual(p.up(124,13.1,True),(True,"DrawPolyline"))
    def test_knob_and_focus_loss(self):
        p=m.PressState()
        p.down(125,("__fms_zoom_in__",False),1)
        self.assertEqual(p.tick(2,True),[])
        self.assertEqual(p.up(125,2,True),(True,"__fms_zoom_in__"))
        p.down(124,("Line",True),3)
        self.assertEqual(p.tick(3.2,False),[])
        self.assertEqual(p.up(124,4,True),(True,None))
        p.down(124,("Line",True),5)
        p.cancel()
        self.assertEqual(p.up(124,5.1,True),(True,None))
        self.assertEqual(p.up(125,6,True),(False,None))
    def test_knob_trace(self):
        t=m.KnobTrace()
        t.start()
        now=t.started
        press=m.trigger(0,17)
        left=m.trigger(0,16)
        mapping={press:("press",False),left:("left",False),m.trigger(0,1):("key",True)}
        for code,down,elapsed in [(press,True,0),(left,True,.1),(left,False,.2),(press,False,.3),(m.trigger(0,1),True,.4)]:
            t.observe(code[1],code[0],down,True,mapping,now+elapsed)
        self.assertEqual([(e["action"],e["edge"]) for e in t.snapshot()["events"]],
                         [("press","down"),("left","down"),("left","up"),("press","up")])
        t.observe(left[1],left[0],True,True,mapping,now+31)
        self.assertEqual(len(t.snapshot()["events"]),4)
    def test_camera_rate(self):
        r=m.CameraRate()
        self.assertEqual(r.step("left",0),1)
        self.assertEqual(r.step("left",.02),2.5)
        self.assertEqual(r.step("right",.03),1)
        self.assertEqual(r.step("right",.4),1)
    def test_zoom_extents(self):
        self.assertEqual(m.zoom_extents(20,10,.85),(17,8.5))
        w,h=m.zoom_extents(2e-6,1e-6,.85)
        self.assertEqual(w/h,2)
        self.assertGreaterEqual(h,1e-6)
        with self.assertRaises(ValueError):m.zoom_extents(0,1,.85)
    def test_native_command_without_is_enabled(self):
        class NativeCommand:
            def __init__(self, valid=True, accepted=True):
                self.isValid=valid
                self.accepted=accepted
                self.calls=0
            def execute(self):
                self.calls+=1
                return self.accepted
        class Definitions:
            def __init__(self, command):
                self.command=command
            def itemById(self, command):
                if command == "DrawPolyline":
                    return self.command
        for valid, accepted, expected, calls in [
            (True, True, "Command executed", 1),
            (True, False, "Command execution rejected", 1),
            (False, True, "Unavailable command", 0),
        ]:
            command=NativeCommand(valid,accepted)
            self.assertEqual(m.execute_definition(Definitions(command),"DrawPolyline"),expected)
            self.assertEqual(command.calls,calls)
        self.assertEqual(m.execute_definition(Definitions(None),"DrawPolyline"),"Unavailable command")
    def test_constrained_orbit(self):
        import math
        for up,forward in [((0,0,1),(0,1,0)),((0,1,0),(0,0,-1))]:
            self.assertEqual(m.constrained_step(forward,up,up,False,.2),(up,.2))
            axis,angle=m.constrained_step(forward,up,up,True,.2)
            self.assertAlmostEqual(m.dot_vector(axis,up),0)
            self.assertAlmostEqual(angle,.2)
            tilted=m.unit_vector(tuple(a+b for a,b in zip(forward,up)))
            projected=m.constrained_up(tilted,up,(1,0,0))
            self.assertAlmostEqual(m.dot_vector(tilted,projected),0)
            self.assertGreater(m.dot_vector(projected,up),0)
            axis,angle=m.constrained_step(tilted,projected,up,True,math.pi)
            self.assertAlmostEqual(angle,math.radians(44))
            axis,angle=m.constrained_step(up,forward,up,True,-.2)
            self.assertLess(angle,0)
            self.assertAlmostEqual(m.dot_vector(axis,up),0)
            self.assertEqual(m.constrained_step(up,forward,up,True,.2)[1],0.)
if __name__=="__main__":unittest.main()
