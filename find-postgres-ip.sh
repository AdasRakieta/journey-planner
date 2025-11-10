#!/bin/bash
# Helper script to find existing PostgreSQL container IP

echo "🔍 Searching for PostgreSQL containers..."
echo ""

# Find all Postgres containers
POSTGRES_CONTAINERS=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" 2>/dev/null)

if [ -z "$POSTGRES_CONTAINERS" ]; then
    echo "❌ No running PostgreSQL containers found"
    echo ""
    echo "💡 Suggestions:"
    echo "  1. Start your existing Postgres container"
    echo "  2. Or search all containers: docker ps -a | grep postgres"
    echo "  3. Or create new one with: docker-compose up -d postgres"
    exit 1
fi

# Show all Postgres containers with IPs
echo "📦 Found PostgreSQL containers:"
echo ""

for container in $POSTGRES_CONTAINERS; do
    IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $container)
    PORT=$(docker port $container | grep 5432 | cut -d':' -f2)
    STATUS=$(docker inspect -f '{{.State.Status}}' $container)
    
    echo "Container: $container"
    echo "  Status:  $STATUS"
    echo "  IP:      $IP"
    echo "  Port:    ${PORT:-5432}"
    echo ""
    
    # Try to get database info
    echo "  Trying to connect..."
    DB_USER=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' $container | grep POSTGRES_USER | cut -d'=' -f2)
    DB_NAME=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' $container | grep POSTGRES_DB | cut -d'=' -f2)
    
    if [ ! -z "$DB_USER" ]; then
        echo "  DB User: $DB_USER"
    fi
    if [ ! -z "$DB_NAME" ]; then
        echo "  DB Name: $DB_NAME"
    fi
    echo ""
    echo "  Use in .env:"
    echo "    DB_HOST=$IP"
    echo "    DB_PORT=5432"
    [ ! -z "$DB_NAME" ] && echo "    DB_NAME=$DB_NAME"
    [ ! -z "$DB_USER" ] && echo "    DB_USER=$DB_USER"
    echo ""
    echo "---"
    echo ""
done

# Also show stopped Postgres containers
STOPPED=$(docker ps -a --filter "ancestor=postgres" --filter "status=exited" --format "{{.Names}}" 2>/dev/null)
if [ ! -z "$STOPPED" ]; then
    echo "⚠️  Stopped PostgreSQL containers:"
    for container in $STOPPED; do
        echo "  - $container (use: docker start $container)"
    done
    echo ""
fi

# Show command to test connection
echo "🧪 Test connection manually:"
echo "  docker exec -it <container-name> psql -U <username> -d <database>"
echo ""
echo "📝 After finding your container, update .env:"
echo "  cp .env.prod.example .env"
echo "  nano .env  # Set DB_HOST to the IP shown above"
