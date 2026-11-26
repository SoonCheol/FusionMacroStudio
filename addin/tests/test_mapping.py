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
        self.assertEqual(m.resolve(("DrawPolyline",True),.5),"__fms_escape__")
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
        self.assertTrue(p.down(124,("DrawPolyline",True),10))
        self.assertTrue(p.down(124,("Other",True),10.1))
        self.assertEqual(p.tick(10.49,True),[])
        self.assertEqual(p.tick(10.5,True),["__fms_escape__"])
        self.assertEqual(p.tick(11,True),[])
        self.assertEqual(p.up(124,12,True),(True,None))
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
    def test_zoom_extents(self):
        self.assertEqual(m.zoom_extents(20,10,.85),(17,8.5))
        w,h=m.zoom_extents(2e-6,1e-6,.85)
        self.assertEqual(w/h,2)
        self.assertGreaterEqual(h,1e-6)
        with self.assertRaises(ValueError):m.zoom_extents(0,1,.85)
if __name__=="__main__":unittest.main()
