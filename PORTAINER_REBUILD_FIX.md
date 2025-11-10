# 🔧 Fix: Przebudowa Frontend w Portainer

## 🚨 Problem

```
Zablokowano wczytywanie mieszanych treści aktywnych „http://0.0.0.0:5001/api/auth/login"
```

**Przyczyna:**
- Frontend ma hardcoded `http://0.0.0.0:5001/api` w bundlu JavaScript
- To jest **compile-time** variable z Vite - została "zapieczona" podczas buildu
- Zmiana `.env` po buildzie **nie ma efektu** (Vite != runtime config)

**Dlaczego 0.0.0.0?**
- Prawdopodobnie GitHub Actions użył tego w build argumencie
- Lub był to default z `client/.env` podczas buildu obrazu

---

## ✅ Rozwiązanie: Local Build w Portainer

### Krok 1: Edytuj Stack w Portainer

1. **Zaloguj się do Portainer:**
   - https://malina.tail384b18.ts.net/portainer

2. **Przejdź do Stack:**
   - Stacks → `journey-planner` → Editor

3. **Odkomentuj sekcję `build` w frontend service:**

```yaml
services:
  journey-planner-web:
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}  # ← To jest kluczowe!
    # image: ghcr.io/adasrakieta/journey-planner-web:latest  # ← Zakomentuj tę linię
```

**WAŻNE:** 
- `build:` musi być **odkomentowane**
- `image:` musi być **zakomentowane** (inaczej Portainer użyje gotowego obrazu)

### Krok 2: Ustaw Environment Variables w Portainer

W sekcji **Environment Variables** (na dole edytora stacka):

```bash
# ✅ POPRAWNA konfiguracja dla Nginx:
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
CORS_ORIGIN=https://malina.tail384b18.ts.net

# Database config (bez zmian)
DB_HOST=100.103.184.90
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=admin
DB_PASSWORD=Qwuizzy123.

# JWT (bez zmian)
JWT_SECRET=J6Z1iosY09iPKlhYZ2Dr5Ke/zPqqQeaETxKxU2yIFEc=
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email (bez zmian)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=smarthome.alertmail@gmail.com
SMTP_PASSWORD=pqvg eabu bmka mggk
SMTP_FROM_EMAIL=smarthome.alertmail@gmail.com
SMTP_FROM_NAME=Journey Planner
ADMIN_EMAIL=szymon.przybysz2003@gmail.com

# App Settings
NODE_ENV=production
PORT=5001
```

**Kluczowe zmienne dla frontend build:**
```bash
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
```

### Krok 3: Update Stack z Rebuild

1. **Kliknij:** "Update the stack" (niebieski przycisk na dole)

2. **ZAZNACZ:** ✅ **"Re-build images"** (checkbox przy przycisku)
   - To jest **KRYTYCZNE** - bez tego Portainer nie przebuduje obrazu!

3. **Poczekaj:** 3-5 minut
   - Portainer będzie budował frontend od zera na Raspberry Pi
   - To trochę trwa na ARM64

### Krok 4: Sprawdź Logi Buildu

```bash
# SSH do Pi
ssh pi@100.103.184.90

# Zobacz logi stacka
docker logs journey-planner-web

# Sprawdź czy build się udał
docker images | grep journey-planner
```

**Powinno pokazać:**
```
journey-planner_journey-planner-web   latest   xxx   X minutes ago
```

### Krok 5: Zweryfikuj Bundle

```bash
# Sprawdź czy nowy bundle ma poprawny URL
docker exec journey-planner-web cat /usr/share/nginx/html/assets/index-*.js | grep -o 'https://malina[^"]*'
```

**Powinno pokazać:**
```
https://malina.tail384b18.ts.net/journey/api
```

**NIE powinno pokazać:**
```
http://0.0.0.0:5001/api  ❌
http://localhost:5001/api  ❌
```

---

## 🧪 Testowanie

### Test 1: Browser Console (F12)

1. **Otwórz:** https://malina.tail384b18.ts.net/journey/
2. **F12 → Console**
3. **Sprawdź:**
   - ❌ Brak błędów "Zablokowano wczytywanie mieszanych treści"
   - ✅ API calls do `https://malina.tail384b18.ts.net/journey/api/...`

### Test 2: Network Tab (F12)

1. **F12 → Network**
2. **Kliknij "Login" lub cokolwiek co robi API call**
3. **Sprawdź:**
   - Request URL: `https://malina.tail384b18.ts.net/journey/api/auth/login`
   - Status: 200 (lub 401 jeśli bad credentials)
   - **NIE:** `http://0.0.0.0:5001/...`

### Test 3: Backend Logs

```bash
docker logs journey-planner-api
```

**Powinno pokazać:**
```
✅ Environment loaded: .env, stack.env
✅ Configuration:
   Frontend URL: https://malina.tail384b18.ts.net/journey
   API URL: https://malina.tail384b18.ts.net/journey/api
   CORS Origin: https://malina.tail384b18.ts.net
✅ Database connected successfully
✅ Server running at: https://malina.tail384b18.ts.net/journey/api
```

---

## 🚨 Troubleshooting

### Problem: Build trwa bardzo długo (>10 min)

