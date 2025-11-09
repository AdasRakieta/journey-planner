# Szybki Start - Integracja z Istniejącym SmartHome

## 🎯 Cel

Dodaj Journey Planner do istniejącego stack SmartHome w Portainer używając tego samego Nginx.

## 📋 Wymagania

- ✅ Działający SmartHome w Portainer
- ✅ Nginx już skonfigurowany dla SmartHome
- ✅ Docker Hub account z Journey Planner images
- ✅ Dostęp do Portainer

## 🚀 Metoda 1: Aktualizacja Istniejącego Stack (Zalecana)

### Krok 1: Dodaj Journey Planner Services

Otwórz swój istniejący stack SmartHome w Portainer i dodaj do `docker-compose.yml`:

```yaml
# Na końcu sekcji services:
  journey-planner-db:
    image: postgres:17-alpine
    container_name: journey-planner-db
    environment:
      POSTGRES_DB: journey_planner
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - journey-db-data:/var/lib/postgresql/data
    networks:
      - journey-network
    restart: unless-stopped

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
      DB_PASSWORD: ${DB_PASSWORD}
    networks:
      - journey-network
    depends_on:
      - journey-planner-db
    restart: unless-stopped

  journey-planner-client:
    image: ${DOCKERHUB_USERNAME}/journey-planner-client:latest
    container_name: journey-planner-client
    environment:
      VITE_API_URL: http://your-raspberry-pi/journey/api
    networks:
      - journey-network
    depends_on:
      - journey-planner-server
    restart: unless-stopped

# Na końcu sekcji networks:
  journey-network:
    driver: bridge

# Na końcu sekcji volumes:
  journey-db-data:
    driver: local
```

### Krok 2: Zaktualizuj Nginx Service

Znajdź service `nginx` i dodaj `journey-network`:

```yaml
  nginx:
    image: nginx:alpine
    networks:
      - smarthome-network  # istniejąca
      - journey-network     # DODAJ TO
    depends_on:
      - journey-planner-server  # DODAJ TO
      - journey-planner-client  # DODAJ TO
```

### Krok 3: Zaktualizuj Nginx Config

Skopiuj `nginx-multi-app.conf` do swojego volumenu Nginx:

```bash
# Na Raspberry Pi:
docker cp nginx-multi-app.conf nginx-proxy:/etc/nginx/conf.d/default.conf
docker exec nginx-proxy nginx -t  # Test konfiguracji
docker exec nginx-proxy nginx -s reload  # Przeładuj config
```

### Krok 4: Dodaj Environment Variables

W Portainer → Twój Stack → Environment Variables:

- `DB_PASSWORD=your_secure_password`
- `DOCKERHUB_USERNAME=your_dockerhub_username`

### Krok 5: Update Stack

Kliknij **"Update the stack"** w Portainer.

### Krok 6: Testowanie

```bash
# SmartHome (istniejąca)
http://your-raspberry-pi/smarthome/

# Journey Planner (nowa)
http://your-raspberry-pi/journey/

# Journey Planner API
http://your-raspberry-pi/journey/api/health
```

---

## 🔧 Metoda 2: Osobny Stack (Alternatywa)

Jeśli wolisz osobny stack w Portainer:

### Krok 1: Użyj docker-compose.integrated.yml

W Portainer → Add Stack → Web editor → Wklej zawartość `docker-compose.integrated.yml`

### Krok 2: Połącz z Istniejącą Siecią SmartHome

W `docker-compose.integrated.yml` zmień:

```yaml
networks:
  smarthome-network:
    external: true  # Użyj istniejącej sieci
    name: smarthome_smarthome-network  # Nazwa stack_network
```

### Krok 3: Deploy

Environment variables:
- `DB_PASSWORD`
- `DOCKERHUB_USERNAME`
- `BASE_URL=http://your-raspberry-pi`

---

## 🎨 URLs po Integracji

| Aplikacja | URL | Opis |
|-----------|-----|------|
| SmartHome | `/smarthome/` | Istniejąca aplikacja |
| Journey Planner | `/journey/` | Nowa aplikacja |
| Journey API | `/journey/api/` | Backend API |
| Journey WebSocket | `/journey/socket.io/` | Real-time sync |
| Nginx Health | `/nginx-health` | Status Nginx |

---

## 🐛 Troubleshooting

### Problem: 502 Bad Gateway na /journey/

**Rozwiązanie:**
```bash
# Sprawdź czy services są w tej samej sieci
docker network inspect journey-network

# Sprawdź logi
docker logs nginx-proxy
docker logs journey-planner-client
docker logs journey-planner-server
```

### Problem: WebSocket nie działa

**Rozwiązanie:**
Sprawdź czy Nginx ma `proxy_set_header Upgrade`:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

### Problem: CSS/JS nie ładują się

**Rozwiązanie:**
Sprawdź czy frontend ma poprawny `VITE_API_URL`:

```bash
docker exec journey-planner-client env | grep VITE_API_URL
# Powinno być: http://your-raspberry-pi/journey/api
```

---

## 📚 Dokumentacja

Szczegółowe instrukcje:
- `NGINX_INTEGRATION.md` - Pełna integracja z wieloma opcjami
- `PORTAINER_DEPLOY.md` - GitHub Actions CI/CD
- `docker-compose.integrated.yml` - Przykład multi-app stack
- `nginx-multi-app.conf` - Kompletna konfiguracja Nginx

---

## ✅ Checklist Wdrożenia

- [ ] Backup istniejącego docker-compose.yml SmartHome
- [ ] Dodanie Journey Planner services do stack
- [ ] Aktualizacja Nginx service (dodanie journey-network)
- [ ] Aktualizacja Nginx config (nginx-multi-app.conf)
- [ ] Dodanie environment variables (DB_PASSWORD, DOCKERHUB_USERNAME)
- [ ] Update stack w Portainer
- [ ] Test SmartHome - `/smarthome/` działa
- [ ] Test Journey Planner - `/journey/` działa
- [ ] Test API - `/journey/api/health` zwraca 200
- [ ] Test WebSocket - real-time sync działa

---

**Gotowe!** Obie aplikacje działają na jednym Nginx 🎉
