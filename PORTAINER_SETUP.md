# 🐳 Journey Planner - Portainer Deployment Guide

## 📋 Problem który naprawiamy

**Błąd:**
```
code: 'ENOENT',
syscall: 'open',
path: '/app/data/users.json'
```

**Przyczyna:** Backend próbował używać JSON storage zamiast PostgreSQL, ponieważ:
1. Brakowało połączenia z bazą danych
2. Fallback do JSON był włączony nawet gdy PostgreSQL był dostępny

**Rozwiązanie:** ✅ Wyłączono fallback do JSON gdy PostgreSQL jest dostępny

---

## 🚀 Kroki Deployment w Portainer

### 1️⃣ Przygotowanie: Upewnij się że baza działa

```bash
# Sprawdź czy baza journey_planner istnieje
docker exec -it <postgres-container-name> psql -U postgres -l | grep journey_planner

# Jeśli NIE istnieje, utwórz ją:
docker exec -it <postgres-container-name> psql -U postgres -c "CREATE DATABASE journey_planner;"

# Sprawdź czy user admin istnieje
docker exec -it <postgres-container-name> psql -U journey_user -d journey_planner -c "SELECT username, role FROM users WHERE username='admin';"

# Powinien zwrócić:
#  username | role  
# ----------+-------
#  admin    | admin
```

### 2️⃣ Zaktualizuj Stack w Portainer

**Opcja A: Przez Web UI (łatwiejsze)**

