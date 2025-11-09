# 🚀 GitHub Container Registry - Journey Planner CI/CD

## 📋 Przegląd

Journey Planner używa **automatycznej budowy obrazów Docker** przez GitHub Actions, dokładnie tak samo jak projekt SmartHome. **Nie musisz** ręcznie budować ani logować się do Docker lokalnie!

---

## 🔐 Dane logowania do GHCR

### Credentials

| Parametr | Wartość |
|----------|---------|
| **Registry URL** | `ghcr.io` |
| **Username** | `adasrakieta` |
| **Password (GitHub Actions)** | `${{ secrets.GITHUB_TOKEN }}` ✅ **Automatyczny!** |
| **Image Path - Backend** | `ghcr.io/adasrakieta/journey-planner/backend` |
| **Image Path - Frontend** | `ghcr.io/adasrakieta/journey-planner/frontend` |

### ⚠️ WAŻNE: Nie używaj Personal Access Token do budowy!

**Token `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` NIE jest potrzebny do CI/CD!**

GitHub Actions używa **automatycznego tokenu** `${{ secrets.GITHUB_TOKEN }}`, który:
- ✅ Jest generowany automatycznie przy każdym workflow
- ✅ Ma uprawnienia `packages: write` dzięki konfiguracji `permissions:` w workflow
- ✅ Nie wymaga ręcznej konfiguracji
- ✅ Jest bezpieczniejszy (wygasa po zakończeniu workflow)

---

## 🛠️ Jak to działa?

### Automatyczna budowa (GitHub Actions)

**Trigger:** Każdy `git push` do brancha `main`

```bash
# 1. Zmień kod lokalnie
git add .
git commit -m "Add authentication system"
git push origin main

# 2. GitHub Actions automatycznie:
#    - Buduje obrazy dla ARM64 (Raspberry Pi) + AMD64
#    - Loguje się do GHCR (bez Twojego tokenu!)
#    - Publikuje obrazy jako:
#      - ghcr.io/adasrakieta/journey-planner/backend:latest
#      - ghcr.io/adasrakieta/journey-planner/backend:sha-<commit_hash>
#      - ghcr.io/adasrakieta/journey-planner/frontend:latest
#      - ghcr.io/adasrakieta/journey-planner/frontend:sha-<commit_hash>

# 3. Gotowe! Możesz deployować w Portainerze
```

### Workflow file

Lokalizacja: `.github/workflows/docker-publish.yml`

**Kluczowe elementy:**
```yaml
permissions:
  contents: read
  packages: write    # To daje dostęp do GHCR!

jobs:
  build-and-push:
    steps:
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}           # = adasrakieta
          password: ${{ secrets.GITHUB_TOKEN }}   # Automatyczny!
```

---

## 📦 Deployment w Portainerze

### docker-compose.yml (dla Portainer)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: journey-planner-db
    environment:
      POSTGRES_DB: ${DB_NAME:-journey_planner}
      POSTGRES_USER: ${DB_USER:-journey_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    image: ghcr.io/adasrakieta/journey-planner/backend:${IMAGE_TAG:-latest}
    container_name: journey-planner-api
    environment:
      - PORT=5001
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=${DB_NAME:-journey_planner}
      - DB_USER=${DB_USER:-journey_user}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=1h
      - JWT_REFRESH_EXPIRES_IN=7d
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT:-587}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - EMAIL_FROM=${EMAIL_FROM}
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost}
    ports:
      - "5001:5001"
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    image: ghcr.io/adasrakieta/journey-planner/frontend:${IMAGE_TAG:-latest}
    container_name: journey-planner-web
    ports:
      - "${FRONTEND_PORT:-80}:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### Environment Variables dla Portainer

```bash
# Image version
IMAGE_TAG=latest                        # lub sha-a1b2c3d dla konkretnej wersji

# Database
DB_HOST=postgres                        # Nazwa kontenera w docker-compose
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=<secure_password>

# JWT Authentication
JWT_SECRET=<long_random_string_min_32_chars>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=szymon.przybysz2003@gmail.com
SMTP_PASSWORD=<gmail_app_password>
EMAIL_FROM=Journey Planner <noreply@journeyplanner.com>

# Frontend
FRONTEND_URL=http://localhost           # URL do linków w emailach
FRONTEND_PORT=80
```

---

## 🔄 Deployment Steps

### Metoda 1: Pierwszy deployment (Portainer)

1. **Wejdź do Portainer** → Stacks → Add stack
2. **Nazwa:** `journey-planner`
3. **Build method:** `Git Repository`
   - Repository URL: `https://github.com/AdasRakieta/journey-planner`
   - Repository reference: `refs/heads/main`
   - Compose path: `docker-compose.yml`
4. **Environment variables:** Dodaj wszystkie zmienne z sekcji powyżej
5. **Deploy the stack**

### Metoda 2: Update (Re-pull najnowszych obrazów)

