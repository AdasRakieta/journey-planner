# 🚀 DEPLOYMENT FIX - Path-Based Routing dla /journey i /smarthome

## 🐛 Problemy które naprawiłem

1. **Przekierowanie po odświeżeniu strony**: Gdy użytkownik był na `/journey/settings` i odświeżał stronę, był przekierowywany do SmartHome
2. **Niedziałające API na telefonie**: "Loading journeys..." w nieskończoność, przyciski + i New Journey nie działały
3. **Konflikty między aplikacjami**: SmartHome i Journey mieszały się ze sobą
4. **🔴 GŁÓWNY PROBLEM**: Hardcoded `window.location.href = '/login'` przekierowywał do root `/` zamiast `/journey/login`, co powodowało że aplikacja spadała do SmartHome

## ✅ Co zostało naprawione

### 1. Frontend Configuration (`client/vite.config.ts`)
```typescript
// PRZED:
base: '/',  // ❌ Źle - wszystkie assety z root path

// PO:
base: '/journey/',  // ✅ Dobrze - wszystkie assety z /journey/assets/
```

### 2. React Router (`client/src/main.tsx`)
```typescript
// PRZED:
<BrowserRouter>  // ❌ Routing od root /

// PO:
<BrowserRouter basename="/journey">  // ✅ Routing od /journey/
```

### 3. Production API URL (`client/.env.production` - NOWY PLIK)
```env
# Relative path - działa zarówno przez domenę jak i localhost
VITE_API_URL=/journey/api
```

### 4. **🔴 KRYTYCZNY FIX**: Hardcoded Redirects
Naprawiono wszystkie `window.location.href = '/login'` na `window.location.pathname = '/journey/login'`:
- ✅ `client/src/contexts/AuthContext.tsx` - logout redirect
- ✅ `client/src/services/authApi.ts` - token refresh failure redirect  
- ✅ `client/src/pages/ForgotPasswordPage.tsx` - password reset redirect

**Dlaczego to było krytyczne:**
```typescript
// PRZED (❌):
window.location.href = '/login'
// Przekierowywało do: https://malina.../login (ROOT - SmartHome!)

// PO (✅):
window.location.pathname = '/journey/login'
// Przekierowuje do: https://malina.../journey/login (Journey Planner!)
```

### 5. Nginx Configuration (`nginx.conf`)
- ✅ Usunięto problematyczny `location /assets/` (bez journey prefix)
- ✅ Poprawiono SPA fallback dla React Router
- ✅ Upewniono się że `/journey/` nie spada do `location /` (SmartHome)

## 📦 Jak zdeployować naprawioną wersję

### Krok 1: Build lokalnie (opcjonalnie - testowanie)
```powershell
# W katalogu głównym projektu
cd client
npm run build

# Sprawdź czy w dist/index.html są linki z /journey/assets/
# Przykład: <script type="module" crossorigin src="/journey/assets/index-abc123.js"></script>
```

### Krok 2: Commit i push zmian
```powershell
cd ..  # powrót do głównego katalogu
git add .
git commit -m "fix: naprawiono path-based routing dla /journey/ - dodano base path, basename, .env.production"
git push origin main
```

### Krok 3: Deploy przez Portainer

#### A) Jeśli budujesz lokalnie i pushujesz do GHCR:
```powershell
# Z katalogu głównego projektu

# 1. Build i tag frontendu z poprawną konfiguracją
cd client
docker build --build-arg VITE_API_URL=/journey/api -t ghcr.io/adasrakieta/journey-planner/frontend:latest .

# 2. Push do GitHub Container Registry
docker push ghcr.io/adasrakieta/journey-planner/frontend:latest

# 3. W Portainer: Pull nowego obrazu i restart stacka
```

#### B) Jeśli Portainer buduje z repo (Build method):
W Portainer Stack Editor:

1. **Update stack** (jeśli używasz build from repo)
2. W sekcji **Environment variables** upewnij się że masz:
   ```
   VITE_API_URL=/journey/api
   CORS_ORIGIN=https://malina.tail384b18.ts.net
   ```
3. Kliknij **Update the stack**
4. Portainer automatycznie zbuduje nowy obraz z `.env.production`

### Krok 4: Update Nginx config na serwerze
```bash
# SSH do Raspberry Pi
ssh adas.rakieta@192.168.1.218

# Backup starej konfiguracji
sudo cp /opt/nginx/nginx.conf /opt/nginx/nginx.conf.backup-$(date +%Y%m%d)

# Skopiuj nową konfigurację (z Twojego lokalnego komputera)
# W PowerShell na Windows:
scp "c:\Users\pz_przybysz\Documents\git\journey-planner\nginx.conf" adas.rakieta@192.168.1.218:~/nginx.conf

# Następnie na serwerze:
sudo mv ~/nginx.conf /opt/nginx/nginx.conf
sudo docker exec nginx-proxy nginx -t  # Test konfiguracji
sudo docker exec nginx-proxy nginx -s reload  # Reload bez downtime
```

### Krok 5: Restart Journey Planner Stack
```bash
# W Portainer UI lub przez Docker CLI na serwerze:
cd /gdzie/masz/docker-compose
docker-compose restart journey-planner-web
docker-compose restart journey-planner-api

# LUB w Portainer:
# Stacks -> journey-planner -> Restart
```

