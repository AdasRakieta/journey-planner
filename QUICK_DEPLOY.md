# 🚀 Journey Planner - Quick Deploy Checklist

## 📋 Co naprawiliśmy w tym commicie?

### Problem
```
code: 'ENOENT',
syscall: 'open',
path: '/app/data/users.json'
```

Backend próbował używać JSON storage w produkcji zamiast PostgreSQL.

### Rozwiązanie
✅ Backend teraz **wymusza PostgreSQL** gdy wszystkie zmienne środowiskowe są ustawione  
✅ JSON fallback działa **tylko** gdy baza danych jest niedostępna  
✅ Dodano walidację required environment variables  
✅ Poprawiono bug z connection pool (client.release)

---

## ⚡ Quick Deploy (Portainer)

### Krok 1: Otwórz Portainer
```
http://100.103.184.90:9000  (lub Twój adres Raspberry Pi)
```

### Krok 2: Zaktualizuj Stack
1. **Stacks** → `journey-planner` → **Editor**
2. Skopiuj zawartość `docker-compose.yml` z repozytorium
3. **Environment variables** → Wklej zmienne z `PORTAINER_SETUP.md` (sekcja "Zmienne Środowiskowe")
4. **Update the stack** → ☑️ **Re-pull image and redeploy**

### Krok 3: Poczekaj (~10 minut na Raspberry Pi)

### Krok 4: Sprawdź logi
```bash
docker logs journey-planner-api --tail 50
```

**Szukaj:**
```
✅ All required environment variables are set
✅ PostgreSQL connected successfully!
📋 Available tables: users, journeys, stops, transports, attractions...
✅ Using PostgreSQL database - JSON fallback disabled
```

### Krok 5: Test logowania
```
URL: https://malina.tail384b18.ts.net/journey
Username: admin
Password: admin123
```

---

## 🔑 Ważne Credentials

### Database (PostgreSQL)
```
Host: 192.168.1.218
Port: 5432
Database: journey_planner
User: journey_user
Password: QWERasdf1234!@#$
```

### Admin User
```
Username: admin
Password: admin123
```

### URLs
```
Frontend: https://malina.tail384b18.ts.net/journey
Backend API: https://malina.tail384b18.ts.net/journey/api
Health Check: https://malina.tail384b18.ts.net/journey/api/health
```

---

## 🐛 Jeśli coś nie działa

### Backend nie startuje
```bash
# Sprawdź logi
docker logs journey-planner-api

# Szukaj:
# ❌ Missing required environment variables
# → Brakuje zmiennych środowiskowych w Portainerze
```

### "Database connection failed"
```bash
# Sprawdź czy PostgreSQL działa
docker ps | grep postgres

# Sprawdź czy backend widzi bazę
docker exec journey-planner-api ping -c 3 192.168.1.218
```

### "Login failed: Invalid credentials"
```bash
# Sprawdź czy user admin istnieje
docker exec <postgres-container> psql -U journey_user -d journey_planner \
  -c "SELECT username, role FROM users WHERE username='admin';"
```

---

## 📚 Więcej Informacji

Szczegółowe instrukcje: **`PORTAINER_SETUP.md`**

---

**Szacowany czas deployment: 10-15 minut** ⏱️
