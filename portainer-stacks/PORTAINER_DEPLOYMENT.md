# 🚀 Portainer Multi-Stack Deployment Guide

## 📋 Przegląd

Deployment składa się z **3 osobnych stacków** w Portainerze:

1. **Traefik** - Reverse proxy (deploy PIERWSZY)
2. **Journey Planner** - Aplikacja do planowania podróży
3. **SmartHome** - Aplikacja do automatyki domowej

### 🌐 Struktura URL:

```
https://malina.tail384b18.ts.net/           → Root (można dodać landing page)
https://malina.tail384b18.ts.net/journey    → Journey Planner
https://malina.tail384b18.ts.net/smarthome  → SmartHome
https://malina.tail384b18.ts.net/dashboard/ → Traefik Dashboard
```

---

## 📦 KROK 1: Deploy Traefik (Reverse Proxy)

### W Portainerze:

1. **Stacks** → **Add Stack**
2. **Name:** `traefik`
3. **Web editor:** Wklej zawartość `1-traefik-stack.yml`
4. **Deploy the stack**

### Weryfikacja:

```bash
# SSH do Raspberry Pi
ssh user@malina.tail384b18.ts.net

# Sprawdź czy Traefik działa
docker ps | grep traefik

# Sprawdź network 'web'
docker network ls | grep web

# Sprawdź logi
docker logs traefik --tail 20
```

### Testowanie:

Otwórz w przeglądarce:
```
https://malina.tail384b18.ts.net/dashboard/
```

Powinieneś zobaczyć Traefik Dashboard (może być pusty - to OK).

---

## 📦 KROK 2: Deploy Journey Planner

### W Portainerze:

1. **Stacks** → **Add Stack**
2. **Name:** `journey-planner`
3. **Web editor:** Wklej zawartość `2-journey-planner-stack.yml`
4. **Environment variables:** Wklej zawartość `journey-planner.env`
   - Kliknij "Load variables from .env file" → Wklej całą zawartość
5. **Deploy the stack**

### ⏱️ Czas buildu:

- **Pierwsz deploy:** ~5-10 minut (pull images z ghcr.io)
- **Kolejne:** ~1-2 minuty (jeśli images są cached)

### Weryfikacja:

```bash
# Sprawdź kontenery
docker ps | grep journey-planner

# Sprawdź logi backend
docker logs journey-planner-api --tail 30

# Szukaj:
# ✅ PostgreSQL connected successfully!
# ✅ Using PostgreSQL database - JSON fallback disabled

# Sprawdź logi frontend
docker logs journey-planner-web --tail 20

# Test API
curl -I https://malina.tail384b18.ts.net/journey/api/health
```

### Testowanie:

Otwórz w przeglądarce:
```
https://malina.tail384b18.ts.net/journey
```

**Login:**
- Username: `admin`
- Password: `admin123`

---

## 📦 KROK 3: Deploy SmartHome

### W Portainerze:

1. **Stacks** → **Add Stack**
2. **Name:** `smarthome`
3. **Web editor:** Wklej zawartość `3-smarthome-stack.yml`
4. **Environment variables:** Wklej zawartość `smarthome.env`
   - **⚠️ UWAGA:** Zaktualizuj następujące zmienne:
     - `SECRET_KEY` - Wygeneruj nowy: `python -c "import secrets; print(secrets.token_hex(32))"`
     - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Twoje credentials PostgreSQL
5. **Deploy the stack**

### Weryfikacja:

```bash
# Sprawdź kontenery
docker ps | grep smarthome

# Sprawdź Redis
docker logs smarthome_redis_standalone --tail 10

# Sprawdź aplikację
docker logs smarthome_app --tail 30

# Test health check (jeśli jest /health endpoint)
curl -I https://malina.tail384b18.ts.net/smarthome/
```

### Testowanie:

Otwórz w przeglądarce:
```
https://malina.tail384b18.ts.net/smarthome
```

Zaloguj się swoimi credentials SmartHome.

---

