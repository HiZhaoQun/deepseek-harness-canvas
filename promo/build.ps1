# Render the promo video: drive headless Edge over CDP for frame-accurate CSS
# animation, then encode the JPEG frames with ffmpeg.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$promo = $PSScriptRoot
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$node = 'C:\Users\HiZhaoQun\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$ffmpeg = 'C:\ProgramData\chocolatey\bin\ffmpeg.exe'

$fps = 30
$duration = 55
$port = 9224
$frames = Join-Path $promo 'frames'
$out = Join-Path $promo 'harness-canvas-promo.mp4'

if (Test-Path $frames) { Remove-Item $frames -Recurse -Force }
New-Item -ItemType Directory -Force -Path $frames | Out-Null

$proc = Start-Process -FilePath $edge -PassThru -ArgumentList @(
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--mute-audio',
  "--remote-debugging-port=$port",
  "--user-data-dir=$(Join-Path $promo 'tmp\profile-build')",
  '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank'
)
try {
  Start-Sleep -Seconds 3
  $renderStart = Get-Date
  & $node (Join-Path $promo 'render.mjs') --port $port --fps $fps --duration $duration --out frames
  if ($LASTEXITCODE -ne 0) { throw "render failed with exit code $LASTEXITCODE" }
  $renderSeconds = [math]::Round(((Get-Date) - $renderStart).TotalSeconds, 1)

  $count = (Get-ChildItem $frames -Filter *.jpg | Measure-Object).Count
  Write-Host "frames=$count renderSeconds=$renderSeconds"

  & $ffmpeg -y -hide_banner -loglevel error -framerate $fps -i (Join-Path $frames '%05d.jpg') `
    -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart -an $out
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed with exit code $LASTEXITCODE" }

  $file = Get-Item $out
  Write-Host ("DONE {0} {1:N2} MB" -f $file.Name, ($file.Length / 1MB))
}
finally {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