1. **Zaloguj się do Portainer** (np. http://100.103.184.90:9000)
2. **Przejdź do Stacks** → Wybierz `journey-planner`
3. **Kliknij "Editor"**
4. **Zastąp zawartość** plikiem `docker-compose.yml` z repozytorium (ten z odkomentowanymi sekcjami `build`)
5. **Kliknij "Environment variables"**
6. **Wklej zawartość z `stack.env`** (sprawdź sekcję poniżej)
7. **Kliknij "Update the stack"** → ☑️ **Re-pull image and redeploy**
8. **Poczekaj** na deployment (może zająć 5-10 minut na Raspberry Pi)

**Opcja B: Przez Git Repo (automatyczne)**

1. **Zaloguj się do Portainer**
2. **Przejdź do Stacks** → `journey-planner`
3. **Kliknij "Editor"** → Zaktualizuj `docker-compose.yml`
4. **Kliknij "Environment variables"** → Zaktualizuj zmienne
5. **Włącz "Automatic updates"** (Git pull every X minutes)

---

## 🔧 Zmienne Środowiskowe (stack.env)

**UWAGA:** Te zmienne są **WYMAGANE** w Portainerze. Bez nich backend nie wystartuje!

### ✅ Gotowa konfiguracja dla 192.168.1.218

Skopiuj i wklej w Portainer → Stack → Environment variables:

```bash
# ===========================================
# APPLICATION URLS (PRODUCTION)
# ===========================================
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net

# ===========================================
# DATABASE CONFIGURATION (PostgreSQL)
# ===========================================
DB_HOST=192.168.1.218
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=QWERasdf1234!@#$

# ===========================================
# JWT AUTHENTICATION
# ===========================================
JWT_SECRET=J6Z1iosY09iPKlhYZ2Dr5Ke/zPqqQeaETxKxU2yIFEc=
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ===========================================
# EMAIL CONFIGURATION (Gmail)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=smarthome.alertmail@gmail.com
SMTP_PASSWORD=pqvg eabu bmka mggk
SMTP_FROM_EMAIL=smarthome.alertmail@gmail.com
SMTP_FROM_NAME=Journey Planner
ADMIN_EMAIL=szymon.przybysz2003@gmail.com
EMAIL_PREVIEW_ENABLED=1

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
NODE_ENV=production
BACKEND_PORT=5001
FRONTEND_PORT=5173
IMAGE_TAG=latest

# ===========================================
# EXCHANGE RATES API
# ===========================================
EXCHANGERATE_API_KEY=17b3723db96fe27834e8f14e

# ===========================================
# GOOGLE OAUTH
# ===========================================
GOOGLE_CLIENT_ID=754745467618-ar3249suvrtspdr0o6hk9t9gnroi37ea.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# ===========================================
# FILE UPLOAD CONFIGURATION
# ===========================================
UPLOAD_DIR=/app/uploads/attachments
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf,image/jpeg,image/png,image/jpg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
FILE_ENCRYPTION_KEY=d103c957571e2c1842c6a3c7e86c371d5081f8c38e621b80efaf745c0daaf538
```

---

## 🧪 Weryfikacja po Deployment

### 1. Sprawdź logi Backend

```bash
# W Portainer → Containers → journey-planner-api → Logs
# Lub przez CLI:
docker logs journey-planner-api --tail 50
```

**Szukaj tych linii (DOBRY ZNAK):**
```
✅ All required environment variables are set
📊 Database configuration:
   Host: 192.168.1.218
   Port: 5432
   Database: journey_planner
   User: journey_user
✅ PostgreSQL connected successfully!
📋 Available tables: attractions, journey_checklist, journey_shares, journeys, stops, transport_attachments, transports, users
✅ Using PostgreSQL database - JSON fallback disabled
```

**❌ Jeśli widzisz błąd:**
```
❌ Missing required environment variables:
   - DB_HOST
   - DB_PASSWORD
   - JWT_SECRET
```
→ Wróć do kroku 2 i upewnij się, że zmienne środowiskowe są ustawione!

### 2. Test API Health Check

```bash
# Sprawdź czy backend odpowiada
curl http://192.168.1.218:5001/api/health

# Powinien zwrócić:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-12-01T12:30:00.000Z"
}
```

### 3. Test logowania przez frontend

1. Otwórz: https://malina.tail384b18.ts.net/journey
2. Zaloguj się:
   - **Username:** `admin`
   - **Password:** `admin123`
3. Jeśli widzisz dashboard → ✅ **SUKCES!**

---

## 🐛 Troubleshooting

### Problem 1: "ENOENT /app/data/users.json"

**Diagnoza:** Backend próbuje używać JSON storage zamiast PostgreSQL

**Rozwiązanie:**
1. Sprawdź logi: `docker logs journey-planner-api | grep "Database configuration"`
2. Jeśli widzisz błąd połączenia z DB → Sprawdź czy PostgreSQL działa
3. Jeśli PostgreSQL działa, ale backend używa JSON → Sprawdź zmienne środowiskowe (DB_HOST, DB_PASSWORD, etc.)

### Problem 2: "Missing required environment variables"

**Diagnoza:** Stack.env nie został załadowany przez Portainer

**Rozwiązanie:**
1. Portainer → Stack → Edit
2. Kliknij "Environment variables"
3. Wklej pełny blok ze sekcji "Zmienne Środowiskowe" powyżej
4. Kliknij "Update the stack" → ☑️ Re-pull image and redeploy

### Problem 3: "Database connection failed"

**Diagnoza:** Backend nie może połączyć się z PostgreSQL

**Rozwiązanie:**
```bash
# 1. Sprawdź czy PostgreSQL działa
docker ps | grep postgres

# 2. Sprawdź czy port 5432 jest dostępny z kontenera backend
docker exec journey-planner-api ping -c 3 192.168.1.218

# 3. Sprawdź czy user journey_user istnieje w bazie
docker exec <postgres-container> psql -U postgres -c "\du" | grep journey_user

# 4. Sprawdź hasło (skopiuj dokładnie z stack.env)
# Hasło: QWERasdf1234!@#$
```

### Problem 4: "Login failed: Invalid credentials"

**Diagnoza:** User admin nie istnieje w bazie lub ma złe hasło

**Rozwiązanie:**
```bash
# Sprawdź czy user admin istnieje
docker exec <postgres-container> psql -U journey_user -d journey_planner -c "SELECT username, email, role, is_active FROM users WHERE username='admin';"

# Jeśli nie istnieje, połącz się przez pgsql_connect i:
# 1. Uruchom pgsql_open_script z database/init.sql (tylko sekcja users)
# 2. Lub ręcznie INSERT z bcrypt hash (patrz: server/gen-hash.js)
```

### Problem 5: Build trwa bardzo długo (>10 minut)

**Przyczyna:** Raspberry Pi ma ograniczoną moc obliczeniową

**Rozwiązanie:**
1. **Poczekaj cierpliwie** - pierwsze buildy mogą trwać 10-15 minut
2. **Opcja alternatywna:** Build lokalnie na mocniejszym komputerze:
   ```bash
   # Na PC z Windows/Mac/Linux:
   docker buildx build --platform linux/arm64 -t ghcr.io/adasrakieta/journey-planner/backend:latest ./server
   docker buildx build --platform linux/arm64 -t ghcr.io/adasrakieta/journey-planner/frontend:latest ./client
   docker push ghcr.io/adasrakieta/journey-planner/backend:latest
   docker push ghcr.io/adasrakieta/journey-planner/frontend:latest
   
   # Następnie w Portainer: Pull images zamiast Build
   ```

---

## 📊 Status Check Script

Stwórz plik `check-status.sh` w katalogu głównym:

```bash
#!/bin/bash
echo "🔍 Journey Planner Status Check"
echo "================================"
echo ""

echo "1️⃣ PostgreSQL Status:"
docker ps | grep postgres
echo ""

echo "2️⃣ Backend Status:"
docker ps | grep journey-planner-api
echo ""

echo "3️⃣ Frontend Status:"
docker ps | grep journey-planner-web
echo ""

echo "4️⃣ Backend Health:"
curl -s http://192.168.1.218:5001/api/health | jq '.'
echo ""

echo "5️⃣ Backend Logs (last 10 lines):"
docker logs journey-planner-api --tail 10
echo ""

echo "6️⃣ Database Tables:"
docker exec <postgres-container> psql -U journey_user -d journey_planner -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
echo ""

echo "✅ Status check complete!"
```

---

## 🎯 Podsumowanie

**Co naprawiliśmy:**
1. ✅ Backend teraz wymusza PostgreSQL w production (brak fallback do JSON)
2. ✅ Dodano walidację wymaganych zmiennych środowiskowych
3. ✅ Poprawiono bug z client.release() w db.ts
4. ✅ Zaktualizowano stack.env.example z poprawnymi credentials

**Co musisz zrobić:**
1. Commit i push zmian do GitHuba
2. Zaktualizuj stack w Portainerze (docker-compose.yml + environment variables)
3. Poczekaj na rebuild (~10 min)
4. Zaloguj się: admin / admin123

**Credentials:**
- **Database:** 192.168.1.218:5432 → journey_planner (user: journey_user)
- **Admin User:** admin / admin123
- **Frontend:** https://malina.tail384b18.ts.net/journey
- **Backend API:** https://malina.tail384b18.ts.net/journey/api

---

**Powodzenia! 🚀**
