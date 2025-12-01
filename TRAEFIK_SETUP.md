# 🚀 Traefik Multi-App Deployment Guide

## 📋 Przegląd

Traefik to reverse proxy, który automatycznie wykrywa kontenery Docker i konfiguruje routing na podstawie labels.

### Struktura URL:
```
https://malina.tail384b18.ts.net/journey     → Journey Planner (frontend)
https://malina.tail384b18.ts.net/journey/api → Journey Planner (backend)
https://malina.tail384b18.ts.net/smarthome   → SmartHome (jeśli skonfigurujesz)
https://malina.tail384b18.ts.net/dashboard   → Traefik Dashboard
```

---

## 🔧 Krok 1: Deploy Traefik

### Opcja A: Przez Portainer (zalecane)

1. **Portainer** → **Stacks** → **Add Stack**
2. **Name:** `traefik`
3. **Web editor:** Wklej zawartość `traefik-docker-compose.yml`
4. **Deploy the stack**

### Opcja B: Przez SSH/Terminal

```bash
cd /path/to/journey-planner
docker-compose -f traefik-docker-compose.yml up -d
```

### Weryfikacja:

```bash
# Sprawdź czy Traefik działa
docker ps | grep traefik

# Sprawdź czy network 'web' istnieje
docker network ls | grep web

# Sprawdź logi
docker logs traefik
```

---

## 🔧 Krok 2: Deploy Journey Planner

### W Portainerze:

1. **Stacks** → **Add Stack** (lub zaktualizuj istniejący)
2. **Name:** `journey-planner`
3. **Web editor:** Wklej zawartość `docker-compose.yml`
4. **Environment variables:** Wklej zawartość `stack.env`
5. **Deploy the stack**

**WAŻNE:** Upewnij się że te zmienne są ustawione:
```bash
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

---

## 🐛 Troubleshooting

### Problem 1: "network web not found"

**Diagnoza:** Network 'web' nie istnieje lub nie jest external

**Rozwiązanie:**
```bash
# Utwórz network ręcznie
docker network create web

# Lub zrestartuj Traefik
docker-compose -f traefik-docker-compose.yml down
docker-compose -f traefik-docker-compose.yml up -d
```

### Problem 2: CORS errors (Same Origin Policy)

**Diagnoza:** CORS_ORIGIN nie pasuje do URL z przeglądarki

**Rozwiązanie:**
```bash
# W Portainer → Stack → Edit → Environment variables
# Upewnij się że:
CORS_ORIGIN=https://malina.tail384b18.ts.net
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api

# Po zmianie: Redeploy stack
```

### Problem 3: 404 Not Found

**Diagnoza:** Traefik nie widzi kontenera Journey Planner

**Rozwiązanie:**
```bash
# Sprawdź czy kontenery są w sieci 'web'
docker inspect journey-planner-api | grep -A 10 Networks
docker inspect journey-planner-web | grep -A 10 Networks

# Powinny być w 'web' i 'journey-planner-net'

# Jeśli nie, dodaj do sieci:
docker network connect web journey-planner-api
docker network connect web journey-planner-web
```

### Problem 4: Backend zwraca 502 Bad Gateway

**Diagnoza:** Backend nie działa lub nie jest w sieci 'web'

**Rozwiązanie:**
```bash
# Sprawdź logi backend
docker logs journey-planner-api --tail 50

# Sprawdź health check
curl http://localhost:5001/api/health

# Sprawdź czy backend jest w sieci 'web'
docker network inspect web
```

### Problem 5: Traefik Dashboard nie działa

**Diagnoza:** Dashboard jest wyłączony lub źle skonfigurowany

**Rozwiązanie:**
```bash
# Sprawdź czy Traefik ma włączony dashboard
docker inspect traefik | grep api.dashboard

# Sprawdź Traefik UI:
https://malina.tail384b18.ts.net/dashboard/
# (UWAGA: Slash na końcu jest wymagany!)
```

---

## 📊 Sprawdzanie Statusu

### Script diagnostyczny:

```bash
#!/bin/bash
echo "=== Traefik Status ==="
docker ps | grep traefik
echo ""

