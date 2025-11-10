# 🔧 Nginx jako osobny Stack - Plan Migracji

## Dlaczego wyodrębnić Nginx?

### Obecna architektura:
```
SmartHome Stack
├── SmartHome App (port 5000)
└── Nginx (jako część stacku)

Journey Planner Stack
└── Journey Planner (port 5001)
```

### Docelowa architektura:
```
Nginx Stack (osobny)
├── Nginx reverse proxy
└── Obsługuje: SmartHome, Journey Planner, przyszłe projekty

SmartHome Stack
└── SmartHome App (port 5000)

Journey Planner Stack
└── Journey Planner (port 5001)
```

---

## 🎯 Korzyści

✅ **Separation of Concerns** - Nginx jako infrastruktura, nie część aplikacji  
✅ **Łatwiejsze zarządzanie** - wszystkie routing rules w jednym miejscu  
✅ **Niezależne restarty** - restart Nginx nie wpływa na aplikacje  
✅ **Centralne SSL** - Certbot dla wszystkich aplikacji w jednym stacku  
✅ **Skalowalność** - dodawanie projektów = edycja jednego pliku  

---

## 📋 Plan Migracji (Krok po kroku)

### Krok 1: Przygotowanie

**A. Zapisz obecną konfigurację Nginx:**
```bash
# SSH na Raspberry Pi
ssh pi@100.103.184.90

# Backup obecnej konfiguracji
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d)
sudo cat /etc/nginx/sites-available/default > ~/nginx-config-backup.txt
```

**B. Sprawdź które porty są używane:**
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Powinieneś zobaczyć:
- SmartHome na 5000
- Journey Planner API na 5001
- Journey Planner Frontend na 5173

---

### Krok 2: Utwórz Stack Nginx w Portainerze

**A. Portainer → Stacks → Add stack**
- Name: `nginx-proxy`

**B. Wklej ten docker-compose.yml:**

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: nginx-reverse-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Konfiguracja Nginx
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      
      # SSL certyfikaty (dla Let's Encrypt)
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_webroot:/var/www/certbot:ro
      - certbot_certs:/etc/letsencrypt:ro
    
    networks:
      - nginx-proxy-net
    
    restart: unless-stopped
    
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Opcjonalnie: Certbot dla automatycznego SSL
  certbot:
    image: certbot/certbot:latest
    container_name: nginx-certbot
    volumes:
      - certbot_webroot:/var/www/certbot
      - certbot_certs:/etc/letsencrypt
    
    # Automatyczne odnawianie certyfikatów
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
    
    networks:
      - nginx-proxy-net
    
    restart: unless-stopped

networks:
  nginx-proxy-net:
    name: nginx-proxy-network
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/16

volumes:
  certbot_webroot:
    driver: local
  certbot_certs:
    driver: local
```

**C. Dodaj Environment Variables:**
```env
TZ=Europe/Warsaw
```

---

### Krok 3: Przygotuj pliki konfiguracyjne

**A. Utwórz strukturę katalogów na Pi:**
```bash
mkdir -p ~/nginx-proxy/nginx/conf.d
mkdir -p ~/nginx-proxy/nginx/ssl
cd ~/nginx-proxy
```

**B. Utwórz `nginx/nginx.conf`:**
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    gzip on;

    # Include all site configs
    include /etc/nginx/conf.d/*.conf;
}
```

**C. Utwórz `nginx/conf.d/apps.conf`:**
```nginx
# SmartHome Application
upstream smarthome_backend {
    server 172.17.0.1:5000;  # Docker host IP + SmartHome port
}

# Journey Planner Frontend
upstream journey_frontend {
    server 172.17.0.1:5173;  # Docker host IP + Journey frontend port
}

# Journey Planner API
upstream journey_api {
    server 172.17.0.1:5001;  # Docker host IP + Journey API port
}

# Main server block
server {
    listen 80;
    server_name malina.tail384b18.ts.net 100.103.184.90;

    # Increase max body size for file uploads
    client_max_body_size 50M;

    # Root location - redirect to SmartHome
    location / {
        return 301 /smarthome/;
    }

    # SmartHome Application
    location /smarthome/ {
        proxy_pass http://smarthome_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Journey Planner Frontend
    location /journey/ {
        proxy_pass http://journey_frontend/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Journey Planner API
    location /journey/api/ {
        rewrite ^/journey/api/(.*) /api/$1 break;
        proxy_pass http://journey_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "Nginx is healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**D. (Opcjonalnie) Dla HTTPS - utwórz `nginx/conf.d/ssl.conf`:**
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name malina.tail384b18.ts.net;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name malina.tail384b18.ts.net;

    ssl_certificate /etc/letsencrypt/live/malina.tail384b18.ts.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/malina.tail384b18.ts.net/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;

    # ... reszta konfiguracji jak w apps.conf ...
}
```

---

### Krok 4: Deploy Stack Nginx

```bash
cd ~/nginx-proxy
```

