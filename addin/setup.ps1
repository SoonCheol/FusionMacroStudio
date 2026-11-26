# FusionMacroStudio only. No admin rights required. Keep other add-ins intact.
param([switch]$SelfTest)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$homeDir = Join-Path $env:LOCALAPPDATA 'FusionMacroStudio'
$source = Join-Path $PSScriptRoot 'FusionMacroStudio'
$packageVersion = '0.3.14'
$required = @('FusionMacroStudio.py','FusionMacroStudio.manifest','mapping.py','keyboard_hook.py','local_editor.py')
$roots = @('Autodesk\Autodesk Fusion\API\AddIns','Autodesk\Autodesk Fusion 360\API\AddIns') | ForEach-Object { Join-Path $env:APPDATA $_ }
function Read-Manifest([string]$path) {
    # Fusion uses an empty string for the default localized description.
    # Windows PowerShell 5.1 cannot convert that key to a PSCustomObject.
    Add-Type -AssemblyName System.Web.Extensions
    $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
    $result = $serializer.DeserializeObject((Get-Content -LiteralPath $path -Raw -Encoding UTF8))
    return ,$result
}
function Get-Target {
    $existing = @($roots | Where-Object { Test-Path (Join-Path $_ 'FusionMacroStudio') })
    if ($existing.Count -eq 1) { return (Join-Path $existing[0] 'FusionMacroStudio') }
    $ready = @($roots | Where-Object { Test-Path $_ -PathType Container })
    if ($existing.Count -gt 1 -or $ready.Count -ne 1) { throw 'Fusion add-in folder is missing or ambiguous. Start Fusion once and close it.' }
    return (Join-Path $ready[0] 'FusionMacroStudio')
}
function Assert-Closed { if (Get-Process -Name 'Fusion360','Fusion' -ErrorAction SilentlyContinue) { throw 'Close Fusion before installing or removing the add-in.' } }
function Assert-Profile($p) {
    if ($null -eq $p -or $p.format -ne 'fusion-macro-studio-v1' -or $p.knobBase -ne 16 -or @($p.layers).Count -ne 3) { throw 'Not a Fusion Macro Studio profile.' }
    $slots = @(1..12) + @(16..24)
    $modifiers = @(0,3,5,6,7,2)
    for ($layer=0; $layer -lt 3; $layer++) {
        $l = $p.layers[$layer]
        if ($null -eq $l -or $null -eq $l.fusion -or $null -eq $l.bindings -or $l.fusion -isnot [pscustomobject] -or $l.bindings -isnot [pscustomobject]) { throw 'Invalid layer structure.' }
        foreach ($entry in $l.fusion.PSObject.Properties) {
            $slot = 0
            if (![int]::TryParse($entry.Name,[ref]$slot) -or $entry.Name -ne [string]$slot -or $slots -notcontains $slot) { throw 'Invalid mapped slot.' }
            $id = $entry.Value.id
            if ($id -isnot [string] -or [string]::IsNullOrWhiteSpace($id) -or $id.Length -gt 256 -or $id -in @('__fms_escape__','__fms_export__')) { throw 'Invalid command ID.' }
            $i = $layer*21 + [array]::IndexOf($slots,$slot)
            $mods = $modifiers[[int][Math]::Floor($i/12)]
            $code = 104 + ($i % 12)
            $binding = $l.bindings.PSObject.Properties[$entry.Name].Value
            if ($null -eq $binding -or $binding.type -ne 'key' -or $null -eq $binding.delay -or $binding.delay -ne 0 -or @($binding.steps).Count -ne 1 -or $null -eq $binding.steps[0].mods -or $binding.steps[0].mods -ne $mods -or $binding.steps[0].code -ne $code) { throw "Trigger mismatch: layer $($layer+1), slot $slot." }
        }
    }
}
function Save-ProfileFile([string]$file,[string]$folder) {
    $target = Join-Path $folder 'profile.json'
    $temp = Join-Path $folder ('profile.' + [Guid]::NewGuid().ToString('N') + '.tmp')
    try {
        Copy-Item -LiteralPath $file -Destination $temp -Force
        if (Test-Path -LiteralPath $target) {
            $backup = Join-Path $folder 'profile.previous.json'
            [IO.File]::Replace($temp,$target,$backup)
        } else { Move-Item -LiteralPath $temp -Destination $target }
    } finally {
        if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force }
    }
}
function Install-Package {
    Assert-Closed
    $target = Get-Target
    foreach ($name in $required) { if (!(Test-Path -LiteralPath (Join-Path $source $name) -PathType Leaf)) { throw "Missing package: $name" } }
    if (!(Test-Path -LiteralPath (Join-Path $source 'web/index.html') -PathType Leaf)) { throw 'Missing local editor assets.' }
    $m = Read-Manifest (Join-Path $source 'FusionMacroStudio.manifest')
    if ($m.version -ne $packageVersion -or $m.type -ne 'addin' -or !$m.runOnStartup) { throw 'Package manifest mismatch.' }
    # Stage outside AddIns to prevent discovery of an incomplete package.
    $parent = Split-Path (Split-Path $target -Parent) -Parent
    $token = [Guid]::NewGuid().ToString('N')
    $stage = Join-Path $parent "FusionMacroStudio.stage.$token"
    $old = Join-Path $parent "FusionMacroStudio.previous.$token"
    $moved = $false
    try {
        if (Test-Path -LiteralPath $target) {
            $item = Get-Item -LiteralPath $target -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing to replace a redirected add-in folder.' }
            Copy-Item -LiteralPath $target -Destination $stage -Recurse -Force
        } else { New-Item -ItemType Directory -Path $stage | Out-Null }
        foreach ($name in $required) { Copy-Item -LiteralPath (Join-Path $source $name) -Destination (Join-Path $stage $name) -Force }
        $stageWeb = Join-Path $stage 'web'
        if (Test-Path -LiteralPath $stageWeb) { Remove-Item -LiteralPath $stageWeb -Recurse -Force }
        Copy-Item -LiteralPath (Join-Path $source 'web') -Destination $stageWeb -Recurse -Force
        Assert-Closed
        if (Test-Path -LiteralPath $target) { Move-Item -LiteralPath $target -Destination $old; $moved=$true }
        Move-Item -LiteralPath $stage -Destination $target
    } catch {
        if ($moved -and !(Test-Path -LiteralPath $target) -and (Test-Path -LiteralPath $old)) { Move-Item -LiteralPath $old -Destination $target }
        throw
    } finally {
        if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
    }
    # Keep the previous version as a private local backup, outside AddIns.
    if ($moved) { Write-Host "Previous add-in: $old" }
}
if ($SelfTest) {
    # Test only inside a disposable folder, never in the actual Fusion directory.
    $testRoot = Join-Path ([IO.Path]::GetTempPath()) ('FMS-test-' + [Guid]::NewGuid().ToString('N'))
    try {
        $roots = @(Join-Path $testRoot 'API\AddIns')
        New-Item -ItemType Directory -Path $roots[0] -Force | Out-Null
        $neighbor = Join-Path $roots[0] 'OtherAddin'
        New-Item -ItemType Directory -Path $neighbor | Out-Null
        $manifest = Read-Manifest (Join-Path $source 'FusionMacroStudio.manifest')
        if ($manifest.version -ne $packageVersion -or !$manifest.description.ContainsKey('')) { throw 'Manifest self-test failed.' }
        Install-Package
        $target = Get-Target
        foreach ($name in $required) { if (!(Test-Path -LiteralPath (Join-Path $target $name) -PathType Leaf)) { throw 'Install self-test failed.' } }
        if ((Read-Manifest (Join-Path $target 'FusionMacroStudio.manifest')).version -ne $packageVersion) { throw 'Installed manifest self-test failed.' }
        Install-Package
        if (!(Test-Path -LiteralPath $neighbor) -or !(Test-Path -LiteralPath $target)) { throw 'Update self-test failed.' }
        $previous = @(Get-ChildItem -LiteralPath (Split-Path $roots[0] -Parent) -Directory -Filter 'FusionMacroStudio.previous.*')
        if ($previous.Count -ne 1) { throw 'Update backup self-test failed.' }
        if (!(Test-Path -LiteralPath (Join-Path $target 'web/index.html'))) { throw 'Local editor install test failed.' }
        $sample = Join-Path $testRoot 'sample.json'
        Set-Content -LiteralPath $sample -Value '{"test":1}'
        Save-ProfileFile $sample $testRoot
        Set-Content -LiteralPath $sample -Value '{"test":2}'
        Save-ProfileFile $sample $testRoot
        Set-Content -LiteralPath $sample -Value '{"test":3}'
        Save-ProfileFile $sample $testRoot
        if ((Get-Content -LiteralPath (Join-Path $testRoot 'profile.json') -Raw | ConvertFrom-Json).test -ne 3 -or (Get-Content -LiteralPath (Join-Path $testRoot 'profile.previous.json') -Raw | ConvertFrom-Json).test -ne 2) { throw 'Profile replacement test failed.' }
        Write-Host 'Windows installer self-test passed: manifest, install, update, backup, neighbor preservation.'
    } finally {
        if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
    }
    return
}
New-Item -ItemType Directory -Path $homeDir -Force | Out-Null
$form = New-Object Windows.Forms.Form
$form.Text = 'Fusion Macro Studio Add-in Setup ' + $packageVersion
$form.Width = 520; $form.Height = 539; $form.StartPosition='CenterScreen'
$form.FormBorderStyle='FixedDialog'; $form.MaximizeBox=$false
$form.Font = New-Object Drawing.Font('Segoe UI',10)
$dark = $false
try { $dark = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize').AppsUseLightTheme -eq 0 } catch {}
$label = New-Object Windows.Forms.Label
$label.SetBounds(20,18,470,58); $label.Text='FusionMacroStudio independent add-in. Install, start Fusion, then open the local editor. Write to sync automatically.'
$form.Controls.Add($label)
$status = New-Object Windows.Forms.Label
$status.SetBounds(20,382,470,105); $form.Controls.Add($status)
function Refresh-Status {
    try {
        $path = Get-Target
        $installed = if (Test-Path (Join-Path $path 'FusionMacroStudio.manifest')) { (Read-Manifest (Join-Path $path 'FusionMacroStudio.manifest')).version } else { 'Not installed' }
        $s = if (Test-Path (Join-Path $homeDir 'status.json')) { Get-Content (Join-Path $homeDir 'status.json') -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
        $age = if ($s) { [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - [double]$s.time } else { 999 }
        $live = $s -and $s.state -eq 'running' -and $age -ge -2 -and $age -lt 12 -and (Get-Process -Id $s.pid -ErrorAction SilentlyContinue)
        $profileStatus = if ($live) { "$($s.profile) / $($s.mapped) mappings" } elseif (Test-Path (Join-Path $homeDir 'profile.json')) { 'Saved; not verified by running add-in' } else { 'Missing' }
        $exportState = if (Test-Path (Join-Path $homeDir 'export-status.json')) { Get-Content (Join-Path $homeDir 'export-status.json') -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
        $exportText = if (Test-Path (Join-Path $homeDir 'export.request')) { 'Requested' } elseif ($exportState -and $exportState.state -eq 'completed') { "Completed: $($exportState.commands) commands / $($exportState.local_pngs) local PNGs" } elseif ($exportState) { $exportState.state } else { 'Not requested' }
        $status.Text = "Installed: $installed   Running: $live" + [Environment]::NewLine + "Profile: $profileStatus" + [Environment]::NewLine + "Export: $exportText"
        if ($live -and $s.profile_error) { $status.Text += [Environment]::NewLine + $s.profile_error }
    } catch { $status.Text = $_.Exception.Message }
}
function Add-Action($text,$y,$action) {
    $b = New-Object Windows.Forms.Button
    $b.SetBounds(20,$y,460,36); $b.Text=$text
    $b.Add_Click({ try { & $action; Refresh-Status } catch { [Windows.Forms.MessageBox]::Show(($_.Exception.Message + [Environment]::NewLine + $_.ScriptStackTrace),'Fusion Macro Studio') | Out-Null } }.GetNewClosure())
    $form.Controls.Add($b)
}
Add-Action 'Install / update add-in' 80 {
    Install-Package
    [Windows.Forms.MessageBox]::Show('Installed. Start Fusion; the add-in is configured to run on startup.') | Out-Null
}
Add-Action 'Import Fusion Macro Studio profile JSON' 124 {
    $d = New-Object Windows.Forms.OpenFileDialog
    $d.Filter='JSON profile (*.json)|*.json'
    if ($d.ShowDialog() -ne 'OK') { return }
    if ((Get-Item -LiteralPath $d.FileName).Length -gt 8MB) { throw 'Profile too large.' }
    $p = Get-Content -LiteralPath $d.FileName -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Profile $p
    $target = Join-Path $homeDir 'profile.json'
    Save-ProfileFile $d.FileName $homeDir
}
Add-Action 'Export Fusion command list / local icons' 168 {
    $s = if (Test-Path (Join-Path $homeDir 'status.json')) { Get-Content (Join-Path $homeDir 'status.json') -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
    if (!$s -or $s.state -ne 'running' -or ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - [double]$s.time) -ge 12 -or !(Get-Process -Id $s.pid -ErrorAction SilentlyContinue)) { throw 'Start Fusion and the add-in before requesting export.' }
    New-Item -Path (Join-Path $homeDir 'export.request') -ItemType File -Force | Out-Null
    [Windows.Forms.MessageBox]::Show('Export requested. Fusion and the add-in must be running. Open the local data folder when complete.') | Out-Null
}
Add-Action 'Open local data folder' 212 { Start-Process explorer.exe $homeDir }
Add-Action 'Open local editor (automatic sync)' 256 { Start-Process 'http://127.0.0.1:18472/' }
Add-Action 'Uninstall add-in (keep profile)' 300 {
    Assert-Closed
    $target = Get-Target
    if (Test-Path $target) {
        if ([Windows.Forms.MessageBox]::Show('Remove only FusionMacroStudio add-in? Profile is kept.','Confirm','YesNo') -ne 'Yes') { return }
        Remove-Item -LiteralPath $target -Recurse -Force
    }
}
function Set-Theme {
    if ($dark) { $form.BackColor=[Drawing.Color]::FromArgb(25,35,48); $form.ForeColor=[Drawing.Color]::WhiteSmoke; $bg=[Drawing.Color]::FromArgb(42,57,73) }
    else { $form.BackColor=[Drawing.Color]::WhiteSmoke; $form.ForeColor=[Drawing.Color]::FromArgb(24,40,56); $bg=[Drawing.Color]::White }
    foreach ($c in $form.Controls) { $c.ForeColor=$form.ForeColor; if ($c -is [Windows.Forms.Button]) { $c.FlatStyle='Flat';$c.BackColor=$bg } }
}
$toggle=New-Object Windows.Forms.Button
$toggle.SetBounds(20,344,460,30);$toggle.Text='Light / dark'
$toggle.Add_Click({ $script:dark = -not $script:dark; Set-Theme })
$form.Controls.Add($toggle)
Set-Theme
$timer=New-Object Windows.Forms.Timer
$timer.Interval=3000; $timer.Add_Tick({Refresh-Status});$timer.Start()
Refresh-Status
[void]$form.ShowDialog()
$timer.Stop()
