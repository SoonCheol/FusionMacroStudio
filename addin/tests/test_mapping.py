import importlib.util, pathlib, unittest
spec=importlib.util.spec_from_file_location("mapping",pathlib.Path(__file__).parents[1]/"FusionMacroStudio"/"mapping.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Test(unittest.TestCase):
    def test_unique(self):
        self.assertEqual(len({m.trigger(l,s) for l in range(3) for s in m.SLOTS}),63)
    def test_press(self):
        self.assertEqual(m.resolve(("DrawPolyline",True),.1),"DrawPolyline")
        self.assertEqual(m.resolve(("DrawPolyline",True),.5),"__fms_escape__")
        self.assertEqual(m.resolve(("DrawPolyline",False),2),"DrawPolyline")
    def test_profile(self):
        p={"format":"fusion-macro-studio-v1","knobBase":16,"layers":[{"fusion":{"1":{"id":"DrawPolyline"}}},{},{}]}
        self.assertEqual(m.load_mapping(p),{(0,124):("DrawPolyline",True)})
if __name__=="__main__":unittest.main()
