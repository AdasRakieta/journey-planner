#!/bin/bash
# Verify Nginx Stack Deployment
# Run this script on Raspberry Pi after deployment

set -e

echo "🔍 Journey Planner + SmartHome - Deployment Verification"
echo "==========================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_ok() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Check Docker Containers
echo "1️⃣  Checking Docker Containers..."
echo "-----------------------------------"

containers=("nginx-proxy" "journey-planner-api" "journey-planner-web" "smarthome-app")
all_running=true

for container in "${containers[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        status=$(docker inspect --format='{{.State.Status}}' "$container")
        if [ "$status" == "running" ]; then
            check_ok "$container is running"
        else
            check_fail "$container exists but status: $status"
            all_running=false
        fi
    else
        check_fail "$container not found"
        all_running=false
    fi
done

if [ "$all_running" = true ]; then
    check_ok "All containers are running"
else
    check_fail "Some containers are not running properly"
fi

echo ""

# 2. Check Container Health
echo "2️⃣  Checking Container Health..."
echo "-----------------------------------"

for container in "${containers[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
        if [ "$health" == "healthy" ]; then
            check_ok "$container health: healthy"
        elif [ "$health" == "no-healthcheck" ]; then
            check_warn "$container has no health check configured"
        else
            check_fail "$container health: $health"
        fi
    fi
done

echo ""

# 3. Check Nginx Configuration
echo "3️⃣  Checking Nginx Configuration..."
echo "-----------------------------------"

if docker exec nginx-proxy nginx -t 2>&1 | grep -q "successful"; then
    check_ok "Nginx configuration is valid"
else
    check_fail "Nginx configuration has errors"
    docker exec nginx-proxy nginx -t
fi

echo ""

# 4. Check SSL Certificates
echo "4️⃣  Checking SSL Certificates..."
echo "-----------------------------------"

if docker exec nginx-proxy ls /etc/ssl/tailscale/malina.tail384b18.ts.net.crt >/dev/null 2>&1; then
    check_ok "SSL certificate found"
else
    check_fail "SSL certificate not found"
fi

if docker exec nginx-proxy ls /etc/ssl/tailscale/malina.tail384b18.ts.net.key >/dev/null 2>&1; then
    check_ok "SSL key found"
else
    check_fail "SSL key not found"
fi

echo ""

# 5. Check Network Connectivity
echo "5️⃣  Checking Internal Network..."
echo "-----------------------------------"

if docker exec nginx-proxy ping -c 1 journey-planner-api >/dev/null 2>&1; then
    check_ok "Nginx → Journey API: Connected"
else
    check_fail "Nginx → Journey API: Cannot connect"
fi

if docker exec nginx-proxy ping -c 1 journey-planner-web >/dev/null 2>&1; then
    check_ok "Nginx → Journey Frontend: Connected"
else
    check_fail "Nginx → Journey Frontend: Cannot connect"
fi

if docker exec nginx-proxy ping -c 1 smarthome-app >/dev/null 2>&1; then
    check_ok "Nginx → SmartHome: Connected"
else
    check_fail "Nginx → SmartHome: Cannot connect"
fi

echo ""

# 6. Check Internal HTTP Responses
echo "6️⃣  Checking Internal HTTP Responses..."
echo "-----------------------------------"

# Journey Backend Health
if docker exec journey-planner-api wget -qO- http://localhost:5001/api/health 2>&1 | grep -q "ok"; then
    check_ok "Journey Backend API: Responding"
else
    check_fail "Journey Backend API: Not responding"
fi

# Journey Frontend
if docker exec journey-planner-web wget -qO- http://localhost/index.html 2>&1 | grep -q "<!DOCTYPE html>"; then
    check_ok "Journey Frontend: Serving HTML"
else
    check_fail "Journey Frontend: Not serving HTML"
fi

# Nginx Health
if docker exec nginx-proxy wget -qO- http://localhost/health 2>&1 | grep -q "healthy"; then
    check_ok "Nginx: Health endpoint responding"
else
    check_fail "Nginx: Health endpoint not responding"
fi

echo ""

# 7. Check External URLs (HTTPS)
echo "7️⃣  Checking External URLs..."
echo "-----------------------------------"

# Journey Frontend
if curl -k -s https://malina.tail384b18.ts.net/journey/ | grep -q "<!DOCTYPE html>"; then
    check_ok "https://malina.tail384b18.ts.net/journey/ - Accessible"
else
    check_fail "https://malina.tail384b18.ts.net/journey/ - Not accessible"
fi

# Journey API Health
if curl -k -s https://malina.tail384b18.ts.net/journey/api/health | grep -q "ok"; then
    check_ok "https://malina.tail384b18.ts.net/journey/api/health - Responding"
else
    check_fail "https://malina.tail384b18.ts.net/journey/api/health - Not responding"
fi

# SmartHome
if curl -k -s https://malina.tail384b18.ts.net/smarthome/ | head -n 1 | grep -q "200\|302\|<!DOCTYPE"; then
    check_ok "https://malina.tail384b18.ts.net/smarthome/ - Accessible"
else
    check_warn "https://malina.tail384b18.ts.net/smarthome/ - Check manually"
fi

echo ""

# 8. Check Database Connection
echo "8️⃣  Checking Database Connection..."
echo "-----------------------------------"

db_check=$(docker exec journey-planner-api node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
client.connect()
  .then(() => { console.log('OK'); client.end(); })
  .catch(() => { console.log('FAIL'); process.exit(1); });
" 2>&1)

if echo "$db_check" | grep -q "OK"; then
    check_ok "Database connection: OK"
else
    check_fail "Database connection: Failed"
fi

echo ""

# 9. Check Volumes
echo "9️⃣  Checking Volumes..."
echo "-----------------------------------"

if docker volume ls | grep -q "journey_attachment_uploads"; then
    check_ok "Volume 'journey_attachment_uploads' exists"
else
    check_fail "Volume 'journey_attachment_uploads' not found"
fi

echo ""

# 10. Check Logs for Errors
echo "🔟 Checking Recent Logs for Errors..."
echo "-----------------------------------"

error_count=$(docker logs nginx-proxy --since 5m 2>&1 | grep -i "error" | wc -l)
if [ "$error_count" -gt 0 ]; then
    check_warn "Nginx: $error_count errors in last 5 minutes"
else
    check_ok "Nginx: No errors in last 5 minutes"
fi

error_count=$(docker logs journey-planner-api --since 5m 2>&1 | grep -i "error" | wc -l)
if [ "$error_count" -gt 0 ]; then
    check_warn "Journey Backend: $error_count errors in last 5 minutes"
else
    check_ok "Journey Backend: No errors in last 5 minutes"
fi

echo ""

# Summary
echo "==========================================================="
echo "📊 Deployment Verification Complete"
echo "==========================================================="
echo ""
echo "🌐 Public URLs:"
echo "   Journey Planner: https://malina.tail384b18.ts.net/journey/"
echo "   SmartHome:       https://malina.tail384b18.ts.net/smarthome/"
echo "   Portainer:       https://malina.tail384b18.ts.net/portainer/"
echo ""
echo "🔧 Useful Commands:"
echo "   docker ps                        # Check running containers"
echo "   docker logs nginx-proxy          # Nginx logs"
echo "   docker logs journey-planner-api  # Backend logs"
echo "   docker exec nginx-proxy nginx -t # Test Nginx config"
echo ""
