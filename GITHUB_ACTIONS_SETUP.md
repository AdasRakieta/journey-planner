# 🚀 GitHub Actions Auto-Build Setup

## Co Zostało Zmienione

### 1. GitHub Actions Workflow (`.github/workflows/docker-publish.yml`)
- ✅ Dodano **ARM64 support** (dla Raspberry Pi)
- ✅ Obrazy są automatycznie budowane na GitHub przy każdym push do `main`
- ✅ Publikowane do **GitHub Container Registry** (ghcr.io)
- ✅ Wspierane architektury: **AMD64 + ARM64**

### 2. docker-compose.yml
- ✅ Zmieniono z local build na **pull z ghcr.io**
- ✅ Domyślnie używa `IMAGE_TAG=latest`
- ✅ Sekcje `build` są zakomentowane (można odkomentować dla local buildu)

### 3. Nowy plik: docker-compose.dev.yml
- ✅ Override dla lokalnego budowania
- ✅ Użyj: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`

## 📦 Obrazy Docker

**Backend:**
```
ghcr.io/adasrakieta/journey-planner/backend:latest
```

**Frontend:**
```
ghcr.io/adasrakieta/journey-planner/frontend:latest
```

## 🔧 Konfiguracja GitHub (Jednorazowa)

### Krok 1: Ustaw obrazy jako publiczne

1. Przejdź do: https://github.com/AdasRakieta?tab=packages
2. Kliknij na **journey-planner/backend**
3. **Package settings** (prawy panel) → **Change visibility**
4. Wybierz **Public** → Wpisz `journey-planner/backend` → Confirm
5. Powtórz dla **journey-planner/frontend**

**Alternatywnie (jeśli chcesz private):**
Raspberry Pi musi się zalogować do ghcr.io:
```bash
# Na Raspberry Pi
echo $GITHUB_TOKEN | docker login ghcr.io -u AdasRakieta --password-stdin
```

### Krok 2: Trigger pierwszego buildu

```bash
# Push zmian (spowoduje automatyczny build)
git push origin main

# LUB uruchom workflow ręcznie:
# GitHub → Actions → "Build and Push Journey Planner Docker Images" → "Run workflow"
```

**Czas buildu:** ~10-15 minut (GitHub Actions buduje obie architektury)

### Krok 3: Sprawdź czy build się udał

1. GitHub → **Actions** → Sprawdź czy workflow przeszedł ✅
2. GitHub → **Packages** → Powinieneś zobaczyć:
   - `journey-planner/backend:latest`
   - `journey-planner/frontend:latest`

## 🎯 Deployment w Portainer (Po Pierwszym Buildzie)

### Opcja 1: Pull Latest Images

**W Portainer:**

1. **Stacks → journey-planner → Editor**

2. **Zaktualizuj Environment Variables:**
   ```env
   IMAGE_TAG=latest
   FRONTEND_URL=https://malina.tail384b18.ts.net
   VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
   CORS_ORIGIN=https://malina.tail384b18.ts.net
   ```

3. **Update the stack:**
   - ✅ **"Pull latest image version"** - ZAZNACZ!
   - ✅ **"Re-pull image and redeploy"** - ZAZNACZ!

4. **Click "Update"**

5. **Poczekaj 1-2 minuty** (pull jest szybki!)

### Opcja 2: Pull przez SSH

```bash
# SSH do Raspberry Pi
ssh pi@malina.tail384b18.ts.net

# Przejdź do projektu
cd ~/journey-planner

# Pobierz najnowszy docker-compose.yml
git pull origin main

# Zaktualizuj .env
cp nginix.env .env
# LUB edytuj:
nano .env
# Ustaw: IMAGE_TAG=latest

# Pull i restart
docker-compose pull
docker-compose up -d
```

## 🔄 Workflow: Jak To Działa Teraz

### Przy każdym push do main:

```
1. Push do GitHub (main branch)
   ↓
2. GitHub Actions automatycznie startuje
   ↓
3. Buduje obrazy (AMD64 + ARM64) - ~10-15 min
   ↓
4. Publikuje do ghcr.io/adasrakieta/journey-planner/
   ↓
5. Obrazy gotowe do pull'a!
```

### Przy deploymencie:

```
1. Portainer: "Pull latest image" + "Update stack"
   ↓