**W Portainerze:**
1. Stacks → nginx-proxy → Editor
2. Upewnij się że docker-compose.yml jest poprawny
3. **Deploy the stack**
4. Sprawdź logi: `docker logs nginx-reverse-proxy`

---

### Krok 5: Połącz aplikacje z siecią Nginx

**A. Dodaj SmartHome do sieci Nginx:**
```bash
docker network connect nginx-proxy-network smarthome-container-name
```

**B. Dodaj Journey Planner do sieci Nginx:**
```bash
docker network connect nginx-proxy-network journey-planner-api
docker network connect nginx-proxy-network journey-planner-web
```

**Lub w docker-compose.yml każdej aplikacji dodaj:**
```yaml
networks:
  - default  # Własna sieć aplikacji
  - nginx-proxy-network  # Sieć Nginx

networks:
  nginx-proxy-network:
    external: true
```

---

### Krok 6: Aktualizuj zmienne środowiskowe aplikacji

**Journey Planner Environment Variables:**
```env
# Z Nginx:
FRONTEND_URL=https://malina.tail384b18.ts.net/journey
VITE_API_URL=https://malina.tail384b18.ts.net/journey/api
CORS_ORIGIN=https://malina.tail384b18.ts.net
```

**SmartHome - analogicznie**

---

### Krok 7: Testowanie

```bash
# Test Nginx
curl http://100.103.184.90/nginx-health

# Test SmartHome
curl http://100.103.184.90/smarthome/

# Test Journey Planner
curl http://100.103.184.90/journey/
curl http://100.103.184.90/journey/api/health
```

**W przeglądarce:**
- http://100.103.184.90/smarthome/
- http://100.103.184.90/journey/

---

### Krok 8: Usuń stary Nginx ze SmartHome

**Jeśli SmartHome miał własny Nginx w stacku:**
```bash
# Zatrzymaj stary Nginx
docker stop smarthome-nginx

# Usuń z docker-compose.yml SmartHome
```

---

## 🔧 Zarządzanie po migracji

### Dodawanie nowej aplikacji

1. **Deploy aplikacji** (np. na porcie 5002)
2. **Dodaj do nginx/conf.d/apps.conf:**
```nginx
upstream newapp_backend {
    server 172.17.0.1:5002;
}

location /newapp/ {
    proxy_pass http://newapp_backend/;
    # ... proxy headers ...
}
```
3. **Reload Nginx:**
```bash
docker exec nginx-reverse-proxy nginx -s reload
```

### Aktualizacja Nginx
```bash
cd ~/nginx-proxy
docker-compose pull nginx
docker-compose up -d nginx
```

### Backup konfiguracji
```bash
cd ~/nginx-proxy
tar -czf nginx-config-backup-$(date +%Y%m%d).tar.gz nginx/
```

---

## 📊 Porównanie: Przed vs Po

| Aspekt | Przed (Nginx w SmartHome) | Po (Nginx osobny) |
|--------|---------------------------|-------------------|
| Restart Nginx | Wpływa na SmartHome | Nie wpływa na aplikacje |
| Dodanie projektu | Modyfikacja SmartHome | Tylko edycja Nginx config |
| SSL dla wszystkich | Trzeba w każdym stacku | Raz w Nginx |
| Zarządzanie | Rozproszone | Centralne |
| Skalowanie | Trudne | Łatwe |

---

## 🚨 Potencjalne problemy

### Problem 1: Aplikacje nie widzą Nginx

**Rozwiązanie:** Dodaj aplikacje do sieci `nginx-proxy-network`

### Problem 2: 502 Bad Gateway

**Sprawdź:**
1. Czy aplikacja działa? `docker ps`
2. Czy porty są poprawne w `apps.conf`?
3. Czy IP hosta jest poprawny? `ip addr show docker0`

### Problem 3: CORS errors

**Upewnij się że aplikacje mają:**
```env
CORS_ORIGIN=https://malina.tail384b18.ts.net
```
(BEZ /journey/ dla CORS!)

---

## ✅ Checklist migracji

- [ ] Backup obecnej konfiguracji Nginx
- [ ] Utwórz katalogi na Pi (`~/nginx-proxy/nginx/conf.d`)
- [ ] Skopiuj pliki konfiguracyjne
- [ ] Deploy stack nginx-proxy w Portainerze
- [ ] Połącz aplikacje z siecią nginx-proxy-network
- [ ] Zaktualizuj zmienne środowiskowe aplikacji
- [ ] Test wszystkich endpoint
- [ ] Usuń stary Nginx ze SmartHome (opcjonalnie)
- [ ] Backup nowej konfiguracji

---

## 📚 Zobacz też

- **NGINX_INTEGRATION.md** - Szczegóły integracji Nginx
- **URL_CONFIGURATION_GUIDE.md** - Konfiguracja URL dla różnych trybów
- **PORTAINER_ENV.md** - Zarządzanie zmiennymi środowiskowymi

---

**Czas migracji:** ~30-45 minut  
**Trudność:** Średnia  
**Zalecane:** TAK - dla 2+ aplikacji korzystających z Nginx
