# 🔄 Jak Zaktualizować Stack w Portainer (Rebuild Lokalny)

## Problem
Gdy zaznaczasz **"Re-pull image and redeploy"**, Portainer próbuje pobrać obrazy z Docker Hub:
```
Error: pull access denied for journey-planner-frontend, repository does not exist
```

## ✅ Rozwiązanie - Build Lokalny (Bez Pull)

### Metoda 1: Update w Portainer (ZALECANA)

**Krok po kroku:**

1. **Portainer → Stacks → journey-planner**

2. **Kliknij "Editor"** (góra strony)

3. **Zaktualizuj Environment Variables:**
   ```env
   FRONTEND_URL=https://malina.tail384b18.ts.net
   VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
   CORS_ORIGIN=https://malina.tail384b18.ts.net
   ```
   
   **LUB jeśli używasz IP:**
   ```env
   FRONTEND_URL=http://100.103.184.90
   VITE_API_URL=http://100.103.184.90/journey/api
   CORS_ORIGIN=http://100.103.184.90
   ```

4. **Scroll na dół**

5. **Kliknij "Update the stack"**

6. **⚠️ WAŻNE - NIE zaznaczaj tego:**
   - ❌ **"Pull latest image version"** - ODZNACZ!
   - ❌ **"Re-pull image and redeploy"** - ODZNACZ!

7. **Kliknij "Update"**

8. **Poczekaj 5-10 minut** - Portainer zbuduje obrazy lokalnie

### Metoda 2: Rebuild przez SSH (Alternatywa)

Jeśli Portainer dalej próbuje pull'ować, użyj SSH:

```bash
# 1. SSH do Raspberry Pi
ssh pi@malina.tail384b18.ts.net
# LUB
ssh pi@100.103.184.90

# 2. Przejdź do katalogu projektu
cd ~/journey-planner

# 3. Pobierz najnowszy kod
git pull origin main

# 4. Zaktualizuj .env (skopiuj z nginix.env)
cp nginix.env .env
# LUB edytuj ręcznie:
nano .env

# 5. Zatrzymaj stack
docker-compose down

# 6. Zbuduj obrazy lokalnie (WAŻNE: --build)
docker-compose up -d --build

# 7. Sprawdź logi
docker-compose logs -f
```

**Czas buildu:** 5-10 minut na Raspberry Pi

### Metoda 3: Prune i Rebuild (Jeśli są problemy z cache)

```bash
# 1. SSH do Pi
ssh pi@malina.tail384b18.ts.net

# 2. Przejdź do projektu
cd ~/journey-planner

# 3. Zatrzymaj i usuń kontenery
docker-compose down

# 4. Usuń stare obrazy (opcjonalnie)
docker rmi journey-planner-backend:local journey-planner-frontend:local

# 5. Wyczyść build cache
docker builder prune -f

# 6. Build od zera
docker-compose up -d --build --force-recreate

# 7. Sprawdź logi
docker-compose logs -f frontend
docker-compose logs -f backend
```

## 🔍 Weryfikacja Po Update

### 1. Sprawdź czy kontenery działają
```bash
docker ps | grep journey-planner

# Powinno pokazać:
# journey-planner-api      Up X minutes (healthy)
# journey-planner-web      Up X minutes (healthy)
```

### 2. Sprawdź logi (czy brak błędów)
```bash
# Frontend logi
docker logs journey-planner-web --tail 50

# Backend logi  
docker logs journey-planner-api --tail 50
```

### 3. Test endpoints
```bash
# Frontend
curl -I https://malina.tail384b18.ts.net/journey/
# Expected: HTTP/1.1 200 OK

# API Health
curl https://malina.tail384b18.ts.net/journey/api/health
# Expected: {"status":"healthy","timestamp":"..."}

# Test że assets się ładują (nie 404)
curl -I https://malina.tail384b18.ts.net/journey/assets/index-*.js
# Expected: HTTP/1.1 200 OK
```

### 4. Test w przeglądarce
- Otwórz: `https://malina.tail384b18.ts.net/journey/`
- Sprawdź **F12 → Console** - brak błędów
- Sprawdź **F12 → Network** - wszystkie requesty 200 OK
- Sprawdź **F12 → Network** - API calls idą do `/journey/api/`

## 🐛 Troubleshooting

### "No space left on device" podczas build
```bash
# Wyczyść niewykorzystane obrazy
docker system prune -a -f

# Sprawdź miejsce
df -h
```

### Frontend dalej pokazuje 404 dla assets
```bash
# Sprawdź czy pliki są w kontenerze:
docker exec journey-planner-web ls -la /usr/share/nginx/html/assets/

# Jeśli pusty, rebuild nie zadziałał
docker-compose up -d --build --force-recreate frontend
```

### Backend nie startuje - błąd połączenia z DB
```bash
# Sprawdź logi
docker logs journey-planner-api

# Sprawdź czy DB_HOST jest poprawny
docker exec journey-planner-api env | grep DB_

# Test połączenia z DB
docker exec journey-planner-api wget -qO- http://100.103.184.90:5432 || echo "DB not reachable"
```

### Container unhealthy
```bash
# Sprawdź health check
docker inspect journey-planner-web | grep -A 10 Health

# Test health endpoint ręcznie
docker exec journey-planner-web wget -qO- http://localhost/health
```

### CORS Errors w przeglądarce
Upewnij się że `CORS_ORIGIN` to tylko domena (bez `/journey`):
```env
# ❌ ŹLE:
CORS_ORIGIN=https://malina.tail384b18.ts.net/journey

# ✅ DOBRZE:
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

## 📋 Environment Variables Checklist

Po update zweryfikuj w Portainer lub `.env`:

```env
# ✅ Database (bez zmian)
DB_HOST=100.103.184.90
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=admin
DB_PASSWORD=***

# ✅ JWT (bez zmian)
JWT_SECRET=J6Z1iosY09iPKlhYZ2Dr5Ke/zPqqQeaETxKxU2yIFEc=

# ✅ SMTP (bez zmian)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=***
SMTP_PASSWORD=***
SMTP_FROM_EMAIL=***

# ⚠️ URLs - SPRAWDŹ TE:
FRONTEND_URL=https://malina.tail384b18.ts.net          # BEZ /journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api  # Z /journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net           # BEZ /journey

# ✅ Porty (bez zmian)
BACKEND_PORT=5001
FRONTEND_PORT=5173

# ✅ Docker (bez zmian)
IMAGE_TAG=local
NODE_ENV=production
```

## 🎯 Quick Command Reference

```bash
# Restart stacku bez rebuild
docker-compose restart

# Rebuild konkretnego service
docker-compose up -d --build frontend
docker-compose up -d --build backend

# Rebuild wszystkiego od zera
docker-compose down && docker-compose up -d --build --force-recreate

# Sprawdź co się dzieje
docker-compose ps
docker-compose logs -f

# Sprawdź health checks
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## ✅ Success Criteria

Stack jest gotowy gdy:
- [ ] `docker ps` pokazuje oba kontenery jako `Up` i `(healthy)`
- [ ] `curl https://malina.tail384b18.ts.net/journey/` zwraca 200 OK
- [ ] `curl https://malina.tail384b18.ts.net/journey/api/health` zwraca JSON
- [ ] W przeglądarce `/journey/` ładuje się bez błędów w console
- [ ] F12 → Network pokazuje requesty do `/journey/api/` (nie `:5001`)
- [ ] Brak 404 dla `/journey/assets/*` w logach nginx
- [ ] SmartHome dalej działa: `https://malina.tail384b18.ts.net/smarthome/`
