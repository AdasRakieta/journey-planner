# ✅ Quick Checklist - GitHub Auto-Build Setup

## 1️⃣ Sprawdź Build na GitHub (TERAZ!)

1. Otwórz: https://github.com/AdasRakieta/journey-planner/actions
2. Powinien być **running** workflow: "Build and Push Journey Planner Docker Images"
3. Poczekaj ~10-15 minut aż się skończy
4. Sprawdź czy jest ✅ zielony checkmark

**Jeśli build failed:**
- Kliknij na workflow → Zobacz logi → Napraw błąd → Push fix

## 2️⃣ Ustaw Obrazy Jako Publiczne (JEDNORAZOWO)

### Metoda A: Przez GitHub UI

1. **Przejdź do Packages:**
   - https://github.com/AdasRakieta?tab=packages

2. **Backend:**
   - Kliknij: `journey-planner/backend`
   - Prawy panel → **Package settings**
   - **Change visibility** → **Public**
   - Wpisz: `journey-planner/backend`
   - **I understand, change package visibility**

3. **Frontend:**
   - Wróć do: https://github.com/AdasRakieta?tab=packages
   - Kliknij: `journey-planner/frontend`
   - Prawy panel → **Package settings**
   - **Change visibility** → **Public**
   - Wpisz: `journey-planner/frontend`
   - **I understand, change package visibility**

### Metoda B: Zostaw Private + Login na Pi

```bash
# Na Raspberry Pi
# Wygeneruj token: GitHub → Settings → Developer settings → 
# Personal access tokens → Tokens (classic) → Generate new token
# Scopes: read:packages

echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u AdasRakieta --password-stdin
```

## 3️⃣ Zaktualizuj Stack w Portainer

### W Portainer Web UI:

1. **Stacks → journey-planner**
2. **Editor** (góra strony)
3. **Environment variables** (scroll w dół):
   ```
   IMAGE_TAG=latest
   FRONTEND_URL=https://malina.tail384b18.ts.net
   VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
   CORS_ORIGIN=https://malina.tail384b18.ts.net
   ```
4. **Update the stack** (na dole)
5. ✅ **"Pull latest image version"** - ZAZNACZ!
6. ✅ **"Re-pull image and redeploy"** - ZAZNACZ!
7. **Update**
8. Poczekaj 1-2 minuty

### LUB przez SSH:

```bash
ssh pi@malina.tail384b18.ts.net
cd ~/journey-planner
git pull origin main
cp nginix.env .env
docker-compose pull
docker-compose up -d
```

## 4️⃣ Weryfikacja

```bash
# Test frontend
curl -I https://malina.tail384b18.ts.net/journey/
# Expected: HTTP/2 200

# Test API
curl https://malina.tail384b18.ts.net/journey/api/health
# Expected: {"status":"healthy",...}

# Check containers
docker ps | grep journey-planner
# Expected: Both "Up" and "(healthy)"

# Check logs (brak 404 dla assets)
docker logs journey-planner-web --tail 30
```

## 5️⃣ Test w Przeglądarce

1. Otwórz: `https://malina.tail384b18.ts.net/journey/`
2. **F12 → Console** - brak błędów ❌
3. **F12 → Network** - wszystkie requesty 200 ✅
4. **F12 → Network** - API calls idą do `/journey/api/` ✅
5. Mapa się ładuje ✅
6. SmartHome działa: `https://malina.tail384b18.ts.net/smarthome/` ✅

## 🎉 Done!

Teraz przy każdym `git push origin main`:
- GitHub automatycznie zbuduje obrazy
- Portainer może je pull'ować jednym kliknięciem
- Deployment zajmuje 1-2 minuty (nie 10 minut!)

---

## 🐛 Jeśli Coś Nie Działa

### GitHub Actions failed
```bash
# Sprawdź: https://github.com/AdasRakieta/journey-planner/actions
# Kliknij na failed run → Zobacz logi
```

### Portainer: "pull access denied"
```bash
# Obrazy są private - ustaw jako Public (krok 2 powyżej)
# LUB zaloguj Pi do ghcr.io (metoda B)
```

### Frontend 404 dla assets
```bash
# Sprawdź czy używa nowych obrazów
docker images | grep journey-planner

# Powinno być ghcr.io/adasrakieta/journey-planner/...
# Jeśli jest journey-planner-frontend:local - pull nie zadziałał

# Force pull:
docker-compose pull
docker-compose up -d --force-recreate
```

### Container unhealthy
```bash
# Sprawdź logi
docker logs journey-planner-web
docker logs journey-planner-api

# Sprawdź health check
docker inspect journey-planner-web | grep -A 10 Health
```

---

**Dokumentacja:** `GITHUB_ACTIONS_SETUP.md`
