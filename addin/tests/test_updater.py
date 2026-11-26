import hashlib,io,json,pathlib,sys,tempfile,unittest,zipfile
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parents[1]))
from FusionMacroStudio.updater import Updater, release_info, unpack, version_tuple, cached_package, retain_packages

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

    def test_cache_reuse_and_retention(self):
        raw,info=self.package()
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            calls=[]
            progress=[]
            def fetcher(name,size,cb):
                calls.append(name)
                cb(50)
                return raw
            self.assertEqual(cached_package(root,info,progress.append,fetcher),raw)
            self.assertEqual(cached_package(root,info,progress.append,fetcher),raw)
            self.assertEqual(len(calls),1)
            self.assertEqual(progress,[50,100,100])
            for v in ("0.3.9","0.3.20","0.3.21","0.3.23"):
                (root/f"FusionMacroStudio-Addin-Setup-{v}.zip").write_bytes(b"old")
            (root/"notes.txt").write_text("keep")
            retain_packages(root,"0.3.22")
            self.assertEqual(sorted(p.name for p in root.iterdir()),["FusionMacroStudio-Addin-Setup-0.3.21.zip","FusionMacroStudio-Addin-Setup-0.3.22.zip","FusionMacroStudio-Addin-Setup-0.3.23.zip","notes.txt"])
            with self.assertRaises(ValueError):
                cached_package(root,dict(info,sha256="0"*64),progress.append,fetcher)
            self.assertEqual((root/info["file"]).read_bytes(),raw)

    def test_download_requires_separate_install_confirmation(self):
        raw,info=self.package()
        with tempfile.TemporaryDirectory() as d:
            u=Updater(d,"0.3.21")
            u.info=info
            u.state="available"
            with self.assertRaises(ValueError):u.request("install")
            with patch("FusionMacroStudio.updater.fetch",return_value=raw):
                u.download()
            self.assertEqual(u.snapshot()["state"],"ready")
            self.assertEqual(u.snapshot()["progress"],100)
            self.assertIsNone(u.process)

    def test_close_requires_ready_and_approval(self):
        source=(pathlib.Path(__file__).parents[1]/"setup.ps1").read_text(encoding="utf-8-sig")
        auto=source[source.index("if ($AutomaticUpdate) {"):source.index("if ($SelfTest) {")]
        self.assertLess(auto.index("installer.ready"),auto.index("installer.go"))
        self.assertLess(auto.index("installer.go"),auto.index("CloseMainWindow()"))
        self.assertLess(auto.index("CloseMainWindow()"),auto.index("Install-Package"))
        self.assertNotIn("Stop-Process",auto)
