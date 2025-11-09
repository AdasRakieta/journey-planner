# Journey Planner - Local Development Server (PowerShell)
# ========================================================
#
# Skrypt do lokalnego hostowania aplikacji Journey Planner na Windows
#
# Użycie:
#   .\scripts\serve-local.ps1 [-Port 8000] [-FrontendOnly] [-FullGuide]
#
# Przykłady:
#   .\scripts\serve-local.ps1                    # Domyślnie port 8000
#   .\scripts\serve-local.ps1 -Port 3000         # Custom port
#   .\scripts\serve-local.ps1 -FullGuide         # Pełny przewodnik

param(
    [int]$Port = 8000,
    [switch]$FrontendOnly,
    [switch]$FullGuide
)

# Kolory dla czytelnego outputu
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Show-Banner {
    Write-Host ""
    Write-ColorOutput "╔═══════════════════════════════════════════════════════════╗" "Cyan"
    Write-ColorOutput "║                                                           ║" "Cyan"
    Write-ColorOutput "║          🗺️  JOURNEY PLANNER - LOCAL SERVER 🗺️           ║" "Cyan"
    Write-ColorOutput "║                                                           ║" "Cyan"
    Write-ColorOutput "║              Development & Testing Environment            ║" "Cyan"
    Write-ColorOutput "║                                                           ║" "Cyan"
    Write-ColorOutput "╚═══════════════════════════════════════════════════════════╝" "Cyan"
    Write-Host ""
}

function Show-FullGuide {
    Write-Host ""
    Write-ColorOutput "📚 PEŁNY PRZEWODNIK URUCHOMIENIA" "Cyan"
    Write-Host ""
    
    Write-ColorOutput "Metoda 1: Docker Compose (Zalecana) ⭐" "Yellow"
    Write-Host "  1. docker-compose up -d postgres"
    Write-Host "  2. npm run install:all"
    Write-Host "  3. npm run dev"
    Write-Host "  4. Otwórz http://localhost:5173"
    Write-Host ""
    
    Write-ColorOutput "Metoda 2: Python HTTP Server" "Yellow"
    Write-Host "  1. npm run build:all"
    Write-Host "  2. cd server; npm run dev          (Terminal 1)"
    Write-Host "  3. python scripts/serve-local.py   (Terminal 2)"
    Write-Host "  4. Otwórz http://localhost:8000"
    Write-Host ""
    
    Write-ColorOutput "Metoda 3: PowerShell Server (ten skrypt)" "Yellow"
    Write-Host "  1. npm run build:all"
    Write-Host "  2. cd server; npm run dev                    (Terminal 1)"
    Write-Host "  3. .\scripts\serve-local.ps1                 (Terminal 2)"
    Write-Host "  4. Otwórz http://localhost:8000"
    Write-Host ""
    
    Write-ColorOutput "💡 Porady:" "Cyan"
    Write-Host "  • Backend zawsze na porcie 5001 (NIE 5000!)"
    Write-Host "  • Frontend dev na porcie 5173"
    Write-Host "  • PostgreSQL na porcie 5432"
    Write-Host "  • Sprawdź logi jeśli są problemy"
    Write-Host ""
}

function Test-Prerequisites {
    $clientDist = Join-Path $PSScriptRoot "..\client\dist"
    
    if (-not (Test-Path $clientDist)) {
        Write-ColorOutput "❌ Błąd: Folder client\dist nie istnieje!" "Red"
        Write-ColorOutput "Najpierw zbuduj aplikację:" "Yellow"
        Write-Host "  cd client"
        Write-Host "  npm run build"
        return $false
    }
    
    $indexHtml = Join-Path $clientDist "index.html"
    if (-not (Test-Path $indexHtml)) {
        Write-ColorOutput "❌ Błąd: Brak pliku client\dist\index.html!" "Red"
        Write-ColorOutput "Zbuduj aplikację ponownie." "Yellow"
        return $false
    }
    
    return $true
}

