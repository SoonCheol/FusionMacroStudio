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

    def test_fast_camera_and_held_marker(self):
        self.d=m.DirectInput(tuple(m.FAST_CAMERA))
        idx=m.FAST_CAMERA.index("__fms_orbit_left__")
        self.assertEqual(self.tap(135,0,2),(True,None))
        self.assertEqual(self.tap(124+idx,.03),(True,"__fms_orbit_left__"))
        self.assertTrue(self.d.down(133,2,.1,True))
        self.tap(135,1.5,2)
        self.assertEqual(self.tap(124+idx,1.53,3),(True,"__fms_pan_left__"))
        self.assertEqual(self.d.up(133,1.6,True),(True,None))
        self.tap(135,1.7,2)
        self.assertEqual(self.tap(124+idx,1.73),(True,"__fms_orbit_left__"))
        self.d.down(134,2,2,True)
        self.tap(135,2.1,2)
        self.assertEqual(self.tap(124+idx,2.13),(True,"__fms_orbit_up__"))
        self.d.tick(2.2,False)
        self.d.up(134,2.3,True)
        self.tap(135,2.4,2)
        self.assertEqual(self.tap(124+idx,2.43),(True,"__fms_orbit_left__"))

    def test_held_marker_missing_release_expires(self):
        self.d=m.DirectInput(tuple(m.FAST_CAMERA))
        self.d.down(133,2,0,True)
        self.d.tick(11,True)
        self.assertFalse(self.d.markers)
        self.assertFalse(self.d.marker_edges)
        self.assertTrue(self.d.down(133,2,12,True))
        self.assertIn(133,self.d.markers)
        self.assertEqual(self.d.up(133,12.1,True),(True,None))

    def test_independent_pair_per_knob(self):
        self.d=m.DirectInput(tuple(m.FAST_CAMERA))
        normal=m.FAST_CAMERA.index("__fms_orbit_left__")
        held=m.FAST_CAMERA.index("__fms_zoom_in__")
        def pair(knob,t,mods=1):
            n=normal*12+held
            self.tap(130+knob,t,2)
            for i,d in enumerate((n//36,n//6%6,n%6)):
                result=self.tap(m.PAIR_DIGITS[d],t+.03*(i+1),mods)
            return result
        self.assertEqual(pair(0,0),(True,"__fms_orbit_left__"))
        self.d.down(127,2,.2,True)
        self.assertEqual(pair(0,.3,3),(True,"__fms_zoom_in__"))
        self.assertEqual(pair(1,.5,3),(True,"__fms_orbit_left__"))
        self.d.up(127,.7,True)
        self.assertEqual(pair(0,.8),(True,"__fms_orbit_left__"))

    def test_device_release_before_rotation_grace(self):
        self.d=m.DirectInput(tuple(m.FAST_CAMERA))
        def pair(knob,t):
            n=2*12+9
            self.tap(130+knob,t,2)
            for i,d in enumerate((n//36,n//6%6,n%6)):
                result=self.tap(m.PAIR_DIGITS[d],t+.01*(i+1))
            return result
        # Reproduce early release, then first detent, then sustained rotation.
        self.d.down(127,2,5.459,True)
        self.d.up(127,5.729,True)
        self.assertEqual(pair(0,5.76),(True,"__fms_zoom_in__"))
        self.assertEqual(self.d.last_pair_mode,"held-grace")
        self.assertEqual(pair(1,5.86),(True,"__fms_orbit_left__"))
        for t in (5.96,6.16,6.56,6.86):
            self.assertEqual(pair(0,t),(True,"__fms_zoom_in__"))
        self.assertEqual(pair(0,7.5),(True,"__fms_orbit_left__"))
        # An isolated click does not indefinitely alter later rotation.
        self.d.down(127,2,8,True);self.d.up(127,8.1,True)
        self.assertEqual(pair(0,8.6),(True,"__fms_orbit_left__"))
        self.d.down(127,2,9,True);self.d.up(127,9.1,True)
        self.d.tick(9.15,False)
        self.assertEqual(pair(0,9.2),(True,"__fms_orbit_left__"))

    def test_common_pair_physical_and_early_release(self):
        self.d=m.DirectInput(tuple(m.COMMON_CAMERA))
        normal=m.COMMON_CAMERA.index("__fms_orbit_left__")
        held=m.COMMON_CAMERA.index("__fms_zoom_in__")
        value=normal*(len(m.COMMON_CAMERA)+1)+held
        def pair(knob,t):
            self.tap(0x71,t,7)
            for i,d in enumerate(str(knob)+str(value).zfill(3)):
                result=self.tap(0x30+int(d),t+.02*(i+1),7)
            return result
        self.assertEqual(pair(0,0),(True,"__fms_orbit_left__"))
        self.assertTrue(self.d.down(0x73,7,.2,True))
        self.assertEqual(pair(0,.3),(True,"__fms_zoom_in__"))
        self.assertEqual(pair(1,.5),(True,"__fms_orbit_left__"))
        self.assertEqual(self.d.up(0x73,.7,True),(True,None))
        self.assertEqual(pair(0,.8),(True,"__fms_orbit_left__"))
        self.d.down(0x73,7,1,True)
        self.d.up(0x73,1.1,True)
        self.assertEqual(pair(0,1.2),(True,"__fms_zoom_in__"))
        self.assertEqual(pair(0,1.9),(True,"__fms_orbit_left__"))

    def test_common_prefix_required_and_mixed_frames_rejected(self):
        self.assertFalse(self.d.down(0x31,7,0,True))
        self.assertEqual(self.d.up(0x31,.01,True),(False,None))
        self.tap(0x70,.1,7)
        self.tap(0x30,.2,7)
        self.tap(135,.3,1)
        self.assertFalse(self.d.down(0x30,7,.4,True))
        self.tap(0x70,.6,7)
        for i,d in enumerate("00001"):
            result=self.tap(0x30+int(d),.7+.03*i,7)
        self.assertEqual(result,(True,"circle"))
        self.tap(0x70,1,7)
        self.d.tick(1.1,False)
        self.assertFalse(self.d.down(0x30,7,1.2,True))
