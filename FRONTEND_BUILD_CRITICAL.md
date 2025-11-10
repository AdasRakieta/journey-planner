# 🚨 KRYTYCZNE: Frontend i VITE_API_URL

## Problem

Frontend React/Vite **compile-time** wstawia `VITE_API_URL` do bundle podczas buildu.

❌ **Jeśli zbudowany z `localhost`, ZAWSZE będzie używał `localhost`!**  
❌ **Zmiana `.env` po buildzie NIE POMOŻE!**

## Rozwiązania

### ✅ Rozwiązanie 1: Build lokalnie w Portainerze (ZALECANE)

Portainer może budować obrazy lokalnie z Twoimi zmiennymi:

1. **W docker-compose.yml odkomentuj sekcję `build`:**
```yaml
frontend:
  # image: ghcr.io/adasrakieta/journey-planner/frontend:latest  # Zakomentuj!
  build:
    context: ./client
    dockerfile: Dockerfile
    args:
      - VITE_API_URL=${VITE_API_URL}  # Użyje Twojego URL!
```

2. **W Portainer Environment Variables ustaw:**
```env
VITE_API_URL=http://100.103.184.90:5001/api
# Lub dla Nginx:
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
```

3. **Update stack z ✅ Re-build images**

### ✅ Rozwiązanie 2: Multi-stage build z runtime config (Zaawansowane)

Używaj `window.env` w HTML i ładuj config w runtime. Wymaga modyfikacji `api.ts`.

### ❌ Rozwiązanie NIE-działające:

```env
# To NIE ZADZIAŁA jeśli frontend już zbudowany!
VITE_API_URL=http://100.103.184.90:5001/api
```

Zmienne `VITE_*` działają tylko podczas buildu, nie runtime!

## Sprawdź co jest w bundle

```bash
# Sprawdź zbudowany frontend:
docker exec journey-planner-web cat /usr/share/nginx/html/assets/index-*.js | grep -o 'http://[^"]*5001'
```

Jeśli pokazuje `localhost:5001` - musisz **przebudować**!

## Dla developerów

### Lokalny development:
```bash
# .env w client/
VITE_API_URL=http://localhost:5001/api

npm run dev  # Hot reload - zmiana .env działa!
```

### Docker build lokalny:
```bash
# Przekaż zmienną do Docker build:
docker build \
  --build-arg VITE_API_URL=http://100.103.184.90:5001/api \
  -t my-frontend \
  ./client
```

### Docker Compose build:
```bash
# Ustaw w .env:
VITE_API_URL=http://100.103.184.90:5001/api

# Build:
docker-compose build frontend

# Lub:
docker-compose up -d --build frontend
```

## Portainer Setup - Krok po kroku

### 1. Edytuj Stack w Portainerze

```yaml
services:
  frontend:
    # ZAKOMENTUJ linię z image z GitHub:
    # image: ghcr.io/adasrakieta/journey-planner/frontend:latest
    
    # ODKOMENTUJ sekcję build:
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL}
```

### 2. Dodaj Environment Variables

```env
VITE_API_URL=http://100.103.184.90:5001/api
FRONTEND_URL=http://100.103.184.90:5173
CORS_ORIGIN=http://100.103.184.90:5173
```

### 3. Update Stack

- ✅ **Re-build images** - ZAZNACZ!
- ✅ **Prune unused images** - opcjonalnie
- Click **Update**

### 4. Sprawdź logi

```bash
docker logs journey-planner-web
docker logs journey-planner-api
```

Backend powinien pokazać:
```
📡 API Base URL: http://100.103.184.90:5001/api
🔗 CORS Origin: http://100.103.184.90:5173
```

## Troubleshooting

### Frontend nadal używa localhost

**Sprawdź:**
```bash
# Co jest w bundle?
docker exec journey-planner-web cat /usr/share/nginx/html/assets/index-*.js | head -c 5000 | grep localhost
```

**Jeśli pokazuje localhost:**
1. Sprawdź czy `VITE_API_URL` jest w Environment Variables
2. Sprawdź czy `build:` sekcja jest odkomentowana
3. Przebuduj: Update stack z ✅ Re-build images

### CORS error mimo dobrych zmiennych

**Backend używa `CORS_ORIGIN`, frontend używa `VITE_API_URL`**

Sprawdź:
```bash
# Backend:
docker logs journey-planner-api | grep "CORS Origin"

# Frontend bundle:
docker exec journey-planner-web cat /usr/share/nginx/html/assets/index-*.js | grep -o 'http://[^"]*api'
```

Muszą się zgadzać!

## Podsumowanie

| Metoda | Build gdzie? | VITE_API_URL z... | Zalecane? |
|--------|-------------|-------------------|-----------|
| GitHub Actions → Pull image | GitHub servers | GitHub Actions (hardcoded) | ❌ NIE |
| Portainer local build | Raspberry Pi | Portainer Env Vars | ✅ TAK |
| docker-compose build | Local machine | .env file | ✅ TAK dla dev |

**Dla produkcji: Build lokalnie w Portainerze z właściwymi zmiennymi!**
