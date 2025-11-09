# Quick Start Guide 🚀

Get Journey Planner up and running in minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ installed (or Docker)
- Git

## Option 1: Quick Setup (5 minutes)

### Using Docker (Recommended for testing)

1. **Clone the repository**
```bash
git clone https://github.com/AdasRakieta/journey-planner.git
cd journey-planner
```

2. **Start PostgreSQL with Docker**
```bash
docker-compose up -d postgres
```

3. **Install dependencies**
```bash
npm run install:all
```

4. **Setup environment variables**
```bash
# Backend
cp server/.env.example server/.env

# Frontend  
cp client/.env.example client/.env
```

5. **Start the application**
```bash
npm run dev
```

6. **Open your browser**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001/api/health

That's it! 🎉

## Option 2: Production Setup (Raspberry Pi)

### Automated Deployment

```bash
# Clone the repo
git clone https://github.com/AdasRakieta/journey-planner.git
cd journey-planner

# Run the deployment script
chmod +x deploy.sh
./deploy.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Set up PostgreSQL database
- ✅ Install dependencies
- ✅ Configure environment variables
- ✅ Build the applications
- ✅ Set up PM2 for process management

### Manual Deployment

If you prefer manual setup, follow these steps:

1. **Set up PostgreSQL**
```bash
sudo -u postgres psql
CREATE DATABASE journey_planner;
CREATE USER journey_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE journey_planner TO journey_user;
\q
```

2. **Clone and install**
```bash
git clone https://github.com/AdasRakieta/journey-planner.git
cd journey-planner
npm run install:all
```

3. **Configure environment**
```bash
# Backend
cp server/.env.example server/.env
nano server/.env  # Edit with your settings

# Frontend
cp client/.env.example client/.env.production
nano client/.env.production  # Set your API URL
```

4. **Build**
```bash
npm run build:all
```

5. **Start with PM2**
```bash
sudo npm install -g pm2
cd server
pm2 start dist/index.js --name journey-planner-api
pm2 save
pm2 startup
```

6. **Configure nginx** (see NGINX_SETUP.md)

## First Use

### Create Your First Journey

1. **Open the app** in your browser
2. **Click "New Journey"** button (top-right)
3. **Fill in the details:**
   - Title: "Summer Europe Trip"
   - Start Date: Your departure date
   - End Date: Your return date
   - Currency: EUR
4. **Click "Create"**

### Add Your First Stop

1. **Click on the map** where you want to go
2. **Enter stop details:**
   - City: Paris
   - Country: France
   - Arrival: June 1, 2024
   - Departure: June 5, 2024
3. **Click "Add Stop"**

### Add Accommodation

1. **Click on your stop**
2. **Enter accommodation:**
   - Name: Hotel de Paris
   - URL: (paste booking link)
   - Price: 150
   - Currency: EUR
3. **Save**

### Add Transportation

1. **Click "Add Transport"**
2. **Select type:** Flight
3. **Fill details:**
   - From: New York
   - To: Paris
   - Dates and times
   - Price: 450 EUR
4. **Save**

Done! You've created your first journey! 🎉

## Verify Installation

### Check Backend
```bash
curl http://localhost:5001/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Journey Planner API is running"
}
```

### Check Database
```bash
sudo -u postgres psql -d journey_planner -c "\dt"
```

Should show tables: journeys, stops, transports, attractions

### Check Frontend
Open http://localhost:5173 in your browser. You should see the Journey Planner interface.

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>
```

### Database Connection Error
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql

# Check connection
psql -U journey_user -d journey_planner -h localhost
```

### Frontend Build Errors
```bash
# Clear cache and reinstall
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

### PM2 Issues
```bash
# Check logs
pm2 logs journey-planner-api

# Restart
pm2 restart journey-planner-api

# Check status
pm2 status
```

## Development vs Production

### Development (Local)
```bash
# Uses ports 5173 (frontend) and 5001 (backend)
npm run dev

# Hot reload enabled
# Debugging tools available
# Uses local PostgreSQL or Docker
```

### Production (Raspberry Pi)
```bash
# Builds optimized bundles
npm run build:all

# Runs on port 5001 (backend only)
# Frontend served by nginx
# Uses PM2 for process management
# Nginx handles routing and SSL
```

## Next Steps

1. **Read the User Guide** (USER_GUIDE.md) - Learn all features
2. **Configure nginx** (NGINX_SETUP.md) - Set up web server
3. **Customize** - Adjust colors, add features, etc.
4. **Backup** - Set up automated backups for PostgreSQL

## Useful Commands

```bash
# Development
npm run dev              # Start both frontend & backend
npm run client:dev       # Start frontend only
npm run server:dev       # Start backend only

# Building
npm run build:all        # Build both applications
npm run client:build     # Build frontend only
npm run server:build     # Build backend only

# PM2 Management
pm2 status              # Check running processes
pm2 logs                # View logs
pm2 restart all         # Restart all processes
pm2 stop all            # Stop all processes

# Database
sudo -u postgres psql journey_planner  # Connect to DB
pg_dump journey_planner > backup.sql   # Backup database
psql journey_planner < backup.sql      # Restore database
```

## Resources

- **Full Documentation**: README.md
- **User Guide**: USER_GUIDE.md
- **Nginx Setup**: NGINX_SETUP.md
- **Contributing**: CONTRIBUTING.md
- **Issues**: https://github.com/AdasRakieta/journey-planner/issues

## Get Help

- 📖 Read the documentation
- 🐛 Check known issues
- 💬 Open a GitHub issue
- 📧 Contact maintainers

---

Happy coding! 🎉
