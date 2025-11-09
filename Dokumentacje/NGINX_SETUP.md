# Nginx Configuration for Journey Planner + SmartHome Apps

This document explains how to configure nginx to serve both the Journey Planner and SmartHome applications under the same Tailscale domain.

## Configuration Overview

Since both applications need to be accessible through the same domain, we'll use path-based routing:
- SmartHome app: `https://your-domain.ts.net/smarthome/`
- Journey Planner: `https://your-domain.ts.net/journey/`

## Nginx Configuration Example

Add this to your nginx configuration file (typically in `/etc/nginx/sites-available/`):

```nginx
# Journey Planner Backend API
upstream journey_planner_api {
    server localhost:5001;
}

# SmartHome Backend API (existing)
upstream smarthome_api {
    server localhost:5000;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.ts.net;

    # Redirect HTTP to HTTPS (if you're using SSL)
    # return 301 https://$server_name$request_uri;

    # SmartHome Application Routes
    location /smarthome/ {
        alias /path/to/smarthome/build/;
        try_files $uri $uri/ /smarthome/index.html;
    }

    location /smarthome/api/ {
        proxy_pass http://smarthome_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Journey Planner Application Routes
    location /journey/ {
        alias /home/pi/journey-planner/client/dist/;
        try_files $uri $uri/ /journey/index.html;
    }

    location /journey/api/ {
        proxy_pass http://journey_planner_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Root path - redirect to one of the apps or show a landing page
    location = / {
        return 301 /smarthome/;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## Alternative: Subdomain-based routing

If you prefer using subdomains instead:
- SmartHome: `smarthome.your-domain.ts.net`
- Journey Planner: `journey.your-domain.ts.net`

```nginx
# SmartHome Server Block
server {
    listen 80;
    server_name smarthome.your-domain.ts.net;

    location / {
        root /path/to/smarthome/build;
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        # ... proxy headers ...
    }
}

# Journey Planner Server Block
server {
    listen 80;
    server_name journey.your-domain.ts.net;

    location / {
        root /home/pi/journey-planner/client/dist;
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5001;
        # ... proxy headers ...
    }
}
```

## Frontend Configuration Update

When using path-based routing, update the frontend build configuration:

### For Journey Planner (Vite)
In `client/vite.config.ts`:
```typescript
export default defineConfig({
  base: '/journey/',
  // ... other config
})
```

Update `.env.production`:
```
VITE_API_URL=/journey/api
```

## Steps to Deploy on Raspberry Pi

1. **Clone the repository:**
   ```bash
   cd /home/pi
   git clone <your-repo-url> journey-planner
   cd journey-planner
   ```

2. **Set up PostgreSQL database:**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE journey_planner;
   CREATE USER journey_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE journey_planner TO journey_user;
   \q
   ```

3. **Configure environment variables:**
   ```bash
   # Backend
   cp server/.env.example server/.env
   nano server/.env  # Update with your actual values
   
   # Frontend
   cp client/.env.example client/.env.production
   nano client/.env.production  # Update with your API URL
   ```

4. **Install dependencies and build:**
   ```bash
   # Backend
   cd server
   npm install
   npm run build
   
   # Frontend
   cd ../client
   npm install
   npm run build
   ```

5. **Set up PM2 for process management:**
   ```bash
   sudo npm install -g pm2
   cd /home/pi/journey-planner/server
   pm2 start dist/index.js --name journey-planner-api
   pm2 save
   pm2 startup
   ```

6. **Update nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/default
   # Add the Journey Planner configuration
   sudo nginx -t  # Test configuration
   sudo systemctl reload nginx
   ```

7. **Verify the setup:**
   - Backend health: `http://your-raspberry-pi-ip:5001/api/health`
   - After nginx: `https://your-domain.ts.net/journey/`

## Port Summary

- **SmartHome API**: Port 5000
- **Journey Planner API**: Port 5001
- **PostgreSQL**: Port 5432 (default)
- **Nginx**: Port 80/443 (HTTP/HTTPS)

## Troubleshooting

1. **Port conflicts**: Make sure port 5001 is available:
   ```bash
   sudo lsof -i :5001
   ```

2. **PostgreSQL connection issues**:
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -l  # List databases
   ```

3. **Nginx logs**:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

4. **Application logs**:
   ```bash
   pm2 logs journey-planner-api
   ```
