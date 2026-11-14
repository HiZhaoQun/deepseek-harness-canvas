# The capture harness mounts the real client view against a stubbed host.
# React is injected by the DSH host in production, so the harness loads the
# same UMD build locally instead of bundling a second copy into the plugin.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $PSScriptRoot
$proxy = if ($env:HTTPS_PROXY) { $env:HTTPS_PROXY } else { 'http://127.0.0.1:7897' }

Invoke-WebRequest -Uri 'https://unpkg.com/react@18.3.1/umd/react.production.min.js' `
  -OutFile (Join-Path $PSScriptRoot 'react.js') -Proxy $proxy -TimeoutSec 60
Invoke-WebRequest -Uri 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js' `
  -OutFile (Join-Path $PSScriptRoot 'react-dom.js') -Proxy $proxy -TimeoutSec 60

Write-Host "react.js and react-dom.js downloaded into $PSScriptRoot"