1. **Portainer** → Stacks → `journey-planner`
2. **Editor** → Scroll down
3. **Zaznacz:**
   - ✅ **Re-pull images** - pobierze `latest` z GHCR
   - ✅ **Force recreate** - wymuś odtworzenie kontenerów
4. **Update the stack**

### Metoda 3: Konkretna wersja (SHA)

```yaml
# W docker-compose.yml zmień:
services:
  backend:
    image: ghcr.io/adasrakieta/journey-planner/backend:sha-a1b2c3d4e5f6
  
  frontend:
    image: ghcr.io/adasrakieta/journey-planner/frontend:sha-a1b2c3d4e5f6
```

Sprawdź SHA commita: `git log --oneline -1`

---

## 📊 Sprawdzanie statusu buildów

### GitHub Actions UI

```
https://github.com/AdasRakieta/journey-planner/actions
```

### Zobacz logi ostatniego buildu

1. GitHub → Actions → `docker-publish.yml`
2. Kliknij ostatni run
3. Rozwiń `Build and push backend image` lub `Build and push frontend image`

### Dostępne obrazy

```
https://github.com/AdasRakieta?tab=packages
```

---

## 🧪 Testowanie lokalnie (opcjonalne)

### Pull obrazów z GHCR

```bash
# Zaloguj się (tylko jeśli obrazy są private)
echo "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" | docker login ghcr.io -u adasrakieta --password-stdin

# Pull obrazów
docker pull ghcr.io/adasrakieta/journey-planner/backend:latest
docker pull ghcr.io/adasrakieta/journey-planner/frontend:latest

# Uruchom lokalnie
docker-compose up -d
```

### Budowa lokalna (dla testów przed push)

```bash
# Tylko do testów! Production używa GitHub Actions
docker build -t journey-backend:test ./server
docker build -t journey-frontend:test ./client
```

---

## ⚠️ Rozwiązywanie problemów

### Problem: "Error: buildx call failed with error: failed to solve: authorization required"

**Przyczyna:** Próbujesz budować lokalnie i Docker wymaga logowania do GHCR.

**Rozwiązanie:** 
- ✅ **NIE buduj lokalnie** - użyj GitHub Actions (push do `main`)
- Jeśli musisz testować: `docker-compose build` (bez push do registry)

### Problem: "rate limit exceeded"

**Przyczyna:** GitHub Actions ma limit buildów.

**Rozwiązanie:**
- Sprawdź usage: GitHub → Settings → Billing → Actions minutes
- Free tier: 2000 minut/miesiąc (powinno wystarczyć!)

### Problem: "Image not found in GHCR"

**Przyczyna:** Build się nie udał lub nie pushował do registry.

**Rozwiązanie:**
1. Sprawdź Actions logs: `https://github.com/AdasRakieta/journey-planner/actions`
2. Szukaj błędów w steps: `Build and push backend image`
3. Upewnij się że workflow ma `permissions: packages: write`

---

## 📈 Multi-arch builds (ARM64 + AMD64)

Journey Planner buduje obrazy dla **obu architektur**:
- `linux/arm64` - Raspberry Pi 4/5 ✅
- `linux/amd64` - Standardowe serwery, PC

Docker automatycznie wybierze właściwą architekturę przy `docker pull`.

**Czas budowy:**
- Pierwszy build: ~10-15 minut
- Z cache: ~4-7 minut
- Multi-arch dodaje: +3-5 minut

---

## 🔒 Security Best Practices

### ✅ Używane w Journey Planner:

- `GITHUB_TOKEN` automatyczny (bezpieczny, krótkotrwały)
- Multi-arch builds
- Non-root users w kontenerach
- Health checks
- Environment variables (nie hardcoded secrets)

### 🎯 Do rozważenia:

```yaml
# Scanning obrazów na vulnerabilities
- name: Scan image for vulnerabilities
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/adasrakieta/journey-planner/backend:${{ github.sha }}
    format: 'sarif'
```

---

## 📞 Quick Commands

```bash
# Sprawdź ostatni commit SHA
git log --oneline -1

# Lista dostępnych tagów
curl -s https://api.github.com/users/adasrakieta/packages/container/journey-planner%2Fbackend/versions \
  | jq -r '.[].metadata.container.tags[]'

# Wymuś rebuild (pusty commit)
git commit --allow-empty -m "Trigger rebuild"
git push origin main
```

---

## 🎓 Podsumowanie workflow

```
1. Developer: git push origin main
2. GitHub Actions: Wykrywa push
3. GitHub Actions: Loguje się do GHCR (automatyczny token)
4. GitHub Actions: Buduje ARM64 + AMD64 obrazy
5. GitHub Actions: Pushuje do GHCR jako latest + sha-<commit>
6. Portainer: Re-pull images + Force recreate
7. Raspberry Pi: Uruchomione nowe kontenery z najnowszym kodem
```

**Ty nie musisz się logować ani budować lokalnie! 🎉**

---

**Ostatnia aktualizacja:** 2025-11-10  
**Wersja:** 1.0  
**Dokumentacja oparta na:** SmartHome CI/CD pipeline
