# 🔧 Nginx Config Fix - Assets Loading Issue

## Problem

```
NS_ERROR_CORRUPTED_CONTENT
MIME type mismatch: Expected 'application/javascript', got 'text/html'
```

**Przyczyna:** Nginx nie obsługiwał `/journey/assets/` poprawnie - zwracał HTML zamiast JS/CSS.

---

## Rozwiązanie - Co zostało dodane

### 1. **Obsługa `/journey/assets/`** (NOWA SEKCJA) ⭐

```nginx
# Journey Planner static assets (JS, CSS, images, fonts)
# MUST be BEFORE the main /journey/ location for proper matching
location /journey/assets/ {
    # Rewrite /journey/assets/xxx to /assets/xxx
    rewrite ^/journey/assets/(.*) /assets/$1 break;
    
    # Proxy to frontend container
    proxy_pass http://journey-planner-web:80;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    
    # Cache static assets
    proxy_cache_valid 200 1h;
    proxy_cache_bypass $http_cache_control;
    add_header Cache-Control "public, max-age=3600";
    
    # Don't log every asset request
    access_log off;
}
```

**Co to robi:**
- `/journey/assets/index-039pOq0r.js` → `/assets/index-039pOq0r.js` w kontenerze
- Ustawia prawidłowe MIME types (`.js` = `application/javascript`)
- Cache na 1h dla lepszej wydajności
- Wyłącza logi dla assets (mniej śmieci w logach)

### 2. **Obsługa favicon i statycznych plików w root** (NOWA SEKCJA) ⭐

```nginx
# Journey Planner favicon and other root-level static files
location ~ ^/journey/(favicon\.ico|robots\.txt|manifest\.json|.*\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot))$ {
    # Rewrite /journey/file.ext to /file.ext
    rewrite ^/journey/(.*) /$1 break;
    
    # Proxy to frontend container
    proxy_pass http://journey-planner-web:80;
    proxy_http_version 1.1;
    
    # Cache static files
    add_header Cache-Control "public, max-age=86400";
    access_log off;
}
```

**Co to robi:**
- Obsługuje favicon, manifest, obrazy, fonty w root frontendu
- Cache na 24h (86400s)
- Regex match dla różnych rozszerzeń plików

### 3. **Uproszczenie `/journey/`** (ZMIENIONA SEKCJA)

```nginx
# Journey Planner frontend - main application
location /journey/ {
    # Proxy to journey-planner-web container (Nginx serving built static files)
    proxy_pass http://journey-planner-web:80/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

**Co zostało usunięte:**
- ❌ `proxy_set_header Upgrade` - nie potrzebne dla statycznych plików (był dla Vite HMR)
- ❌ `proxy_buffering off` - nie potrzebne dla production buildu
- ❌ `proxy_cache_bypass` - nie potrzebne

**Teraz obsługuje tylko:**
- `/journey/` (główny HTML - `index.html`)
- Routing SPA (React Router)

---

## Kolejność location blocks (WAŻNE!)

Nginx sprawdza location blocks w określonej kolejności:

```nginx
1. location /journey/api/        # API - najbardziej specyficzny
2. location /journey/assets/     # Assets - specyficzny
3. location ~ ^/journey/...      # Regex dla plików statycznych
4. location /journey/            # Catch-all dla SPA
5. location = /journey           # Exact match - redirect
```

**Dlaczego to ma znaczenie:**
- `/journey/assets/` **MUSI BYĆ PRZED** `/journey/`
- Inaczej `/journey/` złapie wszystko i assets nie zadziała!

---

## Co trzeba zrobić na Raspberry Pi

### Krok 1: Backup obecnej konfiguracji

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
```

### Krok 2: Skopiuj nową konfigurację

**Opcja A: Przez scp z Windowsa**
```powershell
# Z katalogu journey-planner na Windows:
scp nginx-config-fixed.conf pi@100.103.184.90:~/nginx-new.conf
```

**Opcja B: Ręcznie przez nano**
```bash
sudo nano /etc/nginx/sites-available/default
# Skopiuj zawartość z nginx-config-fixed.conf
```

### Krok 3: Zastosuj nową konfigurację

```bash
# Skopiuj nową konfigurację
sudo cp ~/nginx-new.conf /etc/nginx/sites-available/default

# Sprawdź składnię
sudo nginx -t
```

