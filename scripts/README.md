# Scripts - Journey Planner

Zbiór pomocnych skryptów do lokalnego testowania aplikacji Journey Planner.

## 📁 Dostępne Skrypty

### 1. `geocode-attractions.js` (Node.js) 🌍

Automatycznie dodaje współrzędne GPS do atrakcji, które mają adres ale brakuje im lokalizacji.

**Użycie:**
```bash
cd scripts
node geocode-attractions.js
```

**Co robi:**
- Wczytuje wszystkie atrakcje z `server/data/attractions.json`
- Znajduje te z adresem ale bez współrzędnych (latitude/longitude)
- Używa Nominatim API (OpenStreetMap) do znalezienia lokalizacji
- Aktualizuje plik JSON z nowymi współrzędnymi
- Respektuje limity API (1 zapytanie na sekundę)

**Kiedy używać:**
- Po zaimportowaniu starych danych bez współrzędnych
- Gdy użytkownicy zapomnieli kliknąć "Locate on Map"
- Aby wszystkie atrakcje pokazywały się na mapie w harmonogramie

**Wymagania:**
- Node.js 18+ (fetch API)
- Połączenie z internetem

### 2. `serve-local.py` (Python) ⭐

Prosty HTTP server do hostowania zbudowanej aplikacji frontendowej.

**Użycie:**
```bash
# Basic usage (port 8000)
python scripts/serve-local.py

# Custom port
python scripts/serve-local.py --port 3000

# Pokaż pełny przewodnik
python scripts/serve-local.py --full-guide

# Pomoc
python scripts/serve-local.py --help
```

**Wymagania:**
- Python 3.6+
- Zbudowana aplikacja (`npm run build:all`)

**Funkcje:**
- ✅ Kolorowy output
- ✅ SPA routing (przekierowania do index.html)
- ✅ Sprawdza czy backend działa
- ✅ Wykrywa zajęte porty
- ✅ Pełny przewodnik setup

### 2. `serve-local.ps1` (PowerShell)

Wersja PowerShell dla użytkowników Windows.

**Użycie:**
```powershell
# Basic usage (port 8000)
.\scripts\serve-local.ps1

# Custom port
.\scripts\serve-local.ps1 -Port 3000

# Pokaż pełny przewodnik
.\scripts\serve-local.ps1 -FullGuide
```

**Wymagania:**
- Windows PowerShell 5.1+
- Zbudowana aplikacja (`npm run build:all`)

**Funkcje:**
- ✅ Kolorowy output
- ✅ Wykrywa zajęte porty
- ✅ Sprawdza czy backend działa
- ✅ Używa Python jeśli dostępny
- ✅ Fallback do PowerShell HTTP Listener

## 🚀 Szybki Start

### Metoda 1: Docker + npm dev (Zalecana)
```bash
# Najprostsza metoda - bez budowania
docker-compose up -d postgres
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5001

### Metoda 2: Python HTTP Server
```bash
# Terminal 1: Build & serve frontend
npm run client:build
python scripts/serve-local.py

# Terminal 2: Run backend
cd server && npm run dev
```
- Frontend: http://localhost:8000
- Backend: http://localhost:5001

### Metoda 3: PowerShell Server
```powershell
# Terminal 1: Build & serve frontend
npm run client:build
.\scripts\serve-local.ps1

# Terminal 2: Run backend
cd server; npm run dev
```

## 🎯 Kiedy Użyć Którego?

### `npm run dev` ⭐
- Aktywny development
- Hot reload
- Debugging w czasie rzeczywistym
- **Best dla:** codziennego developmentu

### Python/PowerShell Server
- Testowanie zbudowanej aplikacji
- Symulacja produkcji
- Testowanie bez Vite
- **Best dla:** testów pre-deployment

## 🔧 Przykłady Użycia

### Standardowy Development Flow
```bash
# 1. Start database
docker-compose up -d postgres

# 2. Run app
npm run dev

# 3. Open browser
# http://localhost:5173
```

### Testing Built App
```bash
# 1. Build everything
npm run build:all

# 2. Terminal 1: Serve frontend
python scripts/serve-local.py

# 3. Terminal 2: Run backend
cd server && npm run dev

# 4. Open browser
# http://localhost:8000
```

### Custom Port
```bash
# Jeśli port 8000 zajęty
python scripts/serve-local.py --port 3000

# PowerShell
.\scripts\serve-local.ps1 -Port 3000
```

### Full Setup Guide
```bash
# Python
python scripts/serve-local.py --full-guide

# PowerShell
.\scripts\serve-local.ps1 -FullGuide
```

## 🐛 Troubleshooting

### "Folder client/dist nie istnieje"
```bash
# Najpierw zbuduj aplikację
npm run client:build
# lub
npm run build:all
```

### "Port jest zajęty"
```bash
# Użyj innego portu
python scripts/serve-local.py --port 3001
```

### "Backend nie działa"
```bash
# W osobnym terminalu uruchom backend
cd server
npm run dev

# Sprawdź czy działa
curl http://localhost:5001/api/health
```

### Python nie znaleziony (Windows)
```powershell
# Użyj PowerShell script
.\scripts\serve-local.ps1
```

## 📝 Uwagi

### Python Server
- Używa `http.server` module (built-in)
- Obsługuje SPA routing
- Kolorowy output z emoji
- Cross-platform (Linux, macOS, Windows)

### PowerShell Server
- Próbuje użyć Python jeśli dostępny
- Fallback do PowerShell HTTP Listener
- Windows-specific
- Wymaga PowerShell 5.1+

### Backend
- **ZAWSZE** używaj portu 5001
- NIE używaj portu 5000 (konflikt z SmartHome)
- Backend musi działać osobno dla Python/PowerShell servers

## 🔗 Powiązane Pliki

- [README.md](../README.md) - Główna dokumentacja
- [QUICKSTART.md](../QUICKSTART.md) - Quickstart guide
- [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - Quick reference
- [copilot-instructions.md](../.github/copilot-instructions.md) - AI guidelines
- [planner-mode2.chatmode.md](../.github/chatmodes/planner-mode2.chatmode.md) - Expert mode

## 💡 Pro Tips

1. **Development**: Używaj `npm run dev` dla hot reload
2. **Testing**: Używaj Python/PowerShell dla zbudowanej app
3. **Debugging**: Uruchom backend i frontend w osobnych terminalach
4. **Port conflicts**: Zmień port jeśli 8000 zajęty
5. **Database**: Zawsze sprawdź czy PostgreSQL działa (`docker ps`)

---

**Pytania?** Sprawdź przewodnik: `python scripts/serve-local.py --full-guide`
