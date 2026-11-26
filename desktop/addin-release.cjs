const fs=require('node:fs/promises'),crypto=require('node:crypto'),https=require('node:https');
const BASE='https://sooncheol.github.io/FusionMacroStudio/downloads/',MAX=100*1024*1024;
function tuple(v){if(typeof v!=='string'||!/^\d{1,5}(\.\d{1,5}){2}$/.test(v))throw Error('잘못된 애드인 버전');return v.split('.').map(Number)}
function compareVersion(a,b){const x=tuple(a),y=tuple(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return Math.sign(x[i]-y[i]);return 0}
function validate(info){tuple(info?.version);const file='FusionMacroStudio-Addin-Setup-'+info.version+'.zip';if(info.file!==file||typeof info.sha256!=='string'||!/^[0-9a-f]{64}$/.test(info.sha256)||!Number.isInteger(info.size)||info.size<1||info.size>MAX)throw Error('잘못된 애드인 업데이트 정보');return {version:info.version,file,sha256:info.sha256,size:info.size}}
async function fetchBytes(fetcher,name,limit){const url=BASE+name,r=await fetcher(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('애드인 서버 HTTP 오류: '+r.status);if(r.url!==url)throw Error('애드인 응답 주소 불일치');if(!r.body)throw Error('애드인 응답 본문 없음');const reader=r.body.getReader(),parts=[];let size=0;try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('애드인 다운로드 크기 초과');parts.push(Buffer.from(value))}return Buffer.concat(parts,size)}finally{await reader.cancel().catch(()=>{})}}
async function readRelease(fetcher){return validate(JSON.parse((await fetchBytes(fetcher,'latest.json',4096)).toString('utf8')))}
async function downloadRelease(fetcher,info,file){info=validate(info);const data=await fetchBytes(fetcher,info.file,info.size);if(data.length!==info.size||crypto.createHash('sha256').update(data).digest('hex')!==info.sha256)throw Error('애드인 설치 파일 검증 실패');await fs.writeFile(file,data,{flag:'wx'})}
// HTTPS does not follow redirects. Supply the verified request URL directly.
function httpsFetch(url,options={}){
 if(!url.startsWith(BASE)||!/^https:\/\/sooncheol\.github\.io\/FusionMacroStudio\/downloads\/(latest\.json|FusionMacroStudio-Addin-Setup-\d{1,5}(\.\d{1,5}){2}\.zip)$/.test(url))return Promise.reject(Error('잘못된 애드인 요청 주소'));
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{signal:options.signal,headers:{'Cache-Control':'no-cache','Accept-Encoding':'identity','User-Agent':'FusionMacroStudio'}},res=>{
   const status=res.statusCode;
   if(status!==200){res.resume();reject(Error('애드인 서버 HTTP 오류: '+status));return}
   const {Readable}=require('node:stream');
   resolve({ok:true,status,url,body:Readable.toWeb(res)});
  });
  req.on('error',reject);
 });
}
module.exports={compareVersion,validate,readRelease,downloadRelease,httpsFetch};
