# 🐳 Deploy Journey Planner with Portainer

Prosty przewodnik jak wdrożyć Journey Planner na Raspberry Pi używając Portainer.

## ⚡ Quick Start (3 kroki)

### Krok 1: Znajdź IP swojej bazy PostgreSQL

SSH do Raspberry Pi i wykonaj:

```bash
# Pokaż wszystkie kontenery
docker ps

# Znajdź IP swojego kontenera PostgreSQL
docker inspect <nazwa-twojego-postgres-kontenera> | grep IPAddress
```

Zapisz IP, np: `172.17.0.2`

### Krok 2: Przygotuj zmienne środowiskowe

W Portainer przy dodawaniu stacka, w sekcji **Environment variables** dodaj:

```env
DB_HOST=172.17.0.2
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=twoje_haslo_do_bazy

JWT_SECRET=wygeneruj_bezpieczny_klucz_32_znaki

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=twoj-email@gmail.com
SMTP_PASSWORD=haslo-aplikacji-gmail
SMTP_FROM_EMAIL=twoj-email@gmail.com

FRONTEND_URL=http://IP_TWOJEGO_PI:5173
VITE_API_URL=http://IP_TWOJEGO_PI:5001/api
CORS_ORIGIN=http://IP_TWOJEGO_PI:5173

BACKEND_PORT=5001
FRONTEND_PORT=5173
IMAGE_TAG=arm64
NODE_ENV=production
```

**⚠️ WAŻNE:**
- Zamień `172.17.0.2` na rzeczywisty IP twojego Postgres
- Zamień `twoje_haslo_do_bazy` na hasło do PostgreSQL
- Wygeneruj `JWT_SECRET`: `openssl rand -base64 32`
- Zamień `IP_TWOJEGO_PI` na IP Raspberry Pi (np. `192.168.1.100`)
- `SMTP_PASSWORD` - to NIE jest zwykłe hasło Gmail, ale App Password!

### Krok 3: Deploy w Portainer

1. **Otwórz Portainer**: `http://IP_RASPBERRY:9000`

2. **Stacks → Add Stack**

3. **Wybierz "Repository"**:
   - Repository URL: `https://github.com/AdasRakieta/journey-planner`
   - Repository reference: `main`
   - Compose path: `docker-compose.yml`

4. **Environment variables**: Wklej zmienne z Kroku 2

5. **Deploy the stack** ✅

## 📋 Alternatywna metoda - Web Editor

Jeśli wolisz Web Editor zamiast Repository:

1. **Stacks → Add Stack**
2. **Web Editor**
3. **Name**: `journey-planner`
4. **Skopiuj zawartość `docker-compose.yml`** z repo
5. **Environment variables**: Dodaj jak w Kroku 2
6. **Deploy the stack**

## 🔍 Weryfikacja

Po deployu:

```bash
# Sprawdź status kontenerów
docker ps | grep journey-planner

# Logi backend
docker logs journey-planner-api

# Logi frontend
docker logs journey-planner-web
```

Otwórz w przeglądarce:
- **Frontend**: `http://IP_PI:5173`
- **Backend Health**: `http://IP_PI:5001/api/health`

## ❓ Troubleshooting

### ❌ Backend nie startuje - "Cannot connect to database"

**Problem**: Zły IP PostgreSQL

**Rozwiązanie**:
```bash
# SSH do Pi
docker ps | grep postgres
docker inspect <postgres-container> | grep IPAddress
```

Zaktualizuj `DB_HOST` w Portainer → Stack → Environment variables → Update

---

### ❌ Backend crashuje - "JWT_SECRET is required"

**Problem**: Brak JWT_SECRET

**Rozwiązanie**:
```bash
# Wygeneruj secret
openssl rand -base64 32
```

Dodaj do Environment variables w Portainer

---

### ❌ Email nie działa - "Invalid credentials"

**Problem**: Używasz zwykłego hasła Gmail zamiast App Password

**Rozwiązanie**:
1. Idź do: https://myaccount.google.com/apppasswords
2. Wygeneruj App Password dla "Mail"
3. Użyj tego 16-znakowego hasła jako `SMTP_PASSWORD`

---

### ❌ Port 5432 already in use

**Problem**: Próbujesz utworzyć nowy kontener PostgreSQL

**Rozwiązanie**: 
- `docker-compose.yml` NIE tworzy własnego Postgres
- Upewnij się że `DB_HOST` wskazuje na istniejący kontener (jego IP)
- Nie dodawaj serwisu `postgres` w compose file

---

### ❌ Cannot pull image - "manifest unknown"

**Problem**: Obrazy ARM64 nie są w registry (trzeba zbudować lokalnie)

**Rozwiązanie**:
```bash
# SSH do Pi
cd ~
git clone https://github.com/AdasRakieta/journey-planner.git
cd journey-planner
chmod +x build-on-pi.sh
./build-on-pi.sh
```

Potem w Portainer zmień `IMAGE_TAG=arm64` i redeploy.

## 🔄 Update aplikacji

```bash
# SSH do Pi
cd ~/journey-planner
git pull origin main
./build-on-pi.sh
```

W Portainer:
1. Stacks → journey-planner
2. **Redeploy** ✅

## 📚 Więcej informacji

- Pełna dokumentacja: `RASPBERRY_PI.md`
- Problemy z bazą: `find-postgres-ip.sh`
- Build lokalny: `build-on-pi.sh`

## ✅ Checklist przed deployment

- [ ] Znalazłem IP mojego PostgreSQL kontenera
- [ ] Ustawiłem `DB_HOST` na ten IP
- [ ] Ustawiłem `DB_PASSWORD` (hasło do Postgres)
- [ ] Wygenerowałem `JWT_SECRET` (32+ znaków)
- [ ] Mam Gmail App Password jako `SMTP_PASSWORD`
- [ ] Zamieniłem `IP_TWOJEGO_PI` na rzeczywisty IP
- [ ] Zbudowałem ARM64 images lokalnie na Pi
- [ ] Ustawiłem `IMAGE_TAG=arm64`
