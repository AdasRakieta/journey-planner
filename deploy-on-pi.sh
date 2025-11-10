#!/bin/bash
# Deploy Journey Planner on Raspberry Pi with existing PostgreSQL

set -e  # Exit on error

echo "🚀 Deploying Journey Planner on Raspberry Pi"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo ""
    echo "Please create .env file from template:"
    echo "  cp .env.prod.example .env"
    echo "  nano .env  # Edit with your actual values"
    echo ""
    echo "⚠️  Important: Set DB_HOST to your existing PostgreSQL container IP"
    echo "   Find it with: docker inspect <postgres-container-name> | grep IPAddress"
    exit 1
fi

# Load environment variables
source .env

# Check if DB_HOST is set
if [ -z "$DB_HOST" ]; then
    echo "❌ Error: DB_HOST not set in .env"
    echo "   Set it to your existing PostgreSQL container IP address"
    exit 1
fi

echo "📦 Configuration:"
echo "  DB_HOST: $DB_HOST"
echo "  DB_PORT: ${DB_PORT:-5432}"
echo "  DB_NAME: ${DB_NAME:-journey_planner}"
echo "  BACKEND_PORT: ${BACKEND_PORT:-5001}"
echo "  FRONTEND_PORT: ${FRONTEND_PORT:-5173}"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
if command -v psql &> /dev/null; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U ${DB_USER:-journey_user} -d ${DB_NAME:-journey_planner} -c "SELECT version();" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Database connection successful"
    else
        echo "⚠️  Warning: Could not connect to database"
        echo "   This might be normal if psql is not installed"
        echo "   The app will try to connect anyway"
    fi
else
    echo "⚠️  psql not found, skipping connection test"
fi

echo ""
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "🎨 Pulling latest images..."
docker pull ghcr.io/adasrakieta/journey-planner/backend:arm64 || echo "⚠️  Could not pull backend image, will use local"
docker pull ghcr.io/adasrakieta/journey-planner/frontend:arm64 || echo "⚠️  Could not pull frontend image, will use local"

echo ""
echo "🚀 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check backend health
echo "🔍 Checking backend health..."
for i in {1..10}; do
    if curl -sf http://localhost:${BACKEND_PORT:-5001}/api/health > /dev/null; then
        echo "✅ Backend is healthy"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ Backend health check failed"
        echo "   Check logs: docker logs journey-planner-api"
    else
        echo "   Attempt $i/10..."
        sleep 3
    fi
done

# Check frontend
echo "🔍 Checking frontend..."
if curl -sf http://localhost:${FRONTEND_PORT:-5173} > /dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️  Frontend might not be ready yet"
    echo "   Check logs: docker logs journey-planner-web"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Service URLs:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):${FRONTEND_PORT:-5173}"
echo "  Backend:  http://$(hostname -I | awk '{print $1}'):${BACKEND_PORT:-5001}"
echo "  API Docs: http://$(hostname -I | awk '{print $1}'):${BACKEND_PORT:-5001}/api/health"
echo ""
echo "📊 View logs:"
echo "  docker logs -f journey-planner-api"
echo "  docker logs -f journey-planner-web"
echo ""
echo "🛑 Stop services:"
echo "  docker-compose -f docker-compose.prod.yml down"
