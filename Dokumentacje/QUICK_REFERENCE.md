# Journey Planner - Quick Reference Guide

## 🚀 Szybki Start

### Metoda 1: Docker Compose (Najszybsza) ⭐
```bash
docker-compose up -d postgres
npm run install:all
npm run dev
```
Otwórz: http://localhost:5173

### Metoda 2: Python HTTP Server
```bash
npm run build:all
python scripts/serve-local.py              # Terminal 1
cd server && npm run dev                   # Terminal 2
```
Otwórz: http://localhost:8000

### Metoda 3: PowerShell (Windows)
```powershell
npm run build:all
.\scripts\serve-local.ps1                  # Terminal 1
cd server; npm run dev                     # Terminal 2
```

## 📊 Kluczowe Porty

| Serwis | Port | Cel |
|--------|------|-----|
| Frontend (dev) | 5173 | Vite dev server |
| Frontend (Python) | 8000 | HTTP server dla built app |
| Backend | **5001** | Express API (NIE 5000!) |
| PostgreSQL | 5432 | Baza danych |
| SmartHome | 5000 | Istniejąca aplikacja (konflikt!) |

## 🔌 API Endpoints

```typescript
GET    /api/health                          // Status check
GET    /api/journeys                        // Wszystkie podróże
GET    /api/journeys/:id                    // Konkretna podróż
POST   /api/journeys                        // Utwórz podróż
PUT    /api/journeys/:id                    // Zaktualizuj podróż
DELETE /api/journeys/:id                    // Usuń podróż
POST   /api/journeys/:id/calculate-cost     // Przelicz koszt
```

## 🛠️ Przydatne Komendy

### Development
```bash
npm run dev                    # Frontend + Backend
npm run server:dev             # Tylko backend
npm run client:dev             # Tylko frontend
```

### Build
```bash
npm run build:all              # Wszystko
npm run server:build           # Backend
npm run client:build           # Frontend
```

### Database
```bash
docker-compose up -d postgres              # Start DB
docker-compose down                        # Stop wszystko
docker-compose logs postgres               # Logi
docker exec -it journey-planner-db psql -U journey_user -d journey_planner
```

### Python Hosting
```bash
python scripts/serve-local.py              # Port 8000
python scripts/serve-local.py --port 3000  # Custom port
python scripts/serve-local.py --full-guide # Przewodnik

# PowerShell
.\scripts\serve-local.ps1
.\scripts\serve-local.ps1 -Port 3000
.\scripts\serve-local.ps1 -FullGuide
```

### Testing
```bash
curl http://localhost:5001/api/health      # Test backend
curl http://localhost:5001/api/journeys    # Test API
```

## 🐛 Troubleshooting

### Port zajęty (Windows)
```powershell
netstat -ano | findstr :5001
taskkill /PID [numer] /F
```

### Backend nie działa
```bash
cd server
npm run dev  # Zobacz logi
```

### Frontend nie łączy się
```bash
# Sprawdź client/.env
cat client/.env
# Powinno być: VITE_API_URL=http://localhost:5001/api
```

### Database issues
```bash
docker ps | grep journey-planner-db        # Sprawdź czy działa
docker-compose restart postgres            # Restart
docker-compose down -v                     # Reset (usuwa dane!)
```

## 📁 Struktura Projektu

```
journey-planner/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx
│   └── dist/              # Built app (po npm run build)
├── server/                # Express Backend
│   ├── src/
│   │   ├── config/        # Database config
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Sequelize models
│   │   ├── routes/        # API routes
│   │   └── index.ts
│   └── dist/              # Compiled JS (po npm run build)
├── database/
│   └── init.sql          # Database schema
├── scripts/
│   ├── serve-local.py    # Python HTTP server
│   └── serve-local.ps1   # PowerShell HTTP server
├── .github/
│   ├── copilot-instructions.md      # AI guidelines (główny)
│   └── chatmodes/
│       └── planner-mode2.chatmode.md  # Expert mode
└── docker-compose.yml
```

## 🎨 Design System

### Tailwind Classes (iOS Style)
```typescript
// Buttons
bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors

// Cards
bg-white rounded-xl shadow-sm p-6 border border-gray-200

// Inputs
w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500

// Icons (Lucide React)
<Icon size={20} />  // small
<Icon size={24} />  // default
```

### Kolory
- Primary: `blue-500`
- Success: `green-500`
- Danger: `red-500`
- Gray scale: `gray-50` do `gray-900`

## 📝 TypeScript Interfaces

### Journey
```typescript
interface Journey {
  id?: number;
  title: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  stops?: Stop[];
  transports?: Transport[];
  totalEstimatedCost?: number;
  currency: string;
}
```

### Stop
```typescript
interface Stop {
  id?: number;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  arrivalDate: Date | string;
  departureDate: Date | string;
  accommodationName?: string;
  accommodationUrl?: string;
  accommodationPrice?: number;
  attractions?: Attraction[];
}
```

### Transport
```typescript
interface Transport {
  id?: number;
  type: 'flight' | 'train' | 'bus' | 'car' | 'other';
  fromLocation: string;
  toLocation: string;
  departureDate: Date | string;
  arrivalDate: Date | string;
  price: number;
  currency: string;
  bookingUrl?: string;
}
```

## ⚠️ Ważne Zasady

### ✅ DO
- Używaj portu 5001 dla backendu
- TypeScript strict mode
- async/await zamiast .then()
- iOS-inspired design (Tailwind)
- Error handling w każdym request
- Loading states w UI
- Environment variables dla config

### ❌ DON'T
- Port 5000 dla backendu (konflikt!)
- Commituj plików .env
- Ignoruj TypeScript errors
- Używaj `any` bez powodu
- Inline styles (tylko Tailwind)
- N+1 queries (używaj includes)
- Deployuj bez testów lokalnych

## 🚀 Deployment (Raspberry Pi)

```bash
# Automated
chmod +x deploy.sh
./deploy.sh

# Manual
npm run build:all
pm2 start server/dist/index.js --name journey-planner-api
pm2 save
```

### Nginx Config
```nginx
location /journey/ {
    proxy_pass http://localhost:5001/;
}
```

## 📚 Dokumentacja

- [README.md](../README.md) - Główna dokumentacja
- [QUICKSTART.md](../QUICKSTART.md) - Przewodnik quickstart
- [USER_GUIDE.md](../USER_GUIDE.md) - Instrukcja użytkownika
- [PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md) - Podsumowanie projektu
- [NGINX_SETUP.md](../NGINX_SETUP.md) - Konfiguracja Nginx
- [copilot-instructions.md](../.github/copilot-instructions.md) - Instrukcje dla AI
- [planner-mode2.chatmode.md](../.github/chatmodes/planner-mode2.chatmode.md) - Expert mode

## 🆘 Pomoc

### Sprawdź status
```bash
# Backend
curl http://localhost:5001/api/health

# Database
docker ps | grep journey-planner-db

# Frontend (jeśli używasz Python)
curl http://localhost:8000
```

### Logi
```bash
# Backend
cd server && npm run dev  # Console output

# Database
docker logs journey-planner-db

# Python server
python scripts/serve-local.py  # Wyświetla requesty
```

### Reset
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres

# Reinstall dependencies
rm -rf node_modules server/node_modules client/node_modules
npm run install:all

# Rebuild
npm run build:all
```

---

**Pro tip:** Użyj Expert Mode w GitHub Copilot Chat!
Wpisz `@planner-mode2` aby aktywować wyspecjalizowany model AI. 🤖
