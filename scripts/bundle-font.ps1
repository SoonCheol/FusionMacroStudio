# Build-time only. The Windows editor and website load the bundled local font.
$ErrorActionPreference='Stop'
$dir=Join-Path $PSScriptRoot '../site/fonts'
New-Item -ItemType Directory -Force $dir | Out-Null
$file=Join-Path $dir 'PretendardVariable.woff2'
$url='https://raw.githubusercontent.com/orioncactus/pretendard/7aeb0698819be2b4097dae8ec8fe6a795e5cf3ae/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2'
for($attempt=1;$attempt -le 4;$attempt++){
 try{Invoke-WebRequest -Uri $url -OutFile $file -TimeoutSec 180 -ErrorAction Stop;break}
 catch{Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue;if($attempt -eq 4){throw};Start-Sleep -Seconds (3*$attempt)}
}
if((Get-Item -LiteralPath $file).Length -lt 2000000){throw 'Incomplete Pretendard font'}
$blob=(& git hash-object -- $file).Trim()
if($LASTEXITCODE -ne 0 -or $blob -ne '49c54b5152a184a243e85f7281ed338b6569987e'){throw 'Pretendard font hash mismatch'}
if(!(Test-Path -LiteralPath (Join-Path $dir 'Pretendard-LICENSE.txt'))){throw 'Missing Pretendard OFL license'}
Write-Host 'Verified bundled Pretendard Variable'