## 🔧 Konfiguracja Environment Variables

### Journey Planner - Kluczowe zmienne:

```bash
# URLs (NIE ZMIENIAJ - są już poprawne)
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net

# Database (sprawdź czy credentials są poprawne)
DB_HOST=192.168.1.218
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=QWERasdf1234!@#$

# JWT Secret (już ustawiony)
JWT_SECRET=J6Z1iosY09iPKlhYZ2Dr5Ke/zPqqQeaETxKxU2yIFEc=
```

### SmartHome - Kluczowe zmienne:

```bash
# ⚠️ DO ZMIANY:
SECRET_KEY=your_secret_key_here_generate_new_one
DB_PASSWORD=your_db_password_here

# URLs (puste - Traefik dodaje prefix automatycznie)
URL_PREFIX=
API_PREFIX=
STATIC_PREFIX=
SOCKET_PREFIX=

# Redis (internal network - NIE ZMIENIAJ)
REDIS_HOST=smarthome_redis_standalone
REDIS_PORT=6379
```

---

## 🐛 Troubleshooting

### Problem 1: "network web not found"

**Rozwiązanie:**
```bash
# Utwórz network ręcznie
docker network create web

# Lub zrestartuj Traefik stack
```

### Problem 2: Journey Planner - CORS errors

**Diagnoza:** CORS_ORIGIN nie pasuje do domeny

**Rozwiązanie:**
```bash
# W Portainer → Stack → journey-planner → Editor → Environment variables
# Sprawdź:
CORS_ORIGIN=https://malina.tail384b18.ts.net
# (BEZ /journey na końcu!)
```

### Problem 3: SmartHome - 502 Bad Gateway

**Diagnoza:** App nie startuje lub Redis nie działa

**Rozwiązanie:**
```bash
# Sprawdź Redis
docker logs smarthome_redis_standalone

# Sprawdź SmartHome app
docker logs smarthome_app

# Sprawdź czy są w tej samej sieci
docker network inspect smarthome-net
```

### Problem 4: Traefik nie widzi kontenera

**Diagnoza:** Kontener nie jest w sieci 'web' lub labels są źle

**Rozwiązanie:**
```bash
# Sprawdź network
docker inspect journey-planner-api | grep -A 10 Networks

# Sprawdź labels
docker inspect journey-planner-api | grep -A 50 Labels

# Dodaj do sieci jeśli brakuje
docker network connect web journey-planner-api
```

### Problem 5: Nie mogę zalogować się do Journey Planner

**Rozwiązanie:**
```bash
# Sprawdź czy admin user istnieje w bazie
docker exec <postgres-container> psql -U journey_user -d journey_planner \
  -c "SELECT username, email, role FROM users WHERE username='admin';"

# Jeśli nie ma, użyj pgsql_connect i utwórz (patrz wcześniejsze instrukcje)
```

---

## 📊 Status Check Script

Stwórz plik `check-all-stacks.sh`:

```bash
#!/bin/bash

echo "==================================="
echo "🚀 PORTAINER STACKS STATUS CHECK"
echo "==================================="
echo ""

echo "📌 1. TRAEFIK"
echo "-----------------------------------"
docker ps --filter "name=traefik" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "📌 2. JOURNEY PLANNER"
echo "-----------------------------------"
docker ps --filter "name=journey-planner" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "📌 3. SMARTHOME"
echo "-----------------------------------"
docker ps --filter "name=smarthome" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "🌐 NETWORKS"
echo "-----------------------------------"
docker network ls | grep -E "web|journey|smarthome"
echo ""

echo "📡 TRAEFIK ROUTERS (via logs)"
echo "-----------------------------------"
docker logs traefik 2>&1 | grep -i "Creating" | tail -10
echo ""

echo "🔗 PUBLIC URLS"
echo "-----------------------------------"
echo "Traefik Dashboard: https://malina.tail384b18.ts.net/dashboard/"
echo "Journey Planner:   https://malina.tail384b18.ts.net/journey"
echo "SmartHome:         https://malina.tail384b18.ts.net/smarthome"
echo ""

echo "✅ Health Checks"
echo "-----------------------------------"
echo "Journey API:"
curl -s -o /dev/null -w "%{http_code}" https://malina.tail384b18.ts.net/journey/api/health
echo ""

echo "SmartHome:"
curl -s -o /dev/null -w "%{http_code}" https://malina.tail384b18.ts.net/smarthome/
echo ""

echo "==================================="
echo "✅ Status check complete!"
echo "==================================="
```