**Przyczyna:** Raspberry Pi ma słabą moc obliczeniową dla kompilacji TypeScript + Vite

**Rozwiązanie 1 - Poczekaj:**
```bash
# Sprawdź czy build jeszcze trwa
docker ps | grep journey-planner-web

# Zobacz logi na żywo
docker logs -f journey-planner-web
```

**Rozwiązanie 2 - Build na Windows i push do GitHub:**
```powershell
# Lokalnie na Windows
cd client
npm run build

# Zbuduj obraz multi-arch
docker buildx build --platform linux/arm64 `
  --build-arg VITE_API_URL=https://malina.tail384b18.ts.net/journey/api `
  -t ghcr.io/adasrakieta/journey-planner-web:latest `
  --push .
```

Wtedy w Portainer użyj `image:` zamiast `build:`.

### Problem: "No such file or directory" podczas buildu

**Przyczyna:** Portainer nie ma dostępu do plików źródłowych z GitHub

**Rozwiązanie:**
```bash
# SSH do Pi
ssh pi@100.103.184.90

# Przejdź do katalogu gdzie Portainer trzyma stack
cd /opt/stacks/journey-planner
# LUB
cd /var/lib/docker/volumes/portainer_data/_data/compose/

# Sprawdź czy masz client/
ls -la

# Jeśli nie ma - sklonuj repo
git clone https://github.com/AdasRakieta/journey-planner.git
mv journey-planner/* .
```

### Problem: Build się udał ale nadal http://0.0.0.0

**Przyczyna:** Portainer nie użył nowego obrazu lub cache

**Rozwiązanie:**
```bash
# Zatrzymaj stack
docker-compose -f /path/to/docker-compose.yml down

# Usuń stary obraz
docker rmi journey-planner_journey-planner-web:latest

# Wyczyść cache buildu
docker builder prune -a

# Uruchom stack ponownie w Portainer z ✅ Re-build images
```

### Problem: CORS errors nadal występują

**Przyczyna:** Backend nie ma poprawnego `CORS_ORIGIN`

**Rozwiązanie:**
```bash
# Sprawdź logi backendu
docker logs journey-planner-api

# Powinno pokazać:
# CORS Origin: https://malina.tail384b18.ts.net

# Jeśli nie - dodaj do Environment Variables:
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

---

## 📋 Checklist przed Rebuild

- ✅ Nginx config zastosowany i przetestowany (`nginx -t`)
- ✅ `docker-compose.yml` ma sekcję `build:` z `args.VITE_API_URL`
- ✅ `VITE_API_URL=https://malina.tail384b18.ts.net/journey/api` w Portainer env vars
- ✅ `CORS_ORIGIN=https://malina.tail384b18.ts.net` w Portainer env vars
- ✅ Zaznaczony checkbox "Re-build images" przy update stacka

---

## 📋 Checklist po Rebuild

- ✅ Build zakończył się sukcesem (brak błędów w logach)
- ✅ Bundle ma poprawny URL (`docker exec ... cat ... | grep https://malina`)
- ✅ Browser console nie ma błędów mixed content
- ✅ API calls idą do `https://malina.tail384b18.ts.net/journey/api/...`
- ✅ Login/Register/Forgot Password działają

---

## ⏱️ Czas wykonania

| Krok | Czas |
|------|------|
| Edycja stacka w Portainer | 2 min |
| Build obrazu frontend | 3-5 min |
| Deploy i restart | 1 min |
| Testowanie | 2 min |
| **TOTAL** | **8-10 min** |

---

## 🎯 Dlaczego to działa?

### Vite Compile-Time vs Runtime

```typescript
// ❌ To NIE DZIAŁA - Vite nie wspiera runtime env vars
const apiUrl = process.env.VITE_API_URL;

// ✅ To DZIAŁA - ale jest compile-time!
const apiUrl = import.meta.env.VITE_API_URL;
// Podczas buildu Vite zastępuje to literałem:
// const apiUrl = "https://malina.tail384b18.ts.net/journey/api";
```

**Dlatego:**
- Zmiana `.env` po buildzie = bez efektu
- Trzeba przebudować frontend z poprawnym `VITE_API_URL`
- Build argument w Dockerfile przekazuje tę wartość do buildu

### Dockerfile Flow

```dockerfile
# 1. Przyjmij argument z docker-compose
ARG VITE_API_URL=http://localhost:5001/api

# 2. Ustaw jako environment variable
ENV VITE_API_URL=${VITE_API_URL}

# 3. Zbuduj frontend (Vite użyje ENV var)
RUN npm run build
# W tym momencie VITE_API_URL zostaje "zapieczone" w bundle!

# 4. Skopiuj do produkcyjnego obrazu
COPY --from=builder /app/dist /usr/share/nginx/html
```

---

## 📚 Powiązana Dokumentacja

- `FRONTEND_BUILD_CRITICAL.md` - Wyjaśnienie problemu compile-time
- `PORTAINER_LOCAL_BUILD.md` - Oryginalny guide
- `URL_CONFIGURATION_GUIDE.md` - Kiedy używać `/journey/`
- `NGINX_ASSETS_FIX.md` - Fix dla asset loading

---

**Czas na rebuild! Po przebudowaniu frontend będzie używał HTTPS i wszystko powinno działać.** 🚀
