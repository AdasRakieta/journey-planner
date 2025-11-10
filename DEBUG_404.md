# 🔍 Debug 404 Error - Journey Planner

## Problem: 404 na https://malina.tail384b18.ts.net/journey/

### Szybka Diagnoza (5 kroków):

```bash
# 1. SSH do Pi
ssh pi@malina.tail384b18.ts.net

# 2. Sprawdź czy kontenery działają
docker ps | grep journey-planner

# Expected output:
# journey-planner-web    Up X minutes    0.0.0.0:5173->80/tcp
# journey-planner-api    Up X minutes    0.0.0.0:5001->5001/tcp

# 3. Test portów lokalnie
curl -I http://localhost:5173/
curl http://localhost:5001/api/health

# Expected: HTTP/1.1 200 OK

# 4. Sprawdź Nginx config
sudo nginx -t
cat /etc/nginx/sites-enabled/projects

# Powinno być:
# location /journey/ {
#     proxy_pass http://localhost:5173/;
# }

# 5. Sprawdź logi Nginx
sudo tail -20 /var/log/nginx/projects-error.log
```

---

## Najczęstsze Przyczyny 404:

### ❌ Przyczyna 1: Nginx nie ma konfiguracji /journey/

**Sprawdź:**
```bash
sudo nginx -T | grep "location /journey"
```

**Jeśli NIC nie pokazuje:**
```bash
# Nginx nie ma location block dla /journey/
# Użyj: NGINX_QUICK_COPY.md
```

**Fix:**
1. Otwórz `NGINX_QUICK_COPY.md`
2. Skopiuj konfigurację (HTTPS lub HTTP)
3. Wklej do `/etc/nginx/sites-available/projects`
4. Utwórz symlink i reload

---

### ❌ Przyczyna 2: Kontenery nie działają

**Sprawdź:**
```bash
docker ps | grep journey-planner
```

**Jeśli NIC nie pokazuje:**
```bash
# Kontenery nie są uruchomione
cd ~/journey-planner
docker-compose ps
```

**Fix:**
```bash
cd ~/journey-planner
docker-compose up -d

# Sprawdź logi
docker logs journey-planner-web --tail 30
docker logs journey-planner-api --tail 30
```

---

### ❌ Przyczyna 3: Kontenery są unhealthy

**Sprawdź:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Jeśli pokazuje "unhealthy":**
```bash
# Zobacz logi
docker logs journey-planner-web --tail 50
docker logs journey-planner-api --tail 50
```

**Fix - Frontend unhealthy:**
```bash
# Sprawdź czy assets są w kontenerze
docker exec journey-planner-web ls -la /usr/share/nginx/html/assets/

# Jeśli pusty, przebuduj
cd ~/journey-planner
docker-compose down
docker-compose pull
docker-compose up -d
```

**Fix - Backend unhealthy:**
```bash
# Sprawdź zmienne środowiskowe
docker exec journey-planner-api env | grep DB_

# Sprawdź połączenie z DB
docker logs journey-planner-api | grep -i "database\|error"

# Restart
cd ~/journey-planner
docker-compose restart backend
```

---

### ❌ Przyczyna 4: Porty nie są dostępne

**Sprawdź:**
```bash
netstat -tlnp | grep -E "5001|5173"
```

**Expected:**
```
tcp  0.0.0.0:5001  LISTEN  docker-proxy
tcp  0.0.0.0:5173  LISTEN  docker-proxy
```

**Jeśli NIC nie pokazuje:**
```bash
# Porty nie są zmapowane
cd ~/journey-planner
docker-compose down
docker-compose up -d

# Sprawdź docker-compose.yml
cat docker-compose.yml | grep -A 2 "ports:"
```

---

### ❌ Przyczyna 5: Nginx symlink nie istnieje

**Sprawdź:**
```bash
ls -la /etc/nginx/sites-enabled/
```

**Jeśli nie ma "projects":**
```bash
# Symlink nie istnieje
sudo ln -s /etc/nginx/sites-available/projects /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

---

### ❌ Przyczyna 6: Stara konfiguracja Nginx konfliktuje

**Sprawdź:**
```bash
ls -la /etc/nginx/sites-enabled/
```

**Jeśli są stare pliki (default, smarthome):**
```bash
# Usuń stare
sudo rm /etc/nginx/sites-enabled/default
sudo rm /etc/nginx/sites-enabled/smarthome