echo "=== Journey Planner Status ==="
docker ps | grep journey-planner
echo ""

echo "=== Networks ==="
docker network ls | grep -E "web|journey"
echo ""

echo "=== Web Network Containers ==="
docker network inspect web | grep Name
echo ""

echo "=== Traefik Logs (last 10 lines) ==="
docker logs traefik --tail 10
echo ""

echo "=== Backend Health Check ==="
curl -s http://localhost:5001/api/health | jq '.'
echo ""

echo "=== Public URLs ==="
echo "Frontend: https://malina.tail384b18.ts.net/journey"
echo "Backend API: https://malina.tail384b18.ts.net/journey/api/health"
echo "Traefik Dashboard: https://malina.tail384b18.ts.net/dashboard/"
```

Zapisz jako `check-traefik.sh`, nadaj uprawnienia: `chmod +x check-traefik.sh`

---

## 🔐 Bezpieczeństwo (Opcjonalne)

### Dodanie Basic Auth do Traefik Dashboard:

```bash
# 1. Wygeneruj hasło
htpasswd -nb admin yourpassword
# Output: admin:$apr1$hash$here

# 2. W traefik-docker-compose.yml, dodaj labels:
labels:
  - "traefik.http.routers.traefik-dashboard.middlewares=traefik-auth"
  - "traefik.http.middlewares.traefik-auth.basicauth.users=admin:$$apr1$$hash$$here"
# UWAGA: Dollar signs muszą być escaped ($$)

# 3. Restart Traefik
docker-compose -f traefik-docker-compose.yml up -d --force-recreate
```

---

## 🎯 Dodawanie Kolejnych Aplikacji

### Przykład: SmartHome App

```yaml
# docker-compose-smarthome.yml
version: '3.8'

networks:
  web:
    external: true

services:
  smarthome:
    image: your-smarthome-image:latest
    container_name: smarthome-app
    
    environment:
      - PORT=5000
      - NODE_ENV=production
    
    networks:
      - web
    
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=web"
      
      # SmartHome → /smarthome
      - "traefik.http.routers.smarthome.rule=Host(`malina.tail384b18.ts.net`) && PathPrefix(`/smarthome`)"
      - "traefik.http.routers.smarthome.entrypoints=websecure"
      - "traefik.http.routers.smarthome.tls=true"
      - "traefik.http.services.smarthome.loadbalancer.server.port=5000"
      
      # Middleware: usuń /smarthome prefix
      - "traefik.http.middlewares.smarthome-strip.stripprefix.prefixes=/smarthome"
      - "traefik.http.routers.smarthome.middlewares=smarthome-strip"
```

Deploy:
```bash
docker-compose -f docker-compose-smarthome.yml up -d
```

URL: `https://malina.tail384b18.ts.net/smarthome`

---

## 📚 Przydatne Komendy

```bash
# Restart Traefik
docker restart traefik

# Restart Journey Planner
docker restart journey-planner-api journey-planner-web

# Zobacz wszystkie routery w Traefik
docker logs traefik | grep "Creating"

# Test HTTPS połączenia
curl -I https://malina.tail384b18.ts.net/journey

# Test API
curl https://malina.tail384b18.ts.net/journey/api/health

# Sprawdź labels kontenera
docker inspect journey-planner-api | grep -A 50 Labels
```

---

## ✅ Checklist Deployment

- [ ] Traefik działa i ma network 'web'
- [ ] Journey Planner backend w sieci 'web' i 'journey-planner-net'
- [ ] Journey Planner frontend w sieci 'web' i 'journey-planner-net'
- [ ] CORS_ORIGIN = https://malina.tail384b18.ts.net (bez /journey!)
- [ ] VITE_API_URL = https://malina.tail384b18.ts.net/journey/api
- [ ] FRONTEND_URL = https://malina.tail384b18.ts.net/journey
- [ ] Można zalogować się: admin / admin123
- [ ] Dashboard Traefik dostępny: https://malina.tail384b18.ts.net/dashboard/

---

**Gotowe! 🎉**
