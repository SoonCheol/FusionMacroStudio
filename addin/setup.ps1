# FusionMacroStudio only. No admin rights required. Keep other add-ins intact.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$homeDir = Join-Path $env:LOCALAPPDATA 'FusionMacroStudio'
$source = Join-Path $PSScriptRoot 'FusionMacroStudio'
$roots = @('Autodesk\Autodesk Fusion\API\AddIns','Autodesk\Autodesk Fusion 360\API\AddIns') | ForEach-Object { Join-Path $env:APPDATA $_ }
function Get-Target {
    $existing = @($roots | Where-Object { Test-Path (Join-Path $_ 'FusionMacroStudio') })
    if ($existing.Count -eq 1) { return (Join-Path $existing[0] 'FusionMacroStudio') }
    $ready = @($roots | Where-Object { Test-Path $_ -PathType Container })
    if ($existing.Count -gt 1 -or $ready.Count -ne 1) { throw 'Fusion add-in folder is missing or ambiguous. Start Fusion once and close it.' }
    return (Join-Path $ready[0] 'FusionMacroStudio')
}
function Assert-Closed { if (Get-Process -Name 'Fusion360','Fusion' -ErrorAction SilentlyContinue) { throw 'Close Fusion before installing or removing the add-in.' } }
New-Item -ItemType Directory -Path $homeDir -Force | Out-Null
$form = New-Object Windows.Forms.Form
$form.Text = 'Fusion Macro Studio Add-in Setup 0.2.0'
$form.Width = 520; $form.Height = 460; $form.StartPosition='CenterScreen'
$form.FormBorderStyle='FixedDialog'; $form.MaximizeBox=$false
$form.Font = New-Object Drawing.Font('Segoe UI',10)
$dark = $false
try { $dark = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize').AppsUseLightTheme -eq 0 } catch {}
$label = New-Object Windows.Forms.Label
$label.SetBounds(20,18,470,58); $label.Text='FusionMacroStudio independent add-in. Install, import your web profile, then start Fusion.'
$form.Controls.Add($label)
$status = New-Object Windows.Forms.Label
$status.SetBounds(20,338,470,65); $form.Controls.Add($status)
function Refresh-Status {
    try {
        $path = Get-Target
        $installed = Test-Path (Join-Path $path 'FusionMacroStudio.manifest')
        $s = if (Test-Path (Join-Path $homeDir 'status.json')) { Get-Content (Join-Path $homeDir 'status.json') -Raw | ConvertFrom-Json } else { $null }
        $live = $s -and $s.state -eq 'running' -and ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - [double]$s.time) -lt 12
        $status.Text = "Installed: $installed   Running: $live   Profile: $(Test-Path (Join-Path $homeDir 'profile.json'))"
    } catch { $status.Text = $_.Exception.Message }
}
function Add-Action($text,$y,$action) {
    $b = New-Object Windows.Forms.Button
    $b.SetBounds(20,$y,460,36); $b.Text=$text
    $b.Add_Click({ try { & $action; Refresh-Status } catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message,'Fusion Macro Studio') | Out-Null } }.GetNewClosure())
    $form.Controls.Add($b)
}
Add-Action 'Install / update add-in' 80 {
    Assert-Closed
    $target = Get-Target
    foreach ($name in @('FusionMacroStudio.py','FusionMacroStudio.manifest','mapping.py','keyboard_hook.py')) { if (!(Test-Path (Join-Path $source $name))) { throw "Missing package: $name" } }
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Get-ChildItem $source -File | Copy-Item -Destination $target -Force
    [Windows.Forms.MessageBox]::Show('Installed. Start Fusion; the add-in is configured to run on startup.') | Out-Null
}
Add-Action 'Import Fusion Macro Studio profile JSON' 124 {
    $d = New-Object Windows.Forms.OpenFileDialog
    $d.Filter='JSON profile (*.json)|*.json'
    if ($d.ShowDialog() -ne 'OK') { return }
    $p = Get-Content -LiteralPath $d.FileName -Raw | ConvertFrom-Json
    if ($p.format -ne 'fusion-macro-studio-v1' -or $p.knobBase -ne 16 -or $p.layers.Count -ne 3) { throw 'Not a Fusion Macro Studio profile.' }
    $target = Join-Path $homeDir 'profile.json'
    if (Test-Path $target) { Copy-Item $target (Join-Path $homeDir 'profile.previous.json') -Force }
    $temp = Join-Path $homeDir 'profile.tmp'
    Copy-Item -LiteralPath $d.FileName -Destination $temp -Force
    if (Test-Path $target) { [IO.File]::Replace($temp,$target,$null) } else { Move-Item $temp $target }
}
Add-Action 'Export Fusion command list / local icons' 168 {
    New-Item -Path (Join-Path $homeDir 'export.request') -ItemType File -Force | Out-Null
    [Windows.Forms.MessageBox]::Show('Export requested. Fusion and the add-in must be running. Open the local data folder when complete.') | Out-Null
}
Add-Action 'Open local data folder' 212 { Start-Process explorer.exe $homeDir }
Add-Action 'Uninstall add-in (keep profile)' 256 {
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
$toggle.SetBounds(20,300,460,30);$toggle.Text='Light / dark'
$toggle.Add_Click({ $script:dark = -not $script:dark; Set-Theme })
$form.Controls.Add($toggle)
Set-Theme
$timer=New-Object Windows.Forms.Timer
$timer.Interval=3000; $timer.Add_Tick({Refresh-Status});$timer.Start()
Refresh-Status
[void]$form.ShowDialog()
$timer.Stop()
