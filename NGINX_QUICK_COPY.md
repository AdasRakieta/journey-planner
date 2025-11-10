# 📋 Quick Copy-Paste - Nginx Config dla SmartHome + Journey Planner

## Jeśli używasz HTTPS (Certbot/Let's Encrypt):

```bash
# 1. SSH do Raspberry Pi
ssh pi@malina.tail384b18.ts.net

# 2. Backup
sudo cp -r /etc/nginx/sites-available /etc/nginx/sites-available.backup.$(date +%Y%m%d)

# 3. Utwórz nowy plik
sudo nano /etc/nginx/sites-available/projects
```

**Wklej to do pliku:**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name malina.tail384b18.ts.net;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name malina.tail384b18.ts.net;

    # SSL - dostosuj ścieżki!
    ssl_certificate /etc/letsencrypt/live/malina.tail384b18.ts.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/malina.tail384b18.ts.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Logs
    access_log /var/log/nginx/projects-access.log;
    error_log /var/log/nginx/projects-error.log;

    # Root redirect
    location = / {
        return 301 https://$server_name/smarthome/;
    }

    # SmartHome
    location /smarthome/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

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
}
```

**Zapisz:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Jeśli używasz HTTP ONLY (bez SSL):

```bash
# 1. SSH do Raspberry Pi
ssh pi@malina.tail384b18.ts.net

# 2. Backup
sudo cp -r /etc/nginx/sites-available /etc/nginx/sites-available.backup.$(date +%Y%m%d)

# 3. Utwórz nowy plik
sudo nano /etc/nginx/sites-available/projects
```

**Wklej to do pliku:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name malina.tail384b18.ts.net;

    # Logs
    access_log /var/log/nginx/projects-access.log;
    error_log /var/log/nginx/projects-error.log;

    # Root redirect
    location = / {
        return 301 http://$server_name/smarthome/;
    }

    # SmartHome
    location /smarthome/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

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
}
```

**Zapisz:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Następne Kroki (Po Zapisaniu Pliku):

```bash
# 4. Usuń stare symlinki
sudo rm /etc/nginx/sites-enabled/default
sudo rm /etc/nginx/sites-enabled/smarthome  # jeśli istnieje

# 5. Utwórz nowy symlink
sudo ln -s /etc/nginx/sites-available/projects /etc/nginx/sites-enabled/

# 6. Test składni
sudo nginx -t

# 7. Reload Nginx
sudo systemctl reload nginx

# 8. Sprawdź status
sudo systemctl status nginx
```

## Weryfikacja:

```bash
# Test lokalny
curl -I http://localhost:5173/
curl http://localhost:5001/api/health
curl -I http://localhost:5000/

# Test przez Nginx
curl -I http://localhost/journey/
curl -I http://localhost/smarthome/
```

## Z Twojego Komputera:

```powershell
# Windows PowerShell
curl -I https://malina.tail384b18.ts.net/journey/
curl -I https://malina.tail384b18.ts.net/smarthome/
curl https://malina.tail384b18.ts.net/journey/api/health
```

## W Przeglądarce:

- SmartHome: https://malina.tail384b18.ts.net/smarthome/
- Journey: https://malina.tail384b18.ts.net/journey/

---

## 🔧 Jeśli Coś Nie Działa:

### 502 Bad Gateway

```bash
# Sprawdź czy kontenery działają
docker ps | grep journey-planner
docker ps | grep smarthome

# Restart Journey Planner
cd ~/journey-planner
docker-compose restart
```

### 404 Not Found

```bash
# Sprawdź symlink
ls -la /etc/nginx/sites-enabled/

# Jeśli nie ma, utwórz:
sudo ln -sf /etc/nginx/sites-available/projects /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### Nginx Error

```bash
# Zobacz logi
sudo tail -f /var/log/nginx/projects-error.log
sudo tail -f /var/log/nginx/error.log
```

### Kontenery Nie Działają

```bash
# Journey Planner
cd ~/journey-planner
docker-compose down
docker-compose pull
docker-compose up -d

# Sprawdź logi
docker logs journey-planner-web --tail 50
docker logs journey-planner-api --tail 50
```

---

**Pełna dokumentacja:** `NGINX_INTEGRATION.md`
