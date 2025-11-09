# 🚀 Deploy Journey Planner to Portainer via GitHub

## Przegląd

Ten projekt automatycznie buduje obrazy Docker i publikuje je na Docker Hub przy każdym commicie do `main`. Możesz potem łatwo zdeployować aplikację w Portainerze.

## 📋 Wymagania Wstępne

1. **Docker Hub Account**: Utwórz konto na [hub.docker.com](https://hub.docker.com)
2. **GitHub Secrets**: Dodaj w repozytorium:
   - `DOCKERHUB_USERNAME`: Twoja nazwa użytkownika Docker Hub
   - `DOCKERHUB_TOKEN`: Token dostępu (Settings → Security → New Access Token)
3. **Portainer**: Zainstalowany na Raspberry Pi lub serwerze

## 🔧 Setup GitHub Secrets

1. Idź do: `Settings` → `Secrets and variables` → `Actions`
2. Dodaj `New repository secret`:
   - **Name**: `DOCKERHUB_USERNAME`
   - **Value**: Twoja nazwa użytkownika Docker Hub
3. Dodaj kolejny secret:
   - **Name**: `DOCKERHUB_TOKEN`
   - **Value**: Token z Docker Hub (Create token → Read, Write, Delete)

## 🐳 Dostępne Obrazy Docker

Po pierwszym push do `main`, GitHub Actions zbuduje:
- `{DOCKERHUB_USERNAME}/journey-planner-server:latest`
- `{DOCKERHUB_USERNAME}/journey-planner-client:latest`

## 📦 Deploy w Portainerze - Metoda 1: Git Repository (Zalecana)

1. Otwórz Portainer (np. `http://raspberry-pi:9000`)
2. Idź do **Stacks** → **Add Stack**
3. **Stack name**: `journey-planner`
4. **Build method**: Wybierz **Repository**
5. **Repository URL**: `https://github.com/AdasRakieta/journey-planner`
6. **Reference**: `refs/heads/main`
7. **Compose path**: `docker-compose.portainer.yml`
8. **Environment variables**:
   ```
   DOCKERHUB_USERNAME=twoja-nazwa-docker-hub
   DB_PASSWORD=bezpieczne-haslo-postgresql
   DB_USER=admin
   FRONTEND_URL=http://twoj-raspberry-pi:3000
   API_URL=http://twoj-raspberry-pi:5001/api
   ```
9. Kliknij **Deploy the stack**

### Auto-Update po każdym commicie:
- Po push do `main`, GitHub zbuduje nowe obrazy
- W Portainerze: Kliknij **Pull and redeploy** w swoim stacku
- Portainer pobierze najnowsze obrazy z Docker Hub

## 📦 Deploy w Portainerze - Metoda 2: Web Editor

1. Pobierz `docker-compose.portainer.yml` z Actions artifacts
2. W Portainerze: **Stacks** → **Add Stack**
3. **Stack name**: `journey-planner`
4. **Build method**: **Web editor**
5. Wklej zawartość `docker-compose.portainer.yml`
6. Dodaj zmienne środowiskowe (jak wyżej)
7. **Deploy the stack**

## 🔄 Workflow CI/CD

```
1. Developer push do main
   ↓
2. GitHub Actions trigger
   ↓
3. Build Server + Client Docker images
   ↓
4. Push do Docker Hub
   ↓
5. Portainer Pull and Redeploy
   ↓
6. Aplikacja zaktualizowana! ✅
```

## 🌐 Nginx Reverse Proxy Setup

Dodaj do `/etc/nginx/sites-available/default` na Raspberry Pi:

```nginx
# Journey Planner Backend API
location /journey/ {
    proxy_pass http://localhost:5001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

# Journey Planner Frontend
location /journey-app/ {
    proxy_pass http://localhost:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

# WebSocket support dla Socket.IO
location /socket.io/ {
    proxy_pass http://localhost:5001/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

Restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 📊 Monitoring

### Health checks:
- Backend: `http://raspberry-pi:5001/api/health`
- Frontend: `http://raspberry-pi:3000/`
- Database: Sprawdź w Portainer Containers

### Logi:
```bash
# W Portainerze: Containers → journey-planner-server → Logs
# Lub przez terminal:
docker logs journey-planner-server
docker logs journey-planner-client
docker logs journey-planner-db
```

## 🔒 Bezpieczeństwo

1. **Zmień domyślne hasło** do PostgreSQL (`DB_PASSWORD`)
2. **Użyj HTTPS** w produkcji (Let's Encrypt + Nginx)
3. **Firewall**: Otwórz tylko porty 80, 443 (Nginx), zamknij 5001, 3000, 5432
4. **Backup bazy**:
   ```bash
   docker exec journey-planner-db pg_dump -U admin journey_planner > backup.sql
   ```

## 🆘 Troubleshooting

### Obrazy nie budują się na GitHub
- Sprawdź: Actions → Ostatni workflow → Zobacz logi
- Sprawdź czy `DOCKERHUB_USERNAME` i `DOCKERHUB_TOKEN` są poprawne

### Stack nie startuje w Portainerze
- Sprawdź zmienne środowiskowe (wszystkie wymagane ustawione?)
- Zobacz logi kontenera który failuje
- Sprawdź czy obrazy zostały pobrane z Docker Hub

### Baza danych nie działa
- Sprawdź czy PostgreSQL kontener jest zdrowy: `docker ps`
- Zobacz logi: `docker logs journey-planner-db`
- Sprawdź połączenie: `docker exec -it journey-planner-db psql -U admin -d journey_planner`

### Frontend nie łączy się z backendem
- Sprawdź `API_URL` w zmiennych środowiskowych
- Sprawdź CORS w backen dzie (`FRONTEND_URL`)
- Sprawdź network w Portainerze (wszystkie kontenery w tej samej sieci)

## 📚 Dodatkowe Zasoby

- [Docker Hub](https://hub.docker.com)
- [Portainer Docs](https://docs.portainer.io/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Nginx Reverse Proxy Guide](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

## 🎉 Gotowe!

Teraz każdy push do `main` automatycznie:
1. Buduje nowe obrazy Docker
2. Publikuje je na Docker Hub
3. Możesz je zdeployować jednym kliknięciem w Portainerze

**Enjoy your automated deployment! 🚀**