# Sprawdź czy projects istnieje
sudo ln -sf /etc/nginx/sites-available/projects /etc/nginx/sites-enabled/

# Reload
sudo systemctl reload nginx
```

---

### ❌ Przyczyna 7: GitHub Actions build nie zakończony

**Sprawdź:**
https://github.com/AdasRakieta/journey-planner/actions

**Jeśli build failed lub running:**
```bash
# Poczekaj na zakończenie buildu (~10-15 min)
# LUB build lokalnie:
cd ~/journey-planner
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

---

### ❌ Przyczyna 8: Obrazy nie są publiczne / brak dostępu

**Sprawdź w Portainer logi:**
```
pull access denied for journey-planner-frontend
```

**Fix:**
1. Przejdź do: https://github.com/AdasRakieta?tab=packages
2. `backend` → Package settings → **Change to Public**
3. `frontend` → Package settings → **Change to Public**

**LUB zaloguj Pi do ghcr.io:**
```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u AdasRakieta --password-stdin
```

---

## 🎯 Pełny Fix Flow (Gdy Wszystko Nie Działa):

```bash
# 1. SSH
ssh pi@malina.tail384b18.ts.net

# 2. Backup
sudo cp -r /etc/nginx/sites-available /etc/nginx/sites-available.backup.$(date +%Y%m%d)

# 3. Utwórz/zaktualizuj Nginx config
sudo nano /etc/nginx/sites-available/projects
# Użyj NGINX_QUICK_COPY.md

# 4. Usuń stare, dodaj nowe
sudo rm /etc/nginx/sites-enabled/default
sudo rm /etc/nginx/sites-enabled/smarthome
sudo ln -s /etc/nginx/sites-available/projects /etc/nginx/sites-enabled/

# 5. Test i reload
sudo nginx -t
sudo systemctl reload nginx

# 6. Sprawdź Journey Planner
cd ~/journey-planner
git pull origin main

# 7. Zaktualizuj .env
cp nginix.env .env

# 8. Pull i restart
docker-compose pull
docker-compose down
docker-compose up -d

# 9. Sprawdź logi
docker logs journey-planner-web --tail 30
docker logs journey-planner-api --tail 30

# 10. Test
curl -I http://localhost/journey/
curl -I https://malina.tail384b18.ts.net/journey/
```

---

## ✅ Success Criteria:

```bash
# 1. Kontenery działają
docker ps | grep journey-planner
# Both: Up X minutes (healthy)

# 2. Porty słuchają
netstat -tlnp | grep -E "5001|5173"
# Both present

# 3. Nginx test OK
sudo nginx -t
# syntax is ok

# 4. Test lokalny
curl -I http://localhost:5173/
# 200 OK

curl http://localhost:5001/api/health
# {"status":"healthy"}

# 5. Test przez Nginx
curl -I http://localhost/journey/
# 200 OK

# 6. Test z zewnątrz
curl -I https://malina.tail384b18.ts.net/journey/
# 200 OK
```

---

## 📚 Pomocne Komendy:

```bash
# Sprawdź wszystko naraz
echo "=== Docker ===" && docker ps | grep journey-planner && \
echo "=== Ports ===" && netstat -tlnp | grep -E "5001|5173" && \
echo "=== Nginx ===" && sudo nginx -t && \
echo "=== Symlinks ===" && ls -la /etc/nginx/sites-enabled/

# Zobacz pełne logi
sudo tail -100 /var/log/nginx/projects-error.log
docker logs journey-planner-web --tail 100
docker logs journey-planner-api --tail 100

# Restart wszystkiego
cd ~/journey-planner && docker-compose restart && \
sudo systemctl reload nginx && \
echo "Restarted!"
```

---

**Dokumentacja:**
- `NGINX_QUICK_COPY.md` - konfiguracja do skopiowania
- `NGINX_INTEGRATION.md` - pełna instrukcja
- `QUICK_START.md` - setup GitHub Actions
