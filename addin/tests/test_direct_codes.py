import importlib.util,pathlib,unittest
spec=importlib.util.spec_from_file_location("direct_codes",pathlib.Path(__file__).parents[1]/"FusionMacroStudio"/"direct_codes.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class DirectTest(unittest.TestCase):
    def setUp(self):self.d=m.DirectInput(("line","circle"))
    def tap(self,vk,t,mods=1,active=True):
        self.d.down(vk,mods,t,active)
        return self.d.up(vk,t+.01,active)
    def test_valid_repeat_digits(self):
        self.assertEqual(self.tap(135,0),(True,None))
        for t in range(1,4):self.assertEqual(self.tap(124,t*.1),(True,None))
        self.assertEqual(self.tap(125,.4),(True,"circle"))
    def test_orphan_and_timeout(self):
        self.assertEqual(self.tap(124,0),(True,None))
        self.tap(135,.1)
        for t in range(4):self.assertEqual(self.tap(124,2+t*.1),(True,None))
    def test_focus_and_legacy(self):
        self.tap(135,0)
        self.d.tick(.1,False)
        for t in range(4):self.assertEqual(self.tap(124,.2+t*.1),(True,None))
        self.assertFalse(self.d.down(124,0,1,True))
        self.assertEqual(self.d.up(124,1.1,True),(False,None))
        self.assertFalse(self.d.down(135,1,2,False))
    def test_overlap_rejected(self):
        self.d.down(135,1,0,True)
        self.d.down(124,1,.1,True)
        self.d.up(135,.2,True);self.d.up(124,.3,True)
        for t in range(4):self.assertEqual(self.tap(124,.4+t*.1),(True,None))
