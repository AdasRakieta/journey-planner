# 🔧 Konfiguracja Nginx dla SmartHome

## 📋 Instrukcja dla Projektu SmartHome

Ten plik zawiera **kompletną konfigurację Nginx** do dodania Journey Planner do istniejącej aplikacji SmartHome.

---

## 🎯 Cel

Dodaj routing dla Journey Planner do istniejącego Nginx w projekcie SmartHome bez wpływu na działanie SmartHome.

---

## 📝 Konfiguracja Nginx

### Dodaj do pliku `default.conf` w SmartHome:

```nginx
# ========================================
# JOURNEY PLANNER - NOWE SEKCJE
# ========================================

# Upstream dla Journey Planner
upstream journey_client {
    server journey-planner-client:80;
}

upstream journey_api {
    server journey-planner-server:5001;
}

# W sekcji server {}:

    # Journey Planner - Frontend (React)
    location /journey/ {
        proxy_pass http://journey_client/;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
    }

    # Journey Planner - API (Backend)
    location /journey/api/ {
        proxy_pass http://journey_api/api/;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        
        # CORS headers dla API
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Journey Planner - WebSocket (Socket.IO)
    location /journey/socket.io/ {
        proxy_pass http://journey_api/socket.io/;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket specific
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
```

---

## 🐳 Docker Compose - Dodaj do SmartHome

### 1. Dodaj nowe services:

```yaml
services:
  # ... istniejące SmartHome services ...

  # ========================================
  # JOURNEY PLANNER SERVICES
  # ========================================
  
  journey-planner-db:
    image: postgres:17-alpine
    container_name: journey-planner-db
    environment:
      POSTGRES_DB: journey_planner
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${JOURNEY_DB_PASSWORD}
    volumes:
      - journey-db-data:/var/lib/postgresql/data
    networks:
      - journey-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d journey_planner"]
      interval: 10s
      timeout: 5s
      retries: 5

  journey-planner-server:
    image: ${DOCKERHUB_USERNAME}/journey-planner-server:latest
    container_name: journey-planner-server
    environment:
      NODE_ENV: production
      PORT: 5001
      DB_HOST: journey-planner-db
      DB_PORT: 5432
      DB_NAME: journey_planner
      DB_USER: admin
      DB_PASSWORD: ${JOURNEY_DB_PASSWORD}
      FRONTEND_URL: ${BASE_URL}/journey/
    networks:
      - journey-network
    depends_on:
      journey-planner-db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3

  journey-planner-client:
    image: ${DOCKERHUB_USERNAME}/journey-planner-client:latest
    container_name: journey-planner-client
    environment:
      VITE_API_URL: ${BASE_URL}/journey/api
    networks:
      - journey-network
    depends_on:
      journey-planner-server:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3

networks:
  # ... istniejące sieci SmartHome ...
  
  journey-network:
    driver: bridge

volumes:
  # ... istniejące volumes SmartHome ...
  
  journey-db-data:
    driver: local
```

### 2. Zaktualizuj Nginx service:

```yaml
  nginx:
    # ... istniejąca konfiguracja ...
    networks:
      - smarthome-network  # istniejąca
      - journey-network     # DODAJ TO
    depends_on:
      # ... istniejące zależności ...
      - journey-planner-server  # DODAJ
      - journey-planner-client  # DODAJ
```

---

## 🔐 Environment Variables

Dodaj do pliku `.env` w SmartHome:

```bash
# Journey Planner
JOURNEY_DB_PASSWORD=your_secure_password_here
DOCKERHUB_USERNAME=your_dockerhub_username
BASE_URL=http://your-raspberry-pi  # LUB https://twoja-domena.pl
```

---

## 🚀 Deployment

### Krok 1: Zaktualizuj docker-compose.yml
```bash
# Dodaj powyższe sekcje do docker-compose.yml
```

### Krok 2: Zaktualizuj Nginx config
```bash
# Skopiuj sekcje Journey Planner do Nginx config
```

### Krok 3: Dodaj zmienne środowiskowe
```bash
# Dodaj do .env
```

### Krok 4: Restart stack
```bash
docker-compose down
docker-compose up -d
```

### Krok 5: Test połączenia
```bash
# SmartHome
curl http://localhost/smarthome/

# Journey Planner
curl http://localhost/journey/
curl http://localhost/journey/api/health
```

---

## 🧪 Testowanie

Po wdrożeniu sprawdź:

✅ **SmartHome działa** - `http://raspberry-pi/smarthome/`
✅ **Journey Planner działa** - `http://raspberry-pi/journey/`
✅ **API działa** - `http://raspberry-pi/journey/api/health` zwraca 200
✅ **WebSocket działa** - real-time sync w Journey Planner

---

## 🐛 Troubleshooting

### Problem: 502 Bad Gateway na /journey/

**Rozwiązanie:**
```bash
# Sprawdź czy services są w sieci journey-network
docker network inspect journey-network

# Sprawdź logi
docker logs nginx
docker logs journey-planner-client
docker logs journey-planner-server
```

### Problem: WebSocket nie działa

**Rozwiązanie:**
Upewnij się że Nginx ma:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

### Problem: CSS/JS nie ładują się

**Rozwiązanie:**
Sprawdź `VITE_API_URL` w journey-planner-client:
```bash
docker exec journey-planner-client env | grep VITE_API_URL
# Powinno być: http://raspberry-pi/journey/api
```

---

## 📊 Routing Table

| Path | Service | Port | Opis |
|------|---------|------|------|
| `/smarthome/` | SmartHome Backend | 5000 | Istniejąca aplikacja |
| `/journey/` | Journey Client | 80 | Frontend React |
| `/journey/api/` | Journey Server | 5001 | Backend API |
| `/journey/socket.io/` | Journey Server | 5001 | WebSocket |

---

## 🔒 Security Notes

- ✅ Journey Planner używa **osobnej bazy danych** (PostgreSQL)
- ✅ Journey Planner używa **osobnej sieci Docker** (journey-network)
- ✅ Nginx jest jedynym punktem wejścia (gateway)
- ✅ Backend services nie są wystawione na zewnątrz
- ✅ CORS zabezpieczony przez Nginx headers

---

## 📚 Dokumentacja Pomocnicza

- `PORTAINER_DEPLOY.md` - GitHub Actions CI/CD
- `NGINX_INTEGRATION.md` - Szczegółowa integracja z Nginx
- `docker-compose.portainer.yml` - Przykład standalone stack

---

**Pytania?** Sprawdź pełną dokumentację w projekcie Journey Planner.
