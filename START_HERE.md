# 🚀 Start Here - Journey Planner Setup

## Witaj! Co Chcesz Zrobić?

### 1️⃣ Skonfigurować Nginx (SmartHome + Journey Planner) - START HERE!

**Masz 404 na https://malina.tail384b18.ts.net/journey/?**

➡️ **[NGINX_QUICK_COPY.md](NGINX_QUICK_COPY.md)** - Skopiuj i wklej konfigurację (5 minut)

**Potrzebujesz szczegółów?**

➡️ **[NGINX_INTEGRATION.md](NGINX_INTEGRATION.md)** - Pełna instrukcja krok po kroku (12 kroków)

**Coś nie działa?**

➡️ **[DEBUG_404.md](DEBUG_404.md)** - Debugowanie 404 (8 najczęstszych przyczyn + fix)

---

### 2️⃣ Ustawić Automatyczne Budowanie Obrazów (GitHub Actions)

**Chcesz żeby GitHub automatycznie budował obrazy?**

➡️ **[QUICK_START.md](QUICK_START.md)** - Checklist 5 kroków

**Potrzebujesz szczegółów?**

➡️ **[GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)** - Pełny przewodnik

---

### 3️⃣ Wdrożyć Lokalnie (Development)

**Chcesz testować lokalnie przed deploymentem?**

➡️ **[QUICKSTART.md](QUICKSTART.md)** - Lokalne uruchomienie (3 metody)

---

### 4️⃣ Zrozumieć Projekt

**Chcesz poznać architekturę i funkcje?**

➡️ **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Przegląd projektu

➡️ **[USER_GUIDE.md](USER_GUIDE.md)** - Jak używać aplikacji

---

## 🎯 Najczęstsze Scenariusze

### Scenario A: Pierwszy Deploy (Wszystko Od Zera)

```bash
1. GitHub Actions - QUICK_START.md (ustaw auto-build)
2. Poczekaj ~10-15 min (build się wykona)
3. Nginx Config - NGINX_QUICK_COPY.md (skonfiguruj routing)
4. Test - DEBUG_404.md (jeśli 404)
5. DONE! 🎉
```

### Scenario B: Mam 404 (Nginx Nie Działa)

```bash
1. DEBUG_404.md - Szybka diagnoza (5 kroków)
2. NGINX_QUICK_COPY.md - Fix config
3. Test curl https://malina.tail384b18.ts.net/journey/
4. DONE! 🎉
```

### Scenario C: Zmiana w Kodzie (Update)

```bash
1. git push origin main (GitHub Actions auto-build)
2. Poczekaj ~10-15 min
3. Portainer: Pull latest + Redeploy
   LUB: ssh pi && docker-compose pull && docker-compose up -d
4. DONE! 🎉
```

### Scenario D: Development Lokalny

```bash
1. QUICKSTART.md - Method 1 (Docker Compose)
2. npm run dev
3. http://localhost:5173
4. DONE! 🎉
```

---

## 📋 Obecny Stan Projektu

### ✅ Co Działa:
- **GitHub Actions**: Automatyczne budowanie obrazów (AMD64 + ARM64)
- **Docker Images**: Publikowane do ghcr.io/adasrakieta/journey-planner/
- **Backend**: Port 5001, PostgreSQL, TypeScript, Sequelize
- **Frontend**: Port 5173, React, Vite, Tailwind, Leaflet
- **Local Development**: docker-compose, npm run dev

### ⚠️ Co Wymaga Konfiguracji:
- **Nginx Routing**: Trzeba dodać location blocks dla /journey/
- **Environment Variables**: Zaktualizować URLs w .env (bez portów!)
- **GitHub Packages**: Ustawić jako Public (lub login do ghcr.io)

---

## 🔧 Szybkie Testy (Diagnostyka)

### Test 1: Czy kontenery działają?
```bash
ssh pi@malina.tail384b18.ts.net
docker ps | grep journey-planner

# Expected: 2 kontenery "Up (healthy)"
```

### Test 2: Czy porty są otwarte?
```bash
netstat -tlnp | grep -E "5001|5173"

# Expected: docker-proxy na obu portach
```

