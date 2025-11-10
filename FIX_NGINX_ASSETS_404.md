# 🔧 Fix: Nginx Assets 404 - NS_ERROR_CORRUPTED_CONTENT

## Problem

Błędy w konsoli przeglądarki:
```
GET https://malina.tail384b18.ts.net/assets/index-*.js
NS_ERROR_CORRUPTED_CONTENT

MIME type mismatch: expected "application/javascript", got "text/html"
```

**Przyczyna:** Nginx zwraca HTML (404 page) zamiast plików JS/CSS.

---

## Rozwiązanie: Popraw konfigurację Nginx

### Opcja 1: Podstawowa (Minimum Required)

```nginx
# Journey Planner Frontend
location /journey/ {
    proxy_pass http://localhost:5173/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Journey Planner API
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

**Problem z tym podejściem:** Frontend proxy musi obsłużyć wszystko (HTML, JS, CSS, images).

---

### Opcja 2: Poprawna (Recommended) ⭐

**Frontend container hostuje statyczne pliki na porcie 80 wewnątrz.**

```nginx
# Journey Planner - wszystko co NIE jest /api
location /journey {
    # Usuń /journey z początku i proxy do kontenera
    rewrite ^/journey/(.*) /$1 break;
    proxy_pass http://localhost:5173;  # Port kontenera frontendu
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Dla plików statycznych (assets)
    proxy_set_header Accept-Encoding "";
    proxy_buffering off;
}

# Journey Planner API - priorytet wyższy (przed /journey)
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

**Kluczowa zmiana:**
```nginx
# PRZED (błędne):
location /journey/ {
    proxy_pass http://localhost:5173/;  # Trailing slash!
}

# PO (poprawne):
location /journey {  # BEZ trailing slash!
    rewrite ^/journey/(.*) /$1 break;
    proxy_pass http://localhost:5173;  # BEZ trailing slash!
}
```

---

### Opcja 3: Najlepsza (Production-Ready) 🏆

**Nginx w kontenerze z volume do plików statycznych frontendu:**

```nginx
# Najpierw API (większa specyficzność)
location /journey/api/ {
    rewrite ^/journey/api/(.*) /api/$1 break;
    proxy_pass http://journey-planner-api:5001;  # Nazwa kontenera
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Frontend - statyczne pliki (container Nginx wewnętrzny)
location /journey/ {
    proxy_pass http://journey-planner-web:80/;  # Nazwa kontenera
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Alternatywnie: serwuj statyczne pliki bezpośrednio
# location /journey {
#     alias /var/www/journey-planner;
#     try_files $uri $uri/ /journey/index.html;
# }
```

---

## 🔧 Jak naprawić (Krok po kroku)

### Krok 1: SSH do Raspberry Pi

```bash
ssh pi@100.103.184.90
```

### Krok 2: Edytuj konfigurację Nginx

```bash
sudo nano /etc/nginx/sites-available/default
```

### Krok 3: Znajdź sekcję Journey Planner i zamień na:

```nginx
# Journey Planner API (MUSI BYĆ PRZED /journey!)
location /journey/api/ {
    rewrite ^/journey/api/(.*) /api/$1 break;
    proxy_pass http://localhost:5001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Journey Planner Frontend (BEZ trailing slash!)
location /journey {
    # Port kontenera frontendu (Nginx wewnętrzny na porcie 80)
    proxy_pass http://localhost:5173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Dla SPA (Single Page App)
    proxy_intercept_errors on;
    error_page 404 = @journey_fallback;
}

# Fallback dla SPA routing
location @journey_fallback {
    proxy_pass http://localhost:5173/index.html;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

### Krok 4: Test konfiguracji

```bash
sudo nginx -t
```

Powinno pokazać:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Krok 5: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Krok 6: Sprawdź logi

```bash
# Logi Nginx
sudo tail -f /var/log/nginx/error.log

# Logi kontenera frontend
docker logs -f journey-planner-web

