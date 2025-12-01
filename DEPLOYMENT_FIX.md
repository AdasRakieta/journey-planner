# 🚀 Journey Planner Deployment - Quick Start

## Problem: "unauthorized" podczas pull z ghcr.io

### Rozwiązanie 1: Build lokalnie (najszybsze) ✅

Odkomentowałem sekcje `build` w `docker-compose.yml`. Teraz Portainer zbuduje obrazy lokalnie:

1. W Portainer → Stacks → journey-planner
2. Kliknij **"Pull and redeploy"**
3. Portainer zbuduje obrazy z kodu źródłowego

### Rozwiązanie 2: Dodaj GitHub Registry do Portainer

1. **Portainer → Registries → Add registry**
2. Custom registry:
   - Registry URL: `ghcr.io`
   - Username: `AdasRakieta`
   - Password: [Twój GitHub Token z uprawnieniami `packages:read`]

### Rozwiązanie 3: Login przez SSH

```bash
# SSH do Raspberry Pi
ssh admin@192.168.1.218

# Login do GitHub Container Registry
echo "YOUR_TOKEN" | docker login ghcr.io -u AdasRakieta --password-stdin

# Teraz możesz pullować obrazy
docker pull ghcr.io/adasrakieta/journey-planner/backend:latest
docker pull ghcr.io/adasrakieta/journey-planner/frontend:latest
```

## 📝 Wymagane Uprawnienia dla GitHub Token

Token musi mieć:
- ✅ **Account permissions → Packages: Read and write**
- ✅ Repository → Actions: Read and write
- ✅ Repository → Contents: Read

Token który masz na screenshocie ma tylko **Repository access** bez **Packages**.

## 🔄 Co Zmieniono

- ✅ `docker-compose.yml`: Odkomentowano sekcje `build` dla backend i frontend
- ✅ Teraz Portainer zbuduje obrazy lokalnie zamiast pullować z ghcr.io
- ✅ Dodano `mammoth` do `client/package.json` (fix build error)
- ✅ Utworzono bazę danych PostgreSQL: `journey_planner`

## 📦 Baza Danych

```
Host:     192.168.1.218
Port:     5432
Database: journey_planner
User:     journey_user
Password: QWERasdf1234!@#$
```

## ✅ Teraz możesz zdeployować w Portainer!
