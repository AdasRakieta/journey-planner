#!/bin/bash

# Journey Planner Deployment Script for Raspberry Pi
# This script helps automate the deployment process

set -e

echo "🚀 Journey Planner Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Raspberry Pi (optional check)
if [ -f /proc/device-tree/model ]; then
    DEVICE=$(cat /proc/device-tree/model)
    print_info "Detected device: $DEVICE"
fi

# Step 1: Check Node.js installation
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
NODE_VERSION=$(node -v)
print_info "Node.js version: $NODE_VERSION"

# Step 2: Check PostgreSQL installation
print_info "Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL is not installed. Installing..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
fi

# Step 3: Setup PostgreSQL database
print_info "Setting up PostgreSQL database..."
read -p "Enter PostgreSQL database name [journey_planner]: " DB_NAME
DB_NAME=${DB_NAME:-journey_planner}

read -p "Enter PostgreSQL username [journey_user]: " DB_USER
DB_USER=${DB_USER:-journey_user}

read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo

sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

print_info "Database created successfully!"

# Step 4: Install dependencies
print_info "Installing dependencies..."
npm run install:all

# Step 5: Setup environment files
print_info "Setting up environment files..."

# Backend .env
if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
    sed -i "s/DB_NAME=journey_planner/DB_NAME=$DB_NAME/" server/.env
    sed -i "s/DB_USER=postgres/DB_USER=$DB_USER/" server/.env
    sed -i "s/DB_PASSWORD=your_postgres_password/DB_PASSWORD=$DB_PASSWORD/" server/.env
    sed -i "s/NODE_ENV=production/NODE_ENV=production/" server/.env
    print_info "Backend .env file created"
else
    print_warning "Backend .env file already exists, skipping..."
fi

# Frontend .env.production
if [ ! -f client/.env.production ]; then
    read -p "Enter your domain (e.g., your-domain.ts.net) or press Enter for localhost: " DOMAIN
    if [ -z "$DOMAIN" ]; then
        API_URL="http://localhost:5001/api"
    else
        API_URL="https://$DOMAIN/journey/api"
    fi
    echo "VITE_API_URL=$API_URL" > client/.env.production
    print_info "Frontend .env.production file created"
else
    print_warning "Frontend .env.production file already exists, skipping..."
fi

# Step 6: Build applications
print_info "Building applications..."
npm run build:all

# Step 7: Setup PM2
print_info "Setting up PM2..."
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    sudo npm install -g pm2
fi

# Stop existing instance if running
pm2 delete journey-planner-api 2>/dev/null || true

# Start the application
cd server
pm2 start dist/index.js --name journey-planner-api
pm2 save

print_info "PM2 process started and saved"

# Setup PM2 startup
print_info "Setting up PM2 to start on boot..."
pm2 startup

# Step 8: Nginx configuration instructions
echo ""
print_info "🎉 Deployment completed successfully!"
echo ""
print_info "Next steps:"
echo "1. Configure nginx using the guide in NGINX_SETUP.md"
echo "2. Access your API at: http://localhost:5001/api/health"
echo "3. View PM2 logs: pm2 logs journey-planner-api"
echo "4. Check PM2 status: pm2 status"
echo ""
print_info "Frontend build is located at: client/dist/"
print_info "Configure nginx to serve this directory"
echo ""
print_warning "Don't forget to:"
echo "  - Set up SSL certificates if using HTTPS"
echo "  - Configure firewall rules if needed"
echo "  - Update nginx configuration as documented"
