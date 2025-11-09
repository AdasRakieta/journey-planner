# 🚀 Journey Planner - Quick Deployment Guide

## 📋 Przed rozpoczęciem

**Wymagania:**
- GitHub account (AdasRakieta)
- Portainer na Raspberry Pi
- PostgreSQL na 100.103.184.90:5432

---

## ⚡ Quick Start (5 minut)

### 1️⃣ Push kodu do GitHub

```bash
cd journey-planner
git add .
git commit -m "Add authentication system"
git push origin main
```

**Co się dzieje:**
- ✅ GitHub Actions **automatycznie** buduje obrazy Docker
- ✅ Publikuje do GHCR jako `ghcr.io/adasrakieta/journey-planner/backend:latest`
- ✅ Publikuje do GHCR jako `ghcr.io/adasrakieta/journey-planner/frontend:latest`
- ⏱️ Czas: ~8-12 minut (pierwszy build), ~4-7 minut (kolejne)

**Sprawdź status:** https://github.com/AdasRakieta/journey-planner/actions

---

### 2️⃣ Deploy w Portainerze

**Opcja A: Nowy Stack**

1. Portainer → Stacks → **Add stack**
2. Name: `journey-planner`
3. Build method: **Web editor**
4. Wklej `docker-compose.yml` z repozytorium
5. **Environment variables** → Add variable:

```bash
IMAGE_TAG=latest
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=<secure_password>
DB_HOST=100.103.184.90
DB_PORT=5432
JWT_SECRET=<64_char_random_string>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=szymon.przybysz2003@gmail.com
SMTP_PASSWORD=<gmail_app_password>
EMAIL_FROM=Journey Planner <noreply@journeyplanner.com>
FRONTEND_URL=http://malina.tail384b18.ts.net/journey
BACKEND_PORT=5001
FRONTEND_PORT=80
```

6. **Deploy the stack**

---

**Opcja B: Update istniejącego stacka**

1. Portainer → Stacks → `journey-planner`
2. **Editor** → Scroll na dół
3. Zaznacz:
   - ✅ **Re-pull images**
   - ✅ **Force recreate**
4. **Update the stack**

---

### 3️⃣ Sprawdź czy działa

```bash
# Backend health check
curl http://malina.tail384b18.ts.net:5001/api/health

# Powinno zwrócić:
# {"status":"ok","timestamp":"..."}

# Frontend (w przeglądarce)
http://malina.tail384b18.ts.net:80
```

---

## 🔐 Generowanie JWT Secret

```bash
# Metoda 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Metoda 2: OpenSSL
openssl rand -hex 32

# Metoda 3: PowerShell
[System.Convert]::ToBase64String((1..32 | %{Get-Random -Max 256}))
```

---

## 📧 Gmail App Password

1. **Google Account** → Security → 2-Step Verification (włącz jeśli nie masz)
2. **App passwords** → Create
3. Wybierz **Mail** i **Other** (wpisz "Journey Planner")
4. **Generate** → Skopiuj 16-znakowy kod
5. Użyj w `SMTP_PASSWORD`

---

## 🐳 Docker Compose (Skrócona wersja)

```yaml
version: '3.8'
services:
  backend:
    image: ghcr.io/adasrakieta/journey-planner/backend:latest
    ports:
      - "5001:5001"
    environment:
      - DB_HOST=100.103.184.90
      - DB_NAME=journey_planner
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_USER=${SMTP_USER}
    restart: unless-stopped

  frontend:
    image: ghcr.io/adasrakieta/journey-planner/frontend:latest
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

**Pełna wersja:** `docker-compose.yml` w repozytorium

---

## 🔄 Workflow CI/CD

```
Developer          GitHub Actions       GHCR              Portainer
    |                    |                |                   |
    |--[git push]------->|                |                   |
    |                    |--[build]------>|                   |
    |                    |--[push]------->|                   |
    |                    |                |                   |
    |                    |                |<--[re-pull]-------|
    |                    |                |                   |
    |<-------------[deployment complete]---------------------|
```

**Czas całkowity:** ~15-20 minut (build + deploy)

---

## 📊 Monitoring

### Sprawdź logi (Portainer)

1. Portainer → Containers → `journey-planner-api`
2. **Logs** → Live update

### Sprawdź GitHub Actions

```
https://github.com/AdasRakieta/journey-planner/actions
```

### Sprawdź obrazy GHCR

```
https://github.com/AdasRakieta?tab=packages
```

---

## ⚠️ Troubleshooting

### Problem: "Authorization required" przy build

**Rozwiązanie:** NIE buduj lokalnie! GitHub Actions robi to automatycznie.

```bash
# ❌ NIE RÓB TEGO:
docker-compose build
docker-compose up

# ✅ RÓB TO:
git push origin main
# Czekaj na GitHub Actions
# Deploy w Portainerze
```

---

### Problem: Backend nie łączy się z bazą

**Sprawdź:**
```bash
# W kontenerze backend
docker exec -it journey-planner-api sh
psql -h 100.103.184.90 -U journey_user -d journey_planner
# Hasło: wartość z DB_PASSWORD
```

**Jeśli błąd:**
- Sprawdź czy PostgreSQL akceptuje połączenia z Raspberry Pi
- Sprawdź `pg_hba.conf` (dozwolone IP)
- Sprawdź firewall

---

### Problem: Frontend pokazuje "Failed to fetch"

**Sprawdź:**
1. Czy backend działa: `curl http://localhost:5001/api/health`
2. Czy CORS jest poprawny: Sprawdź logi backend
3. Czy VITE_API_URL jest poprawny w obrazie frontend

**Fix:**
```bash
# Rebuild frontend z poprawnym VITE_API_URL
# W GitHub Actions workflow, build-args ustawione automatycznie
```

---

### Problem: Email nie wysyła się

**Sprawdź:**
1. `SMTP_PASSWORD` to **App Password**, nie zwykłe hasło Gmail
2. Gmail ma włączoną **2-Step Verification**
3. Logi backend: `docker logs journey-planner-api | grep -i smtp`

---

## 📝 Default Admin Account

Po pierwszym deploymencie:

```
Username: admin
Password: Admin123!
Email: admin@journeyplanner.com
```

**⚠️ ZMIEŃ HASŁO natychmiast po pierwszym logowaniu!**

1. Login jako admin
2. Settings → Change Password
3. Ustaw bezpieczne hasło

---

## 🎯 Next Steps

Po successful deployment:

1. ✅ Zaloguj się jako admin
2. ✅ Zmień hasło admina
3. ✅ Zaproś pierwszego użytkownika (Settings → Admin Panel → Invite User)
4. ✅ Przetestuj pełny flow:
   - Rejestracja przez invitation link
   - Login
   - Tworzenie podróży
   - Reset hasła
5. ✅ Skonfiguruj Nginx routing: `/journey/` → port 5001

---

## 📚 Dokumentacja

- **Pełna dokumentacja CI/CD:** `DOCKER_CICD.md`
- **Instrukcje dla SmartHome:** `GITHUB_CONTAINER_REGISTRY.md`
- **User Guide:** `USER_GUIDE.md`
- **Contributing:** `CONTRIBUTING.md`

---

**Powodzenia! 🚀**
