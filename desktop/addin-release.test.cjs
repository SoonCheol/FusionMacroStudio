const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {compareVersion,validate,readRelease,downloadRelease,httpsFetch}=require('./addin-release.cjs');
test('independent add-in release version, strict manifest and verified bytes',async()=>{
 const bytes=Buffer.from('fixture'),info={version:'0.4.3',file:'FusionMacroStudio-Addin-Setup-0.4.3.zip',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),size:bytes.length};
 assert.equal(compareVersion('0.4.10','0.4.3'),1);assert.equal(compareVersion('0.4.3','0.4.3'),0);
 assert.deepEqual(validate(info),info);assert.throws(()=>validate({...info,file:'../setup.zip'}));assert.throws(()=>validate({...info,size:0}));
 const fetcher=async(url)=>({ok:true,url,status:200,body:new Response(url.endsWith('latest.json')?JSON.stringify(info):bytes).body});
 assert.deepEqual(await readRelease(fetcher),info);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fms-release-test-'));
 try{const file=path.join(dir,'verified.zip');await downloadRelease(fetcher,info,file);assert.deepEqual(await fs.readFile(file),bytes);await assert.rejects(downloadRelease(fetcher,{...info,sha256:'0'.repeat(64)},path.join(dir,'bad.zip')))}finally{await fs.rm(dir,{recursive:true,force:true})}
});

test('reject unexpected URL and missing body distinctly from HTTP 200',async()=>{
 await assert.rejects(readRelease(async()=>({ok:true,status:200,url:'',body:new Response('{}').body})),/응답 주소 불일치/);
 await assert.rejects(readRelease(async(url)=>({ok:true,status:200,url,body:null})),/응답 본문 없음/);
 await assert.rejects(readRelease(async(url)=>({ok:false,status:404,url})),/HTTP 오류: 404/);
 await assert.rejects(httpsFetch('https://example.com/latest.json'),/잘못된 애드인 요청 주소/);
 await assert.rejects(httpsFetch('https://sooncheol.github.io/FusionMacroStudio/downloads/../latest.json'),/잘못된 애드인 요청 주소/);
});
