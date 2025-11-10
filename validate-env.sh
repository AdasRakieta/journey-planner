#!/bin/bash
# Validate .env file for Journey Planner deployment

echo "🔍 Validating .env configuration..."
echo ""

if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo ""
    echo "Create it from template:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Load .env
set -a
source .env
set +a

# Required variables
REQUIRED_VARS=(
    "DB_HOST"
    "DB_PORT"
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
    "JWT_SECRET"
    "SMTP_HOST"
    "SMTP_USERNAME"
    "SMTP_PASSWORD"
    "FRONTEND_URL"
    "VITE_API_URL"
    "CORS_ORIGIN"
)

ERRORS=0

echo "📋 Checking required variables..."
echo ""

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing: $var"
        ERRORS=$((ERRORS + 1))
    else
        # Mask passwords
        if [[ $var == *"PASSWORD"* ]] || [[ $var == *"SECRET"* ]]; then
            echo "✅ $var = ********"
        else
            echo "✅ $var = ${!var}"
        fi
    fi
done

echo ""

# Specific validations
if [ ! -z "$DB_HOST" ]; then
    if [ "$DB_HOST" == "localhost" ] || [ "$DB_HOST" == "127.0.0.1" ]; then
        echo "⚠️  WARNING: DB_HOST is localhost - this won't work in Docker!"
        echo "   Use container IP (e.g., 172.17.0.2) or Tailscale IP"
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ ! -z "$JWT_SECRET" ]; then
    if [ ${#JWT_SECRET} -lt 32 ]; then
        echo "⚠️  WARNING: JWT_SECRET is too short (< 32 characters)"
        echo "   Generate secure one: openssl rand -base64 32"
        ERRORS=$((ERRORS + 1))
    fi
    
    if [ "$JWT_SECRET" == "your_super_secret_jwt_key_change_in_production_minimum_32_characters" ]; then
        echo "❌ ERROR: JWT_SECRET still has default value!"
        echo "   Generate secure one: openssl rand -base64 32"
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ ! -z "$SMTP_PASSWORD" ]; then
    if [ ${#SMTP_PASSWORD} -lt 10 ]; then
        echo "⚠️  WARNING: SMTP_PASSWORD looks too short"
        echo "   Gmail App Passwords are 16 characters"
    fi
fi

if [ ! -z "$FRONTEND_URL" ]; then
    if [[ $FRONTEND_URL == *"localhost"* ]]; then
        echo "⚠️  WARNING: FRONTEND_URL contains 'localhost'"
        echo "   Use Raspberry Pi IP for remote access"
    fi
fi

if [ ! -z "$VITE_API_URL" ]; then
    if [[ $VITE_API_URL == *"localhost"* ]]; then
        echo "⚠️  WARNING: VITE_API_URL contains 'localhost'"
        echo "   Use Raspberry Pi IP for remote access"
    fi
fi

echo ""
echo "═══════════════════════════════════════════"

if [ $ERRORS -eq 0 ]; then
    echo "✅ Configuration looks good!"
    echo ""
    echo "Next steps:"
    echo "  1. Test database connection:"
    echo "     PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c 'SELECT 1'"
    echo ""
    echo "  2. Deploy with docker-compose:"
    echo "     docker-compose up -d"
    echo ""
    echo "  3. Or deploy in Portainer:"
    echo "     - Copy all variables from .env to Portainer Environment Variables"
    echo "     - Make sure to use the exact variable names"
    exit 0
else
    echo "❌ Found $ERRORS error(s) in configuration"
    echo ""
    echo "Fix these issues before deploying!"
    exit 1
fi
