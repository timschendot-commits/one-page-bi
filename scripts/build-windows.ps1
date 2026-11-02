param([string]$OutputDirectory='release')
$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (!(Test-Path 'dist/app.js')) {throw 'Build the UI with pnpm build first.'}
$version='1.0.3537.50'
$hash='5EA526BBD728ADDA0DA4D31219267E96460494A427E4894C4E09D9F320F4B9AA'
$cache=New-Item -ItemType Directory -Force .cache
$pkg=Join-Path $cache.FullName 'webview2.nupkg'
if (!(Test-Path $pkg)) {Invoke-WebRequest -UseBasicParsing "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$version/microsoft.web.webview2.$version.nupkg" -OutFile $pkg}
$sha=[Security.Cryptography.SHA256]::Create()
try {$actual=[BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($pkg))).Replace('-','')} finally {$sha.Dispose()}
if ($actual -ne $hash){throw 'WebView2 SDK hash mismatch.'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$release=New-Item -ItemType Directory -Force -Path $OutputDirectory
$licenses=New-Item -ItemType Directory -Force -Path (Join-Path $release.FullName 'licenses')
$zip=[IO.Compression.ZipFile]::OpenRead($pkg)
try {
  foreach($entry in @('lib/net462/Microsoft.Web.WebView2.Core.dll','lib/net462/Microsoft.Web.WebView2.WinForms.dll','runtimes/win-x64/native/WebView2Loader.dll')){
    [IO.Compression.ZipFileExtensions]::ExtractToFile($zip.GetEntry($entry),(Join-Path $release.FullName (Split-Path -Leaf $entry)),$true)
  }
  foreach($file in @('LICENSE.txt','NOTICE.txt')){
    [IO.Compression.ZipFileExtensions]::ExtractToFile($zip.GetEntry($file),(Join-Path $licenses.FullName "WebView2-$file"),$true)
  }
}finally{$zip.Dispose()}
foreach($lib in @('react','react-dom','scheduler','xlsx','csv-parse','sql.js')){
  $module="node_modules/$lib"
  if($lib -eq 'scheduler'){$module=node -p "require('path').dirname(require.resolve('scheduler/package.json',{paths:[require.resolve('react-dom')]}))"}
  $license=Get-ChildItem -Path $module -Filter 'LICENSE*' -File | Select-Object -First 1
  if(!$license){throw "Missing license for $lib"}
  Copy-Item -LiteralPath $license.FullName -Destination (Join-Path $licenses.FullName "$lib.txt") -Force
}
$csc="$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /nologo /target:winexe /platform:x64 /optimize+ /codepage:65001 /win32manifest:native\app.manifest /win32icon:native\app.ico "/out:$($release.FullName)\OnePageBI.exe" "/r:$($release.FullName)\Microsoft.Web.WebView2.Core.dll" "/r:$($release.FullName)\Microsoft.Web.WebView2.WinForms.dll" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll /r:System.IO.Compression.dll native\Program.cs native\Archive.cs
if($LASTEXITCODE -ne 0){throw 'Desktop compilation failed.'}
$ui=New-Item -ItemType Directory -Force -Path (Join-Path $release.FullName 'ui')
$examples=New-Item -ItemType Directory -Force -Path (Join-Path $release.FullName 'examples')
Copy-Item dist/* $ui.FullName -Force
Copy-Item examples/* $examples.FullName -Recurse -Force
foreach($language in @("en","zh-CN")) { Get-ChildItem examples/shared -File | Where-Object {$_.Extension -in ".csv",".psv",".jsonl"} | Copy-Item -Destination (Join-Path $examples.FullName $language) -Force }
Copy-Item examples/shared/ATTRIBUTION.txt (Join-Path $licenses.FullName "data-attribution.txt") -Force
Copy-Item scripts/verify_materials.py $release.FullName -Force
Copy-Item README.md,README.zh-CN.md,REPORT-RULES.md $release.FullName -Force
Write-Output "Ready: $($release.FullName)\OnePageBI.exe"