# Test w przeglądarce
# Otwórz: https://malina.tail384b18.ts.net/journey/
# Sprawdź Network tab (F12)
```

---

## 🐛 Troubleshooting

### Problem 1: Nadal 404 na assets

**Sprawdź czy frontend container działa:**
```bash
docker ps | grep journey-planner-web
curl http://localhost:5173/
curl http://localhost:5173/assets/
```

**Jeśli 404:**
Frontend container może nie serwować plików na porcie 5173. Sprawdź:

```bash
docker exec journey-planner-web ls -la /usr/share/nginx/html/assets/
```

Powinno pokazać pliki `index-*.js` i `index-*.css`.

**Jeśli brak plików:**
- Frontend nie zbudował się poprawnie
- Rebuild: `docker-compose up -d --build frontend`

---

### Problem 2: CORS errors po naprawie assets

**Upewnij się że backend ma:**
```env
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

**Restart backendu:**
```bash
docker restart journey-planner-api
docker logs journey-planner-api | grep "CORS Origin"
```

---

### Problem 3: Assets ładują się ale są puste

**Nginx cache problem:**
```bash
# Wyczyść cache Nginx
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx

# Wyczyść cache przeglądarki
# Ctrl+Shift+Del w Firefox/Chrome
```

---

### Problem 4: Działa na porcie ale nie przez Nginx

**Sprawdź routing:**
```bash
# Direct access (działa)
curl http://localhost:5173/assets/index-*.js

# Przez Nginx (nie działa)
curl http://localhost/journey/assets/index-*.js

# Sprawdź różnicę w odpowiedzi
```

**Prawdopodobnie:**
- Nginx nie przekazuje właściwie ścieżki do kontenera
- Użyj `rewrite` lub popraw `proxy_pass`

---

## ✅ Kompletna poprawna konfiguracja Nginx

**Dla TailScale (HTTPS):**

```nginx
server {
    listen 443 ssl http2;
    server_name malina.tail384b18.ts.net;

    # SSL config...
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 50M;

    # SmartHome
    location /smarthome/ {
        proxy_pass http://localhost:5000/;
        # ... headers ...
    }

    # Journey Planner API - PRZED /journey!
    location /journey/api/ {
        rewrite ^/journey/api/(.*) /api/$1 break;
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Journey Planner Frontend
    location /journey {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📊 Porównanie: Co się dzieje

### ❌ PRZED (błędne):
```
Browser → https://malina/journey/assets/index.js
          ↓
        Nginx (location /journey/)
          ↓
        proxy_pass http://localhost:5173/
          ↓
        Frontend container próbuje /assets/index.js
          ↓
        404 Not Found (zwraca HTML)
          ↓
        Browser: "Expected JS, got HTML" ❌
```

### ✅ PO (poprawne):
```
Browser → https://malina/journey/assets/index.js
          ↓
        Nginx (location /journey)
          ↓
        proxy_pass http://localhost:5173
          ↓
        Frontend container zwraca /journey/assets/index.js
          (Nginx wewnętrzny w kontenerze obsługuje)
          ↓
        Browser otrzymuje poprawny JS ✅
```

---

## 🎯 Quick Fix (Najprostszy)

**Jeśli nie masz czasu na debugowanie, użyj tego:**

```nginx
location ~ ^/journey/(.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))$ {
    proxy_pass http://localhost:5173/$1;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

location /journey/api/ {
    rewrite ^/journey/api/(.*) /api/$1 break;
    proxy_pass http://localhost:5001;
    # ... headers ...
}

location /journey/ {
    proxy_pass http://localhost:5173/;
    # ... headers ...
}
```

To regex route dla assets zapewni że JS/CSS zawsze idą do frontendu.

---

**TL;DR:**
1. Usuń trailing slash: `location /journey` (nie `/journey/`)
2. API routing PRZED frontend routing
3. Test: `sudo nginx -t && sudo systemctl reload nginx`
4. Sprawdź logi: `docker logs journey-planner-web`