### Test 3: Czy Nginx ma config?
```bash
sudo nginx -T | grep "location /journey"

# Expected: location /journey/ { proxy_pass http://localhost:5173/; }
```

### Test 4: Czy lokalne porty odpowiadają?
```bash
curl -I http://localhost:5173/
curl http://localhost:5001/api/health

# Expected: 200 OK
```

### Test 5: Czy Nginx routing działa?
```bash
curl -I http://localhost/journey/

# Expected: 200 OK
```

### Test 6: Czy zewnętrzny dostęp działa?
```bash
# Z Twojego komputera (Windows PowerShell):
curl -I https://malina.tail384b18.ts.net/journey/

# Expected: 200 OK
```

---

## 🆘 Help! Coś Nie Działa

### Problem: 404 Not Found
➡️ **[DEBUG_404.md](DEBUG_404.md)** - 8 przyczyn + rozwiązania

### Problem: 502 Bad Gateway
```bash
# Kontenery nie działają
cd ~/journey-planner
docker-compose restart
```

### Problem: CORS Errors
```bash
# Sprawdź CORS_ORIGIN w .env
# Powinno być: https://malina.tail384b18.ts.net (BEZ /journey/)
```

### Problem: CSS/JS 404
```bash
# Przebuduj frontend
cd ~/journey-planner
docker-compose down
docker-compose pull
docker-compose up -d
```

### Problem: "pull access denied"
```bash
# Obrazy są private - ustaw jako Public:
# https://github.com/AdasRakieta?tab=packages
```

---

## 📚 Wszystkie Dokumenty

| Dokument | Opis | Kiedy Użyć |
|----------|------|------------|
| **NGINX_QUICK_COPY.md** | Konfiguracja do skopiowania | Masz 404, szybki fix |
| **NGINX_INTEGRATION.md** | Pełna instrukcja Nginx | Szczegółowy setup |
| **DEBUG_404.md** | Debugowanie 404 | Coś nie działa |
| **QUICK_START.md** | GitHub Actions checklist | Pierwszy deploy |
| **GITHUB_ACTIONS_SETUP.md** | Auto-build setup | Szczegóły CI/CD |
| **QUICKSTART.md** | Local development | Testowanie lokalne |
| **PROJECT_SUMMARY.md** | Architektura projektu | Zrozumienie projektu |
| **USER_GUIDE.md** | Jak używać | Dla użytkowników |
| **CONTRIBUTING.md** | Jak kontrybuować | Dla deweloperów |

---

## 🎉 Success Criteria

Wszystko działa gdy:

- [ ] **GitHub Actions**: Workflow przechodzi ✅
- [ ] **Docker Images**: Widoczne w ghcr.io ✅
- [ ] **Kontenery**: `docker ps` pokazuje 2 kontenery "healthy" ✅
- [ ] **Porty**: 5001 i 5173 słuchają ✅
- [ ] **Nginx**: `sudo nginx -t` - OK ✅
- [ ] **Local Test**: `curl http://localhost:5173/` - 200 OK ✅
- [ ] **Nginx Test**: `curl http://localhost/journey/` - 200 OK ✅
- [ ] **External Test**: `curl https://malina.tail384b18.ts.net/journey/` - 200 OK ✅
- [ ] **Browser**: Otwórz URL, mapa się ładuje ✅
- [ ] **Console**: F12 - brak błędów ✅
- [ ] **SmartHome**: `/smarthome/` dalej działa ✅

---

## 💡 Pro Tips

1. **Zawsze testuj lokalnie najpierw**: `curl http://localhost:5173/`
2. **Potem przez Nginx**: `curl http://localhost/journey/`
3. **Dopiero potem z zewnątrz**: `curl https://malina.tail384b18.ts.net/journey/`
4. **Sprawdź logi**: `docker logs journey-planner-web --tail 50`
5. **Backup przed zmianami**: `sudo cp -r /etc/nginx/sites-available backup/`

---

**Need Help?** Otwórz issue na GitHub: https://github.com/AdasRakieta/journey-planner/issues

**Made with ❤️ for travel enthusiasts**
