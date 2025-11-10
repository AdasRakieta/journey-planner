# 🚨 QUICK FIX - Frontend 404 Errors (Assets Not Found)

## Problem
Frontend kontener pokazuje błędy:
```
open() "/usr/share/nginx/html/journey/assets/index-DgdqFuUZ.js" failed (2: No such file or directory)
```

## Przyczyna
Vite budował z `base: '/journey/'`, więc HTML próbuje załadować `/journey/assets/`, ale pliki są w `/assets/`.

## ✅ Rozwiązanie (WYKONANE)

### 1. Usunięto base path z Vite
**Plik:** `client/vite.config.ts`
```typescript
// BYŁO:
base: process.env.NODE_ENV === 'production' ? '/journey/' : '/',

// JEST:
base: '/',
```

### 2. Zaktualizowano URL-e w environment variables
**Przykład (nginix.env):**
```env
# ❌ ŹLE (stare):
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
CORS_ORIGIN=https://malina.tail384b18.ts.net/

# ✅ DOBRZE (nowe):
FRONTEND_URL=https://malina.tail384b18.ts.net
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

**Kluczowe zmiany:**
- `FRONTEND_URL` BEZ `/journey` (Nginx doda to automatycznie)
- `VITE_API_URL` Z `/journey/api` (Nginx musi wiedzieć gdzie routować)
- `CORS_ORIGIN` BEZ `/journey` (to domena, nie path)

## 📝 Co Musisz Teraz Zrobić w Portainer

### Krok 1: Zaktualizuj Environment Variables
W Portainer → Stack → journey-planner → Editor → Scroll do Environment variables:

```env
FRONTEND_URL=https://malina.tail384b18.ts.net
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

**Lub jeśli używasz IP:**
```env
FRONTEND_URL=http://100.103.184.90
VITE_API_URL=http://100.103.184.90/journey/api
CORS_ORIGIN=http://100.103.184.90
```

### Krok 2: Przebuduj Stack
**W Portainer:**
1. Kliknij **"Update the stack"** na dole
2. Zaznacz **"Pull latest image version"** ✅
3. Zaznacz **"Re-pull image and redeploy"** ✅
4. Kliknij **"Update"**

**⏱️ Czas budowy:** 5-10 minut na Raspberry Pi (to normalne!)

### Krok 3: Zweryfikuj
Po zakończeniu budowy:
```bash
# Test frontend
curl -I https://malina.tail384b18.ts.net/journey/

# Test API
curl https://malina.tail384b18.ts.net/journey/api/health

# Sprawdź logi
docker logs journey-planner-frontend
docker logs journey-planner-api
```

## 🔧 Jak Działa Nginx Teraz

### Konfiguracja Nginx (na Raspberry Pi, nie w kontenerze)
```nginx
# Frontend - Nginx reverse proxy stripuje /journey
location /journey/ {
    proxy_pass http://localhost:5173/;  # ← Slash na końcu = strip prefix
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# API - Nginx rewrituje /journey/api/ -> /api/
location /journey/api/ {
    rewrite ^/journey/api/(.*) /api/$1 break;
    proxy_pass http://localhost:5001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Przepływ Requestów
```
User Request                 Nginx                    Container
───────────────────────────────────────────────────────────────
GET /journey/           →   Strip /journey/   →   GET / (index.html)
GET /journey/assets/... →   Strip /journey/   →   GET /assets/... ✅
GET /journey/api/...    →   Rewrite           →   GET /api/... ✅
```

**Kluczowe:**
- Frontend build ma `base: '/'` (pliki w `/assets/`)
- Nginx stripuje `/journey/` prefix
- Container otrzymuje clean paths: `/`, `/assets/`, etc.

## 🐛 Troubleshooting

### Frontend dalej pokazuje 404 dla assets
```bash
# Sprawdź czy pliki są w kontenerze:
docker exec journey-planner-frontend ls -la /usr/share/nginx/html/assets/

# Powinno pokazać: index-XXX.js, index-YYY.css
```

**Jeśli pusty katalog:**
- Stack nie został przebudowany
- W Portainer zaznacz "Re-pull and redeploy"

### Backend nie odpowiada na /journey/api/
```bash
# Sprawdź czy backend działa lokalnie:
curl http://localhost:5001/api/health

# Sprawdź Nginx logi:
sudo tail -f /var/log/nginx/error.log
```

### CORS Errors w przeglądarce
**Symptom:** Console pokazuje `blocked by CORS policy`

**Fix:** Upewnij się że `CORS_ORIGIN` to tylko domena:
```env
# ❌ ŹLE:
CORS_ORIGIN=https://malina.tail384b18.ts.net/journey

# ✅ DOBRZE:
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

### Container unhealthy
```bash
# Sprawdź health check:
docker inspect journey-planner-frontend | grep -A 10 Health

# Sprawdź czy nginx odpowiada:
docker exec journey-planner-frontend curl -f http://localhost/health || echo "Failed"
```

## 📚 Więcej Informacji
- **Pełna dokumentacja:** `NGINX_SETUP.md`
- **Szybkie sprawdzenie zmiennych:** `./validate-env.sh`
- **Switch między trybami:** `./switch-env-mode.sh`

## ✅ Checklist
- [ ] Zaktualizowano environment variables w Portainer
  - [ ] `FRONTEND_URL` bez `/journey`
  - [ ] `VITE_API_URL` z `/journey/api`
  - [ ] `CORS_ORIGIN` bez `/journey`
- [ ] Kliknięto "Update stack" z "Re-pull and redeploy"
- [ ] Poczekano 5-10 minut na build
- [ ] Frontend odpowiada: `curl -I https://malina.tail384b18.ts.net/journey/`
- [ ] API odpowiada: `curl https://malina.tail384b18.ts.net/journey/api/health`
- [ ] Brak błędów 404 w logach: `docker logs journey-planner-frontend`
- [ ] SmartHome dalej działa: `https://malina.tail384b18.ts.net/smarthome/`