**Powinno pokazać:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Krok 4: Przeładuj Nginx

```bash
sudo systemctl reload nginx

# Lub restart jeśli reload nie zadziała:
sudo systemctl restart nginx
```

### Krok 5: Sprawdź logi

```bash
# Sprawdź czy Nginx wystartował poprawnie
sudo systemctl status nginx

# Zobacz logi błędów (jeśli są)
sudo tail -f /var/log/nginx/error.log
```

### Krok 6: Testuj w przeglądarce

1. **Otwórz:** https://malina.tail384b18.ts.net/journey/
2. **Naciśnij F12** → Console
3. **Sprawdź:**
   - ✅ Brak błędów CORS
   - ✅ Brak błędów `NS_ERROR_CORRUPTED_CONTENT`
   - ✅ Assets ładują się jako `application/javascript` i `text/css`

4. **Sprawdź Network tab (F12):**
   - `/journey/assets/index-*.js` → Status 200, Type: `script`
   - `/journey/assets/index-*.css` → Status 200, Type: `stylesheet`

---

## Weryfikacja że działa

### Test 1: Sprawdź MIME types

```bash
# Z Pi lub lokalnie:
curl -I https://malina.tail384b18.ts.net/journey/assets/index-039pOq0r.js
```

**Powinno pokazać:**
```
HTTP/2 200
content-type: application/javascript
cache-control: public, max-age=3600
```

**NIE powinno pokazać:**
```
content-type: text/html  ❌ To było źródłem problemu!
```

### Test 2: Sprawdź routing

```bash
# Frontend (HTML)
curl -I https://malina.tail384b18.ts.net/journey/
# → Powinno zwrócić 200 OK

# Assets (JS)
curl -I https://malina.tail384b18.ts.net/journey/assets/index-*.js
# → Powinno zwrócić 200 OK, content-type: application/javascript

# API
curl -I https://malina.tail384b18.ts.net/journey/api/health
# → Powinno zwrócić 200 OK, content-type: application/json
```

---

## Troubleshooting

### Problem: Nadal błąd `text/html` dla assets

**Przyczyna:** Nginx nie przeładowany lub cache przeglądarki

**Rozwiązanie:**
```bash
# 1. Sprawdź czy nowa konfiguracja jest aktywna
sudo nginx -t
sudo systemctl reload nginx

# 2. Wyczyść cache przeglądarki
# W Firefox: Ctrl+Shift+Del → Cache
# Lub Hard Refresh: Ctrl+Shift+R
```

### Problem: 404 dla assets

**Przyczyna:** Frontend container nie ma plików w `/usr/share/nginx/html/assets/`

**Rozwiązanie:**
```bash
# Sprawdź czy pliki są w kontenerze
docker exec journey-planner-web ls -la /usr/share/nginx/html/assets/

# Jeśli brak - przebuduj frontend z właściwym VITE_API_URL
# Zobacz: PORTAINER_LOCAL_BUILD.md
```

### Problem: 502 Bad Gateway

**Przyczyna:** Container `journey-planner-web` nie działa

**Rozwiązanie:**
```bash
# Sprawdź status
docker ps | grep journey-planner-web

# Sprawdź logi
docker logs journey-planner-web

# Restart jeśli potrzeba
docker restart journey-planner-web
```

---

## Podsumowanie zmian

| Element | Przed | Po |
|---------|-------|-----|
| `/journey/assets/` | ❌ Nie obsługiwane | ✅ Proxy do frontendu z cache |
| MIME types | ❌ `text/html` (błąd) | ✅ `application/javascript`, `text/css` |
| Static files | ❌ Brak obsługi | ✅ Obsługiwane przez regex |
| Cache | ❌ Brak | ✅ 1h dla assets, 24h dla statycznych plików |
| Logs | ✅ Wszystko logowane | ✅ Assets wyłączone z logów |

---

## Pliki do skopiowania

1. **nginx-config-fixed.conf** → `/etc/nginx/sites-available/default` na Pi
2. **Ten dokument (NGINX_ASSETS_FIX.md)** → Do repozytorium jako dokumentacja

---

**Czas aplikacji:** ~5 minut  
**Restart aplikacji:** NIE (tylko reload Nginx)  
**Testowanie:** 2 minuty
