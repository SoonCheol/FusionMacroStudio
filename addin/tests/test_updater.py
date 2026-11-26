import hashlib,io,json,pathlib,sys,tempfile,unittest,zipfile
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parents[1]))
from FusionMacroStudio.updater import Updater, release_info, unpack, version_tuple

class UpdateTest(unittest.TestCase):
    def package(self,extra=None):
        out=io.BytesIO()
        with zipfile.ZipFile(out,'w') as z:
            z.writestr('FusionMacroStudio/FusionMacroStudio.manifest',json.dumps(dict(version='0.3.22',type='addin',runOnStartup=True)))
            z.writestr('setup.ps1','test')
            if extra:z.writestr(extra,'bad')
        raw=out.getvalue()
        info=dict(version='0.3.22',file='FusionMacroStudio-Addin-Setup-0.3.22.zip',sha256=hashlib.sha256(raw).hexdigest(),size=len(raw))
        return raw,info
    def test_metadata(self):
        raw,info=self.package()
        self.assertGreater(version_tuple('0.3.100'),version_tuple('0.3.22'))
        self.assertEqual(release_info(json.dumps(info)),info)
        for bad in ('https://evil.example/a.zip','../setup.zip'):
            with self.assertRaises(ValueError):release_info(json.dumps(dict(info,file=bad)))
    def test_package_verification(self):
        raw,info=self.package()
        with tempfile.TemporaryDirectory() as d:
            path=pathlib.Path(d)
            unpack(raw,path,info)
            self.assertTrue((path/'setup.ps1').is_file())
            with self.assertRaises(ValueError):unpack(raw+b'x',path,info)
            bad,meta=self.package('../outside')
            with self.assertRaises(ValueError):unpack(bad,path,meta)
            self.assertFalse((path.parent/'outside').exists())
    def test_newer_only(self):
        raw,info=self.package()
        with tempfile.TemporaryDirectory() as d,patch('FusionMacroStudio.updater.fetch',return_value=json.dumps(info).encode()):
            u=Updater(d,'0.3.21');u.check()
            self.assertEqual(u.snapshot()['state'],'available')
            u=Updater(d,'0.3.22');u.check()
            self.assertEqual(u.snapshot()['state'],'current')
            with self.assertRaises(ValueError):u.request('install')
