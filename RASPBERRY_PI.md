# 🍓 Deployment on Raspberry Pi

This guide explains how to deploy Journey Planner on Raspberry Pi using existing PostgreSQL database.

## Prerequisites

- Raspberry Pi with Docker installed
- Existing PostgreSQL container/instance running on Pi
- Git installed

## Quick Start

### 1. Clone Repository

```bash
cd ~
git clone https://github.com/AdasRakieta/journey-planner.git
cd journey-planner
```

### 2. Build ARM64 Images Locally

Since GitHub Actions builds only AMD64, build ARM64 images natively on Pi:

```bash
chmod +x build-on-pi.sh
./build-on-pi.sh
```

This builds:
- `ghcr.io/adasrakieta/journey-planner/backend:arm64`
- `ghcr.io/adasrakieta/journey-planner/frontend:arm64`

### 3. Find Your PostgreSQL Container IP

```bash
# List all containers
docker ps

# Get IP of your existing PostgreSQL container
docker inspect <your-postgres-container-name> | grep IPAddress
```

You'll see something like: `"IPAddress": "172.17.0.2"`

### 4. Configure Environment

```bash
# Copy template
cp .env.prod.example .env

# Edit with your values
nano .env
```

**Important settings:**
```bash
# Database - use IP from step 3
DB_HOST=172.17.0.2  # Your actual Postgres container IP
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=your_actual_password

# JWT - generate secure secret
JWT_SECRET=$(openssl rand -base64 32)

# Email - use Gmail App Password
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password

# Frontend URL - use your Pi's IP
FRONTEND_URL=http://192.168.1.100:5173  # Your Pi IP
VITE_API_URL=http://192.168.1.100:5001/api
CORS_ORIGIN=http://192.168.1.100:5173
```

### 5. Deploy

```bash
chmod +x deploy-on-pi.sh
./deploy-on-pi.sh
```

The script will:
- ✅ Test database connection
- ✅ Pull latest images (or use local)
- ✅ Start backend + frontend containers
- ✅ Check health of services

### 6. Access Application

```
Frontend: http://your-pi-ip:5173
Backend:  http://your-pi-ip:5001/api/health
```

## Manual Deployment

If you prefer manual control:

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker logs -f journey-planner-api
docker logs -f journey-planner-web

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Database Setup

If your existing PostgreSQL doesn't have Journey Planner database yet:

```bash
# Connect to your existing Postgres container
docker exec -it <your-postgres-container> psql -U postgres

# Create database and user
CREATE DATABASE journey_planner;
CREATE USER journey_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE journey_planner TO journey_user;
\q
```

The backend will automatically create tables on first run using Sequelize migrations.

## Nginx Setup (Optional)

To serve via Nginx on port 80/443:

```nginx
# /etc/nginx/sites-available/journey-planner
server {
    listen 80;
    server_name your-pi-hostname.local;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/journey-planner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Troubleshooting

### Cannot connect to database

```bash
# Check if Postgres container is running
docker ps | grep postgres

# Check container IP
docker inspect <postgres-container> | grep IPAddress

# Test connection
PGPASSWORD=your_password psql -h 172.17.0.2 -U journey_user -d journey_planner -c "SELECT 1"
```

### Backend not starting

```bash
# Check logs
docker logs journey-planner-api

# Common issues:
# - Wrong DB_HOST IP
# - Wrong DB credentials
# - JWT_SECRET not set
```

### Port already in use

If ports 5001 or 5173 are occupied:

```bash
# Change ports in .env
BACKEND_PORT=5002
FRONTEND_PORT=5174

# Redeploy
./deploy-on-pi.sh
```

### Images not found

If you haven't built images locally:

```bash
# Build ARM64 images
./build-on-pi.sh

# Or pull from GHCR (if you pushed them)
docker login ghcr.io -u adasrakieta
docker pull ghcr.io/adasrakieta/journey-planner/backend:arm64
docker pull ghcr.io/adasrakieta/journey-planner/frontend:arm64
```

## Updating

```bash
# Pull latest code
cd ~/journey-planner
git pull origin main

# Rebuild images
./build-on-pi.sh

# Redeploy
./deploy-on-pi.sh
```

## Monitoring

```bash
# Check container status
docker ps

# Check resource usage
docker stats

# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# Check backend health
curl http://localhost:5001/api/health
```

## Backup

```bash
# Backup database (from your existing Postgres container)
docker exec <postgres-container> pg_dump -U journey_user journey_planner > backup.sql

# Restore
docker exec -i <postgres-container> psql -U journey_user journey_planner < backup.sql
```

## Uninstall

```bash
# Stop and remove containers
docker-compose -f docker-compose.prod.yml down

# Remove images (optional)
docker rmi ghcr.io/adasrakieta/journey-planner/backend:arm64
docker rmi ghcr.io/adasrakieta/journey-planner/frontend:arm64

# Note: This does NOT remove your existing PostgreSQL database
```
