$ErrorActionPreference='Stop'
$previewRoot=Split-Path -Parent $PSScriptRoot
$runtimeDirectory=Join-Path $previewRoot '.runtime\livekit'
New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
$binary=Join-Path $runtimeDirectory 'livekit-server.exe'
if(-not (Test-Path -LiteralPath $binary)) {
    $archivePath=Join-Path $runtimeDirectory 'livekit-windows.zip'
    if(-not (Test-Path -LiteralPath $archivePath)){Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/livekit/livekit/releases/download/v1.13.9/livekit_1.13.9_windows_amd64.zip' -OutFile $archivePath}
    $checksumResponse=(Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/livekit/livekit/releases/download/v1.13.9/checksums.txt').Content
    $checksumText=if($checksumResponse -is [byte[]]){[Text.Encoding]::UTF8.GetString($checksumResponse)}else{[string]$checksumResponse}
    $checksumLine=$checksumText -split "`n" | Where-Object {$_ -match 'livekit_1.13.9_windows_amd64.zip'} | Select-Object -First 1
    if(-not $checksumLine){throw 'The official checksum list does not include this Windows release.'}
    $expected=$checksumLine.Split(' ',[StringSplitOptions]::RemoveEmptyEntries)[0]
    $actual=(Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if($actual -ne $expected.ToLowerInvariant()){throw 'LiveKit archive checksum does not match the official release.'}
    Expand-Archive -LiteralPath $archivePath -DestinationPath $runtimeDirectory -Force
}
& $binary --dev --bind 127.0.0.1 --node-ip 127.0.0.1