### Krok 6: Weryfikacja
Otwórz w przeglądarce (również na telefonie!):
1. https://malina.tail384b18.ts.net/journey/
2. Zaloguj się
3. Sprawdź czy "Your Journeys" się ładuje (nie Loading w nieskończoność)
4. Kliknij "+ New Journey" - powinno działać
5. Przejdź do Settings (https://malina.tail384b18.ts.net/journey/settings)
6. **Odśwież stronę (F5)** - powinieneś zostać w /journey/settings (nie przekierowanie do SmartHome!)
7. Sprawdź SmartHome: https://malina.tail384b18.ts.net/smarthome/ - powinno działać niezależnie

## 🔍 Troubleshooting

### Problem: Nadal przekierowuje do SmartHome po odświeżeniu
**Rozwiązanie**: 
- Sprawdź w DevTools (F12) -> Network tab -> czy assety są ładowane z `/journey/assets/` czy z `/assets/`
- Jeśli z `/assets/`, frontend nie został przebudowany z `base: '/journey/'`
- Wykonaj: `cd client && npm run build` i przekopiuj `dist/` do kontenera

### Problem: "Loading journeys..." w nieskończoność
**Rozwiązanie**:
- Otwórz DevTools (F12) -> Console - sprawdź czy są błędy CORS lub 404
- Sprawdź Network tab -> czy API calls idą do `/journey/api/journeys` czy do `localhost:5001/api/journeys`
- Jeśli do localhost, `.env.production` nie był użyty podczas buildu
- Przebuduj frontend: `docker build --build-arg VITE_API_URL=/journey/api ...`

### Problem: SmartHome nie działa
**Rozwiązanie**:
- Sprawdź czy kontener `smarthome_app` jest uruchomiony i dostępny w sieci `web`
- `docker ps | grep smarthome`
- `docker network inspect web` - upewnij się że journey i smarthome są w tej samej sieci

### Problem: 502 Bad Gateway na /journey/api/
**Rozwiązanie**:
- Backend nie odpowiada lub nie jest w sieci `web`
- `docker logs journey-planner-api` - sprawdź logi backendu
- Upewnij się że CORS_ORIGIN jest ustawiony na `https://malina.tail384b18.ts.net`

## 📝 Ważne notatki

1. **Frontend MUSI być zbudowany z `base: '/journey/'`** - bez tego przekierowania będą się zdarzać
2. **`.env.production` jest automatycznie używany przez Vite** podczas `npm run build` w production mode
3. **Nginx location order matters** - `/journey/` musi być PRZED `location /` (catch-all)
4. **SmartHome jest catch-all** w `location /` - wszystko co nie pasuje do `/journey/` trafia do SmartHome
5. **VITE_API_URL=/journey/api** (relative path) działa lepiej niż absolute URL - wspiera zarówno HTTP jak HTTPS

## 🎯 Dlaczego to teraz działa?

### PRZED (❌ Nie działało):

**Scenariusz 1: Odświeżenie strony**
```
Użytkownik: https://malina.../journey/settings
     ↓
Vite base='/' → assety z /assets/ (bez /journey prefix)
     ↓
Nginx: location /assets/ → próbuje journey_frontend
     ↓
404 → spada do location / → SmartHome!
     ↓
PRZEKIEROWANIE DO SMARTHOME ❌
```

**Scenariusz 2: Logout/Refresh token failure**
```
Token wygasł → authApi.ts
     ↓
window.location.href = '/login'
     ↓
Przekierowanie do https://malina.../login (ROOT!)
     ↓
Nginx: location / → SmartHome
     ↓
UŻYTKOWNIK W SMARTHOME ZAMIAST JOURNEY LOGIN ❌
```

### PO (✅ Działa):

**Scenariusz 1: Odświeżenie strony**
```
Użytkownik: https://malina.../journey/settings
     ↓
Vite base='/journey/' → assety z /journey/assets/
     ↓
React Router basename='/journey' → routing od /journey/
     ↓
Nginx: location /journey/assets/ → journey_frontend
     ↓
200 OK → assety załadowane ✅
     ↓
Nginx: location /journey/ → SPA routing działa
     ↓
404 na /settings → @journey_spa_fallback → index.html ✅
     ↓
React Router renderuje /settings w przeglądarce ✅
```

**Scenariusz 2: Logout/Refresh token failure**
```
Token wygasł → authApi.ts
     ↓
window.location.pathname = '/journey/login'
     ↓
Przekierowanie do https://malina.../journey/login ✅
     ↓
Nginx: location /journey/ → journey_frontend
     ↓
React Router (basename='/journey') renderuje /login ✅
     ↓
UŻYTKOWNIK WIDZI JOURNEY LOGIN PAGE ✅
```

## 🚀 Quick Deploy Commands (all-in-one)

```powershell
# 1. Commit zmiany
git add .
git commit -m "fix: path-based routing /journey/ + /smarthome/"
git push origin main

# 2. Build i push frontend (z poprawnym VITE_API_URL)
cd client
docker build --build-arg VITE_API_URL=/journey/api -t ghcr.io/adasrakieta/journey-planner/frontend:latest .
docker push ghcr.io/adasrakieta/journey-planner/frontend:latest

# 3. Update nginx.conf na serwerze
scp "nginx.conf" adas.rakieta@192.168.1.218:/tmp/nginx.conf
ssh adas.rakieta@192.168.1.218 "sudo cp /tmp/nginx.conf /opt/nginx/nginx.conf && sudo docker exec nginx-proxy nginx -s reload"

# 4. Restart Journey Planner w Portainer UI
# LUB przez SSH:
ssh adas.rakieta@192.168.1.218 "docker restart journey-planner-web journey-planner-api"
```

---

**Status**: ✅ Wszystkie zmiany gotowe do deployment
**Testowane na**: Windows localhost (dev), production będzie działać identycznie po rebuildu
**Kompatybilność**: Journey Planner + SmartHome działają niezależnie pod różnymi paths