2. Docker pull'uje z ghcr.io
   ↓
3. Restart kontenerów z nowymi obrazami - ~1-2 min
   ↓
4. Gotowe!
```

## 🐛 Troubleshooting

### GitHub Actions Build Failed

**Sprawdź logi:**
- GitHub → Actions → Kliknij na failed workflow → Zobacz co poszło nie tak

**Najczęstsze problemy:**
1. **TypeScript errors** - Sprawdź czy kod się kompiluje lokalnie:
   ```bash
   cd server && npm run build
   cd client && npm run build
   ```

2. **Permissions** - Upewnij się że `secrets.GITHUB_TOKEN` jest włączony:
   - Settings → Actions → General → Workflow permissions → "Read and write permissions"

### Portainer: "pull access denied"

**Problem:** Obrazy są private

**Rozwiązanie 1 (LEPSZE):** Ustaw obrazy jako **Public** (zobacz sekcję powyżej)

**Rozwiązanie 2:** Login na Raspberry Pi:
```bash
# Wygeneruj Personal Access Token (PAT):
# GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
# Scopes: read:packages

# Na Raspberry Pi:
echo YOUR_GITHUB_PAT | docker login ghcr.io -u AdasRakieta --password-stdin
```

### Frontend unhealthy / 404 dla assets

**Sprawdź czy nowe obrazy są używane:**
```bash
docker images | grep journey-planner

# Sprawdź date utworzenia - powinno być "minutes ago" lub "hours ago"
```

**Force pull nowych obrazów:**
```bash
docker-compose pull
docker-compose up -d --force-recreate
```

### ARM64 build na GitHub zawiesza się

**Problem:** QEMU emulation może mieć problemy

**Rozwiązanie:** 
- Jeśli ARM64 build zawiesza się, możesz usunąć `linux/arm64` z workflow
- Wtedy build lokalny na Pi używając `docker-compose.dev.yml`

## 📝 Environment Variables Checklist

```env
# ✅ Docker - WAŻNE: Zmień na latest!
IMAGE_TAG=latest

# ✅ URLs - WAŻNE: Bez portów, tylko ścieżki
FRONTEND_URL=https://malina.tail384b18.ts.net
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net

# ✅ Database (bez zmian)
DB_HOST=100.103.184.90
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=admin
DB_PASSWORD=***

# ✅ JWT (bez zmian)
JWT_SECRET=J6Z1iosY09iPKlhYZ2Dr5Ke/zPqqQeaETxKxU2yIFEc=

# ✅ SMTP (bez zmian)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=***
SMTP_PASSWORD=***
SMTP_FROM_EMAIL=***
```

## 🎯 Quick Commands

### GitHub Actions
```bash
# Trigger manual build
# GitHub → Actions → "Build and Push..." → "Run workflow"

# Check build status
# GitHub → Actions → See latest run
```

### Raspberry Pi
```bash
# Pull latest images
docker-compose pull

# Update and restart
docker-compose up -d

# Force recreate (jeśli są problemy)
docker-compose down
docker-compose pull
docker-compose up -d --force-recreate

# Check logs
docker logs journey-planner-web --tail 50
docker logs journey-planner-api --tail 50
```

### Local Development (Build Locally)
```bash
# Build and run locally
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Back to production (pull from registry)
docker-compose up -d
```

## ✅ Success Criteria

Wszystko działa gdy:

- [ ] GitHub Actions workflow przechodzi ✅ (zielony checkmark)
- [ ] Obrazy widoczne w GitHub Packages
- [ ] Obrazy są **Public** lub Pi zalogowany do ghcr.io
- [ ] Portainer może pull'ować obrazy (brak "access denied")
- [ ] `docker images` pokazuje obrazy z ghcr.io/adasrakieta/...
- [ ] Frontend: `https://malina.tail384b18.ts.net/journey/` działa
- [ ] API: `https://malina.tail384b18.ts.net/journey/api/health` zwraca JSON
- [ ] Brak 404 dla assets w logach nginx
- [ ] F12 → Console - brak błędów CORS

## 📚 Więcej Informacji

- **GitHub Container Registry docs:** https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- **Portainer docs:** https://docs.portainer.io/user/docker/images/pull
- **Docker multi-platform builds:** https://docs.docker.com/build/building/multi-platform/