function Test-BackendRunning {
    param([int]$BackendPort = 5001)
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

function Start-FrontendServer {
    param([int]$ServerPort = 8000)
    
    $clientDist = Join-Path $PSScriptRoot "..\client\dist"
    
    Write-Host ""
    Write-ColorOutput "✅ Przygotowanie serwera..." "Green"
    Write-ColorOutput "📁 Katalog: $clientDist" "Blue"
    Write-ColorOutput "🔌 Port: $ServerPort" "Blue"
    Write-Host ""
    
    # Sprawdź czy port jest wolny
    $portInUse = Get-NetTCPConnection -LocalPort $ServerPort -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-ColorOutput "❌ Błąd: Port $ServerPort jest zajęty!" "Red"
        Write-ColorOutput "Spróbuj użyć innego portu:" "Yellow"
        Write-Host "  .\scripts\serve-local.ps1 -Port 3000"
        Write-Host ""
        exit 1
    }
    
    # Uruchom HTTP server
    try {
        Push-Location $clientDist
        
        Write-ColorOutput "✅ Serwer uruchomiony!" "Green"
        Write-Host ""
        Write-Host "🌐 Frontend: " -NoNewline
        Write-ColorOutput "http://localhost:$ServerPort" "Green"
        
        # Sprawdź backend
        $backendPort = 5001
        if (Test-BackendRunning -BackendPort $backendPort) {
            Write-Host "🔌 Backend:  " -NoNewline
            Write-ColorOutput "http://localhost:$backendPort/api" "Green" -NoNewline
            Write-Host " ✅"
        }
        else {
            Write-Host "🔌 Backend:  " -NoNewline
            Write-ColorOutput "http://localhost:$backendPort/api" "Yellow" -NoNewline
            Write-Host " ⚠️  (nie działa)"
            Write-Host ""
            Write-ColorOutput "⚠️  UWAGA: Backend nie jest uruchomiony!" "Yellow"
            Write-ColorOutput "   Uruchom backend w osobnym terminalu:" "Yellow"
            Write-Host "   cd server; npm run dev"
        }
        
        Write-Host ""
        Write-ColorOutput "💡 Porady:" "Cyan"
        Write-Host "   • Naciśnij Ctrl+C aby zatrzymać serwer"
        Write-Host "   • Otwórz http://localhost:$ServerPort w przeglądarce"
        Write-Host "   • Sprawdź DevTools (F12) jeśli są problemy"
        Write-Host ""
        Write-ColorOutput "═══════════════════════════════════════════════════════════" "White"
        Write-Host ""
        
        # Uruchom Python HTTP server (prostszy niż PowerShell HTTP listener)
        if (Get-Command python -ErrorAction SilentlyContinue) {
            python -m http.server $ServerPort
        }
        else {
            Write-ColorOutput "⚠️  Python nie jest zainstalowany. Używam PowerShell HTTP Listener..." "Yellow"
            
            # PowerShell HTTP Listener (backup solution)
            $listener = New-Object System.Net.HttpListener
            $listener.Prefixes.Add("http://localhost:$ServerPort/")
            $listener.Start()
            
            Write-ColorOutput "🎧 Słucham na http://localhost:$ServerPort ..." "Green"
            
            while ($listener.IsListening) {
                $context = $listener.GetContext()
                $request = $context.Request
                $response = $context.Response
                
                $requestedFile = $request.Url.LocalPath
                if ($requestedFile -eq "/") {
                    $requestedFile = "/index.html"
                }
                
                $filePath = Join-Path $clientDist $requestedFile.TrimStart('/')
                
                if (Test-Path $filePath) {
                    $content = [System.IO.File]::ReadAllBytes($filePath)
                    $response.ContentLength64 = $content.Length
                    $response.OutputStream.Write($content, 0, $content.Length)
                }
                else {
                    # SPA fallback - redirect to index.html
                    $indexPath = Join-Path $clientDist "index.html"
                    $content = [System.IO.File]::ReadAllBytes($indexPath)
                    $response.ContentLength64 = $content.Length
                    $response.OutputStream.Write($content, 0, $content.Length)
                }
                
                $response.Close()
            }
        }
    }
    catch {
        Write-ColorOutput "❌ Błąd: $_" "Red"
        exit 1
    }
    finally {
        Pop-Location
        Write-Host ""
        Write-ColorOutput "⏹️  Zatrzymywanie serwera..." "Yellow"
        Write-ColorOutput "✅ Serwer zatrzymany pomyślnie!" "Green"
        Write-Host ""
    }
}

# Main
Show-Banner

if ($FullGuide) {
    Show-FullGuide
    exit 0
}

# Sprawdź prerequisites
if (-not (Test-Prerequisites)) {
    Write-Host ""
    Write-ColorOutput "💡 Potrzebujesz pomocy? Użyj:" "Yellow"
    Write-Host "  .\scripts\serve-local.ps1 -FullGuide"
    Write-Host ""
    exit 1
}

# Uruchom server
Start-FrontendServer -ServerPort $Port
