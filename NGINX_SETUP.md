# 🔄 Nginx Reverse Proxy - SmartHome + Journey Planner

Instrukcja konfiguracji Nginx aby obsługiwał oba projekty na jednym Raspberry Pi.

## 📋 Architektura

```
Internet → Raspberry Pi (port 80/443)
           │
           └─ Nginx Reverse Proxy
              ├─ /smarthome/  → SmartHome (port 5000)
              └─ /journey/    → Journey Planner (port 5173 frontend + 5001 backend)
```

## 🎯 Cel

- **SmartHome** dostępny pod: `http://pi-ip/smarthome/`
- **Journey Planner** dostępny pod: `http://pi-ip/journey/`
- Jeden Nginx obsługuje oba projekty
- Brak konfliktów portów

## 📝 Konfiguracja Nginx

### Wariant 1: Osobne pliki konfiguracji (ZALECANE)

#### 1. Konfiguracja SmartHome (istniejący)

Plik: `/etc/nginx/sites-available/smarthome`

```nginx
server {
    listen 80;
    server_name _;  # Lub twoja domena/IP
    
    # SmartHome - istniejąca aplikacja
    location /smarthome/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        
        # WebSocket support (jeśli używasz)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
    }
    
    # Jeśli masz API endpoint dla SmartHome
    location /smarthome/api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 2. Dodaj konfigurację Journey Planner (NOWA)

Plik: `/etc/nginx/sites-available/journey-planner`

```nginx
server {
    listen 80;
    server_name _;  # Lub twoja domena/IP
    
    # Journey Planner - Frontend
    location /journey/ {
        proxy_pass http://localhost:5173/;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support dla Vite HMR (development)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        
        # Timeout zwiększony dla długich requestów
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Journey Planner - Backend API
    location /journey/api/ {
        # Przepisz /journey/api/* -> /api/*
        rewrite ^/journey/api/(.*) /api/$1 break;
        
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (jeśli potrzebne)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        # Timeout
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Health check endpoint
    location /journey/health {
        proxy_pass http://localhost:5001/api/health;
        access_log off;
    }
}
```

#### 3. Włącz konfiguracje

```bash
# Link do sites-enabled
sudo ln -sf /etc/nginx/sites-available/smarthome /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/journey-planner /etc/nginx/sites-enabled/

# Test konfiguracji
sudo nginx -t

# Jeśli OK, reload
sudo systemctl reload nginx
```

---

### Wariant 2: Jeden plik dla obu projektów

Plik: `/etc/nginx/sites-available/default`

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    # Root redirect - możesz zmienić na główną stronę wyboru
    location = / {
        return 302 /smarthome/;
    }
    
    # ============================================
    # SMARTHOME - istniejący projekt (port 5000)
    # ============================================
    location /smarthome/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
    
    # SmartHome API (jeśli masz)
    location /smarthome/api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # ============================================
    # JOURNEY PLANNER - nowy projekt
    # ============================================
    
    # Frontend (port 5173)
    location /journey/ {
        proxy_pass http://localhost:5173/;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
    
    # Backend API (port 5001)
    location /journey/api/ {
        rewrite ^/journey/api/(.*) /api/$1 break;
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_read_timeout 300s;
    }
    
    # Health check
    location /journey/health {
        proxy_pass http://localhost:5001/api/health;
        access_log off;
    }
}
```

## 🔧 Instalacja krok po kroku

### 1. Backup istniejącej konfiguracji

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
```

### 2. Edytuj konfigurację

```bash
# Wariant 1 (zalecane) - osobne pliki
sudo nano /etc/nginx/sites-available/journey-planner
# Wklej konfigurację z Wariantu 1, sekcja 2

# LUB Wariant 2 - jeden plik
sudo nano /etc/nginx/sites-available/default
# Zastąp całą zawartość konfiguracją z Wariantu 2
```

### 3. Test i restart

```bash
# Test składni
sudo nginx -t

# Jeśli OK:
sudo systemctl reload nginx

# Jeśli błąd, sprawdź logi:
sudo tail -f /var/log/nginx/error.log
```

### 4. Sprawdź czy działa

```bash
# Test SmartHome
curl http://localhost/smarthome/

# Test Journey Planner frontend
curl http://localhost/journey/

# Test Journey Planner API
curl http://localhost/journey/api/health
```

## 🔍 Weryfikacja

### Z przeglądarki (z innego urządzenia):

```
http://192.168.1.100/smarthome/     → SmartHome UI
http://192.168.1.100/journey/       → Journey Planner UI
http://192.168.1.100/journey/api/health → {"status":"ok"}
```

### Z terminala Pi:

```bash
# SmartHome
curl -I http://localhost/smarthome/

# Journey Planner
curl -I http://localhost/journey/

# Journey API
curl http://localhost/journey/api/health
```

## ⚙️ Konfiguracja zmiennych środowiskowych Journey Planner

Po skonfigurowaniu Nginx, zaktualizuj `.env` Journey Planner:

```bash
# Edytuj .env w Portainer lub lokalnie
FRONTEND_URL=http://192.168.1.100/journey
VITE_API_URL=http://192.168.1.100/journey/api
CORS_ORIGIN=http://192.168.1.100
```

**WAŻNE:** Po zmianie `.env` musisz **przebudować frontend**:

```bash
# W Portainer: Stack → Redeploy

# Lub przez SSH:
cd ~/journey-planner
docker-compose down
docker-compose up -d --build
```

## 🐛 Troubleshooting

### ❌ 502 Bad Gateway

**Problem:** Backend nie działa lub zły port

```bash
# Sprawdź czy backend działa
docker ps | grep journey-planner-api
docker logs journey-planner-api

# Sprawdź czy port jest otwarty
netstat -tlnp | grep 5001

# Testuj bezpośrednio
curl http://localhost:5001/api/health
```

---

### ❌ 404 Not Found dla `/journey/api/`

**Problem:** Zły rewrite rule

**Rozwiązanie:** Sprawdź czy masz `rewrite` w konfiguracji:
```nginx
location /journey/api/ {
    rewrite ^/journey/api/(.*) /api/$1 break;  # ← To jest ważne!
    proxy_pass http://localhost:5001;
}
```

---

### ❌ CORS errors w konsoli przeglądarki

**Problem:** Frontend nie może połączyć się z API

**Rozwiązanie 1** - Dodaj CORS headers w Nginx:
```nginx
location /journey/api/ {
    # ... inne ustawienia ...
    
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
}
```

**Rozwiązanie 2** - Zaktualizuj CORS w backendzie:
```bash
# W .env Journey Planner
CORS_ORIGIN=http://192.168.1.100
```

---

### ❌ CSS/JS nie ładuje się (404)

**Problem:** Vite używa ścieżek absolutnych `/assets/...`

**Rozwiązanie:** Dodaj base path w Vite config

Plik: `client/vite.config.ts`
```typescript
export default defineConfig({
  base: '/journey/',  // ← Dodaj to
  // ... reszta konfiguracji
})
```

Potem przebuduj frontend:
```bash
docker-compose up -d --build frontend
```

---

### ❌ Redirect loop

**Problem:** Nginx przekierowuje w kółko

**Rozwiązanie:** Usuń trailing slash z `proxy_pass`:
```nginx
# ŹLE:
location /journey/ {
    proxy_pass http://localhost:5173/;  # Slash na końcu
}

# DOBRZE:
location /journey/ {
    proxy_pass http://localhost:5173/;  # OK dla root
}

# Dla API bez rewrite:
location /journey/api {
    proxy_pass http://localhost:5001/api;  # Bez trailing slash
}
```

## 📊 Monitoring

### Logi Nginx

```bash
# Access log
sudo tail -f /var/log/nginx/access.log

# Error log
sudo tail -f /var/log/nginx/error.log

# Filtruj tylko Journey Planner
sudo tail -f /var/log/nginx/access.log | grep journey
```

### Status Nginx

```bash
# Status
sudo systemctl status nginx

# Test konfiguracji
sudo nginx -t

# Reload (bez downtime)
sudo systemctl reload nginx

# Restart (z downtime)
sudo systemctl restart nginx
```

## 🔐 HTTPS (opcjonalnie)

### Z Let's Encrypt

```bash
# Instaluj Certbot
sudo apt install certbot python3-certbot-nginx

# Generuj certyfikat
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

Po dodaniu HTTPS, zaktualizuj Journey Planner `.env`:
```bash
FRONTEND_URL=https://yourdomain.com/journey
VITE_API_URL=https://yourdomain.com/journey/api
```

## 📚 Dodatkowe pliki

### Strona główna wyboru projektów (opcjonalnie)

Stwórz prosty landing page: `/var/www/html/index.html`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Raspberry Pi Projects</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            text-align: center;
        }
        .project {
            display: block;
            margin: 20px;
            padding: 20px;
            background: #f0f0f0;
            border-radius: 8px;
            text-decoration: none;
            color: #333;
            transition: background 0.3s;
        }
        .project:hover {
            background: #e0e0e0;
        }
    </style>
</head>
<body>
    <h1>🍓 Raspberry Pi Projects</h1>
    <a href="/smarthome/" class="project">
        <h2>🏠 SmartHome</h2>
        <p>Home automation and monitoring</p>
    </a>
    <a href="/journey/" class="project">
        <h2>✈️ Journey Planner</h2>
        <p>Plan your travels and adventures</p>
    </a>
</body>
</html>
```

Dodaj w Nginx:
```nginx
location = / {
    root /var/www/html;
    index index.html;
}
```

## ✅ Checklist

- [ ] Backup istniejącej konfiguracji Nginx
- [ ] Dodana konfiguracja dla `/journey/` (frontend)
- [ ] Dodana konfiguracja dla `/journey/api/` (backend)
- [ ] Test składni: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`
- [ ] Zaktualizowany `.env` w Journey Planner (FRONTEND_URL, VITE_API_URL)
- [ ] Przebudowany frontend: `docker-compose up -d --build`
- [ ] Test w przeglądarce: `http://pi-ip/journey/`
- [ ] Test API: `http://pi-ip/journey/api/health`
- [ ] Sprawdzone logi: `sudo tail -f /var/log/nginx/error.log`

---

**Gotowe!** 🎉 Oba projekty działają pod jednym Nginx na różnych ścieżkach.
