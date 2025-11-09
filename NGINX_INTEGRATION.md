# Integracja Journey Planner z istniejącym Nginx (SmartHome)

## Krok 1: Zaktualizuj konfigurację Nginx

Edytuj plik konfiguracyjny Nginx (np. `/etc/nginx/conf.d/default.conf` lub w volume):

```nginx
server {
    listen 80;
    server_name localhost;

    # SmartHome (istniejąca aplikacja)
    location /smarthome/ {
        proxy_pass http://smarthome-backend:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Journey Planner Frontend
    location /journey/ {
        proxy_pass http://journey-planner-client/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Handle SPA routing
        try_files $uri $uri/ /index.html;
    }

    # Journey Planner Backend API
    location /journey/api/ {
        proxy_pass http://journey-planner-server:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Journey Planner WebSocket (Socket.IO)
    location /journey/socket.io/ {
        proxy_pass http://journey-planner-server:5001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## Krok 2: Zaktualizuj Docker Compose

### Jeśli masz istniejący `docker-compose.yml` dla SmartHome:

```yaml
version: '3.8'

services:
  # Istniejący Nginx
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl  # jeśli używasz SSL
    networks:
      - smarthome-network
      - journey-network  # DODAJ
    restart: unless-stopped
    depends_on:
      - smarthome-backend
      - journey-planner-server
      - journey-planner-client

  # Istniejący SmartHome backend
  smarthome-backend:
    # ... twoja konfiguracja ...
    networks:
      - smarthome-network

  # NOWE - Journey Planner Database
  journey-planner-db:
    image: postgres:17-alpine
    container_name: journey-planner-db
    environment:
      POSTGRES_DB: journey_planner
      POSTGRES_USER: ${DB_USER:-admin}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - journey-db-data:/var/lib/postgresql/data
      - ./journey-planner/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - journey-network
    restart: unless-stopped

  # NOWE - Journey Planner Backend
  journey-planner-server:
    image: ${DOCKERHUB_USERNAME}/journey-planner-server:latest
    container_name: journey-planner-server
    environment:
      NODE_ENV: production
      PORT: 5001
      DB_HOST: journey-planner-db
      DB_PORT: 5432
      DB_NAME: journey_planner
      DB_USER: ${DB_USER:-admin}
      DB_PASSWORD: ${DB_PASSWORD}
      FRONTEND_URL: http://localhost/journey/
    networks:
      - journey-network
    depends_on:
      - journey-planner-db
    restart: unless-stopped

  # NOWE - Journey Planner Frontend
  journey-planner-client:
    image: ${DOCKERHUB_USERNAME}/journey-planner-client:latest
    container_name: journey-planner-client
    environment:
      VITE_API_URL: http://localhost/journey/api
    networks:
      - journey-network
    depends_on:
      - journey-planner-server
    restart: unless-stopped

networks:
  smarthome-network:
    driver: bridge
  journey-network:  # NOWA
    driver: bridge

volumes:
  journey-db-data:  # NOWY
    driver: local
```

## Krok 3: Zaktualizuj zmienne środowiskowe

Utwórz/zaktualizuj `.env`:

```bash
# Journey Planner
DOCKERHUB_USERNAME=twoja-nazwa-dockerhub
DB_USER=admin
DB_PASSWORD=twoje-bezpieczne-haslo
DB_PORT=5432

# Ports (internal)
SERVER_PORT=5001
CLIENT_PORT=80
```

## Krok 4: Deploy

```bash
# 1. Zatrzymaj istniejące kontenery
docker-compose down

# 2. Pobierz najnowsze obrazy Journey Planner
docker pull ${DOCKERHUB_USERNAME}/journey-planner-server:latest
docker pull ${DOCKERHUB_USERNAME}/journey-planner-client:latest

# 3. Uruchom wszystko razem
docker-compose up -d

# 4. Sprawdź logi
docker-compose logs -f nginx
docker-compose logs -f journey-planner-server
docker-compose logs -f journey-planner-client

# 5. Sprawdź status
docker-compose ps
```

## Krok 5: Testowanie

1. **SmartHome**: http://raspberry-pi/smarthome/
2. **Journey Planner**: http://raspberry-pi/journey/
3. **Journey API**: http://raspberry-pi/journey/api/health
4. **WebSocket**: Powinien działać automatycznie przez `/journey/socket.io/`

## Krok 6 (Opcjonalnie): SSL/HTTPS

Jeśli masz certyfikat SSL (Let's Encrypt):

```nginx
server {
    listen 443 ssl http2;
    server_name twoja-domena.pl;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # ... reszta konfiguracji taka sama ...
    
    location /smarthome/ { ... }
    location /journey/ { ... }
    location /journey/api/ { ... }
}

# Redirect HTTP -> HTTPS
server {
    listen 80;
    server_name twoja-domena.pl;
    return 301 https://$server_name$request_uri;
}
```

## Troubleshooting

### Problem: 502 Bad Gateway na /journey/
**Rozwiązanie**: Sprawdź czy kontenery są w tej samej sieci:
```bash
docker network inspect journey-network
docker network inspect smarthome-network
docker network connect journey-network nginx-proxy
```

### Problem: WebSocket nie działa
**Rozwiązanie**: Sprawdź browser console:
- Powinien łączyć się z `/journey/socket.io/`
- Sprawdź CORS w backen dzie (FRONTEND_URL)

### Problem: Frontend nie ładuje CSS/JS
**Rozwiązanie**: Sprawdź base path w Vite config:
```typescript
// client/vite.config.ts
export default defineConfig({
  base: '/journey/',  // DODAJ TO
  // ...
})
```
Rebuild obrazu: `docker build -t ${DOCKERHUB_USERNAME}/journey-planner-client:latest client/`

### Problem: API 404
**Rozwiązanie**: Sprawdź `.env` w kliencie:
```
VITE_API_URL=http://raspberry-pi/journey/api
```

## Portainer Integration

Jeśli używasz Portainer:

1. **Stacks** → Wybierz istniejący stack lub utwórz nowy
2. **Web Editor** → Wklej zaktualizowany docker-compose.yml
3. **Environment variables** → Dodaj zmienne z .env
4. **Deploy/Update stack**

## Monitoring

```bash
# Logi wszystkich Journey Planner services
docker-compose logs -f journey-planner-server journey-planner-client journey-planner-db

# Status health check
curl http://localhost/journey/api/health
curl http://localhost/smarthome/health  # jeśli masz

# Nginx access logs
docker exec nginx-proxy tail -f /var/log/nginx/access.log
```

## Backup

```bash
# Backup bazy Journey Planner
docker exec journey-planner-db pg_dump -U admin journey_planner > backup-$(date +%Y%m%d).sql

# Restore
docker exec -i journey-planner-db psql -U admin journey_planner < backup-20250109.sql
```

---

**Gotowe!** Teraz masz obie aplikacje za jednym Nginx:
- `http://raspberry-pi/smarthome/` → SmartHome
- `http://raspberry-pi/journey/` → Journey Planner 🚀