Uruchom:
```bash
chmod +x check-all-stacks.sh
./check-all-stacks.sh
```

---

## 🎯 Deployment Checklist

### ✅ Pre-Deployment:
- [ ] PostgreSQL działa na 192.168.1.218:5432
- [ ] Baza `journey_planner` istnieje z userem admin
- [ ] Baza `smarthome_db` istnieje (jeśli SmartHome używa PostgreSQL)
- [ ] Tailscale działa: `malina.tail384b18.ts.net` jest dostępny

### ✅ Traefik Stack:
- [ ] Stack deployed w Portainerze
- [ ] Kontener `traefik` działa
- [ ] Network `web` istnieje
- [ ] Dashboard dostępny: https://malina.tail384b18.ts.net/dashboard/

### ✅ Journey Planner Stack:
- [ ] Stack deployed z environment variables
- [ ] `journey-planner-api` działa
- [ ] `journey-planner-web` działa
- [ ] Oba kontenery w sieci `web`
- [ ] Login działa: admin / admin123
- [ ] URL: https://malina.tail384b18.ts.net/journey

### ✅ SmartHome Stack:
- [ ] Stack deployed z zaktualizowanymi credentials
- [ ] `smarthome_redis_standalone` działa
- [ ] `smarthome_app` działa
- [ ] Oba kontenery w sieci `web`
- [ ] Login działa (twoje credentials)
- [ ] URL: https://malina.tail384b18.ts.net/smarthome

---

## 📚 Pliki w Repozytorium

```
portainer-stacks/
├── 1-traefik-stack.yml          → Deploy PIERWSZY
├── 2-journey-planner-stack.yml  → Deploy DRUGI
├── 3-smarthome-stack.yml        → Deploy TRZECI
├── journey-planner.env          → Environment variables dla Journey
├── smarthome.env                → Environment variables dla SmartHome
└── PORTAINER_DEPLOYMENT.md      → Ten plik
```

---

## 🔄 Aktualizacja Aplikacji

### Journey Planner:

```bash
# W Portainerze:
# Stacks → journey-planner → Editor → Deploy
# Zaznacz: ☑️ Re-pull image and redeploy

# Lub przez CLI:
docker pull ghcr.io/adasrakieta/journey-planner/backend:latest
docker pull ghcr.io/adasrakieta/journey-planner/frontend:latest
docker restart journey-planner-api journey-planner-web
```

### SmartHome:

```bash
# W Portainerze:
# Stacks → smarthome → Editor → Deploy
# Zaznacz: ☑️ Re-pull image and redeploy

# Lub przez CLI:
docker pull ghcr.io/adasrakieta/site_proj/smarthome_app:latest
docker restart smarthome_app
```

---

## 🎉 Gotowe!

Po pomyślnym deployment wszystkie aplikacje powinny być dostępne:

- 🎯 **Journey Planner:** https://malina.tail384b18.ts.net/journey
- 🏠 **SmartHome:** https://malina.tail384b18.ts.net/smarthome
- 📊 **Traefik Dashboard:** https://malina.tail384b18.ts.net/dashboard/

**Uwagi:**
- Pierwsze deployment może zająć 10-15 minut (pobieranie images)
- Sprawdź logi każdego kontenera po deployment
- Upewnij się że CORS_ORIGIN jest bez trailing slash i bez /journey
- Redis w SmartHome jest internal - nie potrzebuje zewnętrznego dostępu

---

**Powodzenia! 🚀**
