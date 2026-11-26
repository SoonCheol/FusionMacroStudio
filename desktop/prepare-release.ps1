param([Parameter(Mandatory=$true)][string]$Archive,[Parameter(Mandatory=$true)][string]$Destination,[Parameter(Mandatory=$true)][string]$ExpectedVersion)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
if ($ExpectedVersion -notmatch '^\d{1,5}(\.\d{1,5}){2}$' -or (Test-Path -LiteralPath $Destination)) { throw 'Invalid extraction request' }
$zip=[IO.Compression.ZipFile]::OpenRead($Archive)
try {
 $seen=New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
 [long]$total=0
 if ($zip.Entries.Count -gt 20000) { throw 'Too many package entries' }
 foreach ($e in $zip.Entries) {
  $name=$e.FullName
  $parts=$name.TrimEnd('/').Split('/')
  if (!$name -or $name.StartsWith('/') -or $name.Contains('\') -or $name.Contains(':') -or $parts[0] -notin @('FusionMacroStudio','Setup.cmd','setup.ps1','README.txt') -or (($e.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) { throw 'Unsafe package entry' }
  foreach($part in $parts) {
   if (!$part -or $part -eq '.' -or $part -eq '..' -or $part.EndsWith('.') -or $part.EndsWith(' ') -or $part -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)') { throw 'Unsafe package path' }
  }
  if (!$seen.Add($name.TrimEnd('/'))) { throw 'Duplicate package path' }
  $total+=$e.Length
  if ($total -gt 200MB) { throw 'Unpacked package exceeds limit' }
 }
} finally { $zip.Dispose() }
[IO.Compression.ZipFile]::ExtractToDirectory($Archive,$Destination)
Add-Type -AssemblyName System.Web.Extensions
$serializer=New-Object System.Web.Script.Serialization.JavaScriptSerializer
$manifest=$serializer.DeserializeObject((Get-Content -LiteralPath (Join-Path $Destination 'FusionMacroStudio/FusionMacroStudio.manifest') -Raw -Encoding UTF8))
if ($manifest.version -ne $ExpectedVersion -or $manifest.type -ne 'addin' -or !$manifest.runOnStartup -or !(Test-Path -LiteralPath (Join-Path $Destination 'setup.ps1') -PathType Leaf)) { throw 'Package manifest mismatch' }
