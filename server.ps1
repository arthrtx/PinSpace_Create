# Servidor estatico sem dependencias - usa so o PowerShell que ja vem no Windows.
# Implementado com socket TCP puro (nao usa http.sys/Acls), funciona sem admin
# em qualquer Windows com apenas o PowerShell embutido.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$port = 8000

function Get-Mime([string]$path) {
    switch ([System.IO.Path]::GetExtension($path).ToLower()) {
        ".html"  { "text/html; charset=utf-8" }
        ".css"   { "text/css; charset=utf-8" }
        ".js"    { "application/javascript; charset=utf-8" }
        ".mjs"   { "application/javascript; charset=utf-8" }
        ".json"  { "application/json; charset=utf-8" }
        ".png"   { "image/png" }
        ".jpg"   { "image/jpeg" }
        ".jpeg"  { "image/jpeg" }
        ".gif"   { "image/gif" }
        ".svg"   { "image/svg+xml" }
        ".webp"  { "image/webp" }
        ".ico"   { "image/x-icon" }
        ".woff"  { "font/woff" }
        ".woff2" { "font/woff2" }
        ".ttf"   { "font/ttf" }
        ".pdf"   { "application/pdf" }
        ".mp4"   { "video/mp4" }
        ".webm"  { "video/webm" }
        ".mp3"   { "audio/mpeg" }
        default  { "application/octet-stream" }
    }
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "Servidor anti-cache ativo em http://localhost:$port (PowerShell)"
Write-Host "Prima Ctrl+C para parar."

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $stream.ReadTimeout = 5000

            $buf = New-Object byte[] 8192
            $all = New-Object System.Collections.Generic.List[byte]
            $headEnd = -1
            while ($headEnd -lt 0) {
                $n = $stream.Read($buf, 0, $buf.Length)
                if ($n -le 0) { break }
                for ($i = 0; $i -lt $n; $i++) { $all.Add($buf[$i]) }
                if ($all.Count -ge 4) {
                    $headEnd = [System.Text.Encoding]::ASCII.GetString($all.ToArray()).IndexOf("`r`n`r`n")
                }
            }
            if ($headEnd -lt 0) { continue }

            $utf8 = [System.Text.Encoding]::UTF8
            $text = [System.Text.Encoding]::ASCII.GetString($all.ToArray())
            $firstLine = (($text -split "`r`n")[0]).Trim()
            $parts = $firstLine -split ' '
            $method = if ($parts.Count -gt 0) { $parts[0] } else { '' }
            $path = if ($parts.Count -gt 1) { $parts[1] } else { '/' }

            if ($method -ne 'GET' -and $method -ne 'HEAD') {
                $body = $utf8.GetBytes("405 - metodo nao permitido")
                $headOut = "HTTP/1.1 405 Method Not Allowed`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
                $h = [System.Text.Encoding]::ASCII.GetBytes($headOut)
                $stream.Write($h, 0, $h.Length)
                $stream.Write($body, 0, $body.Length)
                continue
            }

            $rel = $path -replace '\\', '/'
            $rel = ($rel -split '\?')[0]
            $rel = $rel.TrimStart('/')
            if ($rel -eq '') { $rel = 'index.html' }
            try { $rel = [System.Uri]::UnescapeDataString($rel) } catch { }

            $candidate = ''
            try { $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $rel)) } catch { }
            if (-not $candidate.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) { $candidate = '' }

            $bytes = $null
            $status = '404 Not Found'
            $mime = 'text/plain; charset=utf-8'
            if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
                $bytes = [System.IO.File]::ReadAllBytes($candidate)
                $status = '200 OK'
                $mime = Get-Mime $candidate
            }
            if ($bytes -eq $null -or $bytes.Length -eq 0) {
                $bytes = $utf8.GetBytes("404 - nao encontrado")
                if ($status -eq '200 OK') { $status = '404 Not Found'; $mime = 'text/plain; charset=utf-8' }
            }

            $headOut = "HTTP/1.1 $status`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store, no-cache, must-revalidate`r`nConnection: close`r`n`r`n"
            $h = [System.Text.Encoding]::ASCII.GetBytes($headOut)
            $stream.Write($h, 0, $h.Length)
            if ($method -ne 'HEAD') { $stream.Write($bytes, 0, $bytes.Length) }
            $stream.Flush()
        } catch {
            # ignora ligacoes aborted / erros de leitura
        } finally {
            try { $client.Close() } catch { }
        }
    }
} finally {
    try { $listener.Stop() } catch { }
    try { $listener.Close() } catch { }
}