# 🔧 Portainer - Local Build Instructions

## Problem który rozwiązuje ten dokument

GitHub Actions buduje obrazy z `VITE_API_URL=http://localhost:5001/api`.  
Gdy ściągniesz te obrazy, **frontend zawsze próbuje localhost**.

## Rozwiązanie: Build lokalnie w Portainerze

Portainer może budować obrazy **lokalnie na Raspberry Pi** z **Twoimi zmiennymi**.

---

## Krok 1: Przygotuj Stack w Portainerze

### A. Otwórz Stack Editor

1. Portainer → **Stacks** → **journey-planner**
2. Kliknij **Editor** (góra strony)

### B. Zmodyfikuj frontend service

Znajdź sekcję `frontend:` i zmień:

**PRZED (używa obrazu z GitHub):**
```yaml
  frontend:
    image: ghcr.io/adasrakieta/journey-planner/frontend:latest
    container_name: journey-planner-web
```

**PO (build lokalny):**
```yaml
  frontend:
    # image: ghcr.io/adasrakieta/journey-planner/frontend:latest  # Zakomentuj!
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL}
    container_name: journey-planner-web
```

---

## Krok 2: Ustaw Environment Variables

Przewiń w dół do **Environment variables** i ustaw:

### Dla Direct Access (bez Nginx):
```env
VITE_API_URL=http://100.103.184.90:5001/api
FRONTEND_URL=http://100.103.184.90:5173
CORS_ORIGIN=http://100.103.184.90:5173
NODE_ENV=production
IMAGE_TAG=latest

# Database
DB_HOST=100.103.184.90
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=admin
DB_PASSWORD=***

# JWT
JWT_SECRET=***

# SMTP
SMTP_USERNAME=***
SMTP_PASSWORD=***
```

### Dla Nginx + TailScale:
```env
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
CORS_ORIGIN=https://malina.tail384b18.ts.net
NODE_ENV=production
IMAGE_TAG=latest

# Database, JWT, SMTP jak wyżej...
```

---

## Krok 3: Update Stack z lokalnym buildem

1. Kliknij **Update the stack** (na dole)
2. ✅ **Re-build images** - ZAZNACZ!
3. ✅ **Prune unused images** - opcjonalnie (wyczyści stare obrazy)
4. Kliknij **Update**

**Czas buildu:** ~3-5 minut na Raspberry Pi (ARM64)

---

## Krok 4: Weryfikacja

### A. Sprawdź logi backendu
```bash
docker logs journey-planner-api
```

Powinno pokazać:
```
📡 API Base URL: http://100.103.184.90:5001/api
🔗 CORS Origin: http://100.103.184.90:5173
```

### B. Sprawdź logi frontendu
```bash
docker logs journey-planner-web
```

Powinno być bez błędów.

### C. Sprawdź bundle frontendu
```bash
docker exec journey-planner-web cat /usr/share/nginx/html/assets/index-*.js | grep -o 'http://[^"]*5001/api'
```

Powinno pokazać **Twój IP**, nie `localhost`!

### D. Testuj w przeglądarce

1. Otwórz `http://100.103.184.90:5173` (lub Twój URL)
2. Naciśnij **F12** → Console
3. Sprawdź czy nie ma CORS errors
4. Spróbuj zalogować się

---

## Troubleshooting

### ❌ Build failed: "No such file or directory ./client"

**Przyczyna:** Portainer nie ma dostępu do kodu źródłowego.

**Rozwiązanie:**
1. Sklonuj repo na Raspberry Pi:
   ```bash
   cd ~
   git clone https://github.com/AdasRakieta/journey-planner.git
   cd journey-planner
   ```

2. W Portainerze utwórz stack **z repozytorium**:
   - Stacks → Add stack
   - Name: `journey-planner`
   - Build method: **Repository**
   - Repository URL: `https://github.com/AdasRakieta/journey-planner`
   - Reference: `refs/heads/main`
   - Compose path: `docker-compose.yml`

### ❌ Frontend nadal pokazuje localhost

**Sprawdź czy build lokalny jest włączony:**
```bash
docker inspect journey-planner-web | grep -i image
```

Jeśli pokazuje `ghcr.io/...`, to używa obrazu z GitHub, nie lokalnego buildu!

**Rozwiązanie:**
1. Zakomentuj `image:` w docker-compose.yml
2. Odkomentuj `build:` sekcję
3. Update stack z ✅ Re-build

### ❌ CORS error mimo lokalnego buildu

**Sprawdź zmienne:**
```bash
# Backend
docker logs journey-planner-api | grep "CORS Origin"

# Frontend bundle
docker exec journey-planner-web cat /usr/share/nginx/html/assets/index-*.js | grep -o 'http://[^"]*api'
```

`CORS_ORIGIN` (backend) i `VITE_API_URL` (frontend) muszą używać tego samego IP/domeny!

---

## Alternatywa: docker-compose CLI na Pi

Jeśli wolisz terminal niż Portainer UI:

```bash
# 1. Sklonuj repo
cd ~
git clone https://github.com/AdasRakieta/journey-planner.git
cd journey-planner

# 2. Skopiuj i edytuj .env
cp .env.example .env
nano .env

# Ustaw:
VITE_API_URL=http://100.103.184.90:5001/api
FRONTEND_URL=http://100.103.184.90:5173
CORS_ORIGIN=http://100.103.184.90:5173

# 3. Odkomentuj build w docker-compose.yml
nano docker-compose.yml
# Zakomentuj image:, odkomentuj build:

# 4. Build i uruchom
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d

# 5. Sprawdź logi
docker-compose logs -f
```

---

## Podsumowanie

✅ **Build lokalnie** - frontend używa właściwego `VITE_API_URL`  
✅ **Zmienne z Portainera** - łatwa zmiana bez edycji plików  
✅ **Brak CORS errors** - frontend i backend zgadzają się na URL  

❌ **Pull z GitHub** - zawsze ma `localhost` hardcoded

**Dla produkcji: zawsze build lokalnie w Portainerze!**

---

## Zobacz też

- **FRONTEND_BUILD_CRITICAL.md** - Dlaczego to jest potrzebne
- **URL_CONFIGURATION_GUIDE.md** - Kiedy używać `/journey/` w URL
- **PORTAINER_ENV.md** - Zarządzanie zmiennymi środowiskowymi
