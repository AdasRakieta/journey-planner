# Development Examples - Journey Planner

Praktyczne przykłady użycia i scenariusze rozwoju aplikacji.

## 🎯 Scenariusze Rozwoju

### 1. Daily Development Workflow

```bash
# Poranek - start pracy
cd journey-planner
docker-compose up -d postgres      # Start DB w tle
npm run dev                        # Start app

# Praca...
# http://localhost:5173 - frontend
# http://localhost:5001/api - backend

# Wieczór - koniec pracy
# Ctrl+C aby zatrzymać npm run dev
docker-compose down                # Stop DB
```

### 2. Feature Development

```bash
# 1. Utwórz branch
git checkout -b feature/new-feature

# 2. Start development environment
docker-compose up -d postgres
npm run dev

# 3. Develop...
# - Edytuj kod
# - Testuj w przeglądarce
# - Sprawdzaj logi w terminalu

# 4. Test przed commitem
npm run build:all                  # Sprawdź czy builduje
curl http://localhost:5001/api/health  # Test backend

# 5. Commit & push
git add .
git commit -m "feat: new feature"
git push origin feature/new-feature
```

### 3. Bug Fixing Workflow

```bash
# 1. Reproduce bug lokalnie
docker-compose up -d postgres
npm run dev

# 2. Debug - osobne terminale dla lepszej kontroli
# Terminal 1: Backend z logami
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev

# Terminal 3: Database access
docker exec -it journey-planner-db psql -U journey_user -d journey_planner

# 3. Fix bug
# 4. Test
# 5. Commit
```

### 4. Testing Built Application

```bash
# 1. Build całej aplikacji
npm run build:all

# 2. Start database
docker-compose up -d postgres

# 3. Test backend
cd server && npm start
# Sprawdź: http://localhost:5001/api/health

# 4. Test frontend z Python server
# Terminal 1:
python scripts/serve-local.py

# Terminal 2:
cd server && npm run dev

# 5. Open http://localhost:8000
# 6. Test wszystkie funkcjonalności
```

### 5. Database Schema Changes

```bash
# 1. Backup danych (jeśli istotne)
docker exec journey-planner-db pg_dump -U journey_user journey_planner > backup.sql

# 2. Stop aplikację
# Ctrl+C

# 3. Edytuj model Sequelize
# server/src/models/Journey.ts

# 4. Reset database (rozwinie nowy schema)
docker-compose down -v
docker-compose up -d postgres

# 5. Restart app
npm run dev

# 6. Sprawdź schema w DB
docker exec -it journey-planner-db psql -U journey_user -d journey_planner
\d journeys
```

## 🧪 Testing Scenarios

### Test 1: API Endpoint Testing

```bash
# Start backend
cd server && npm run dev

# Test health endpoint
curl http://localhost:5001/api/health

# Test journeys endpoint
curl http://localhost:5001/api/journeys

# Create journey
curl -X POST http://localhost:5001/api/journeys \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Journey","startDate":"2024-01-01","endDate":"2024-01-10","currency":"PLN"}'

# Get specific journey
curl http://localhost:5001/api/journeys/1

# Update journey
curl -X PUT http://localhost:5001/api/journeys/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Journey"}'

# Delete journey
curl -X DELETE http://localhost:5001/api/journeys/1
```

### Test 2: Frontend-Backend Integration

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev

# Terminal 3: Watch Network requests
# Open browser: http://localhost:5173
# Open DevTools (F12) -> Network tab
# Create a journey and watch API calls
```

### Test 3: Production-like Testing

```bash
# 1. Build
npm run build:all

# 2. Serve
# Terminal 1: Frontend
cd client/dist
python -m http.server 8000

# Terminal 2: Backend
cd server
NODE_ENV=production npm start

# 3. Test
open http://localhost:8000
```

## 🔧 Common Development Tasks

### Add New API Endpoint

```typescript
// 1. server/src/routes/journeys.ts
router.get('/stats', journeyController.getStats);

// 2. server/src/controllers/journeyController.ts
export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await Journey.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalJourneys'],
        [sequelize.fn('SUM', sequelize.col('totalEstimatedCost')), 'totalCost']
      ]
    });
    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// 3. client/src/services/api.ts
async getStats(): Promise<{totalJourneys: number, totalCost: number}> {
  const response = await fetch(`${API_URL}/journeys/stats`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

// 4. Test
curl http://localhost:5001/api/journeys/stats
```

### Add New React Component

```typescript
// 1. client/src/components/JourneyStats.tsx
import React, { useEffect, useState } from 'react';
import { journeyService } from '../services/api';

const JourneyStats: React.FC = () => {
  const [stats, setStats] = useState<{totalJourneys: number, totalCost: number} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await journeyService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>No stats available</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Statistics</h3>
      <p>Total Journeys: {stats.totalJourneys}</p>
      <p>Total Cost: {stats.totalCost} PLN</p>
    </div>
  );
};

export default JourneyStats;

// 2. Import in App.tsx
import JourneyStats from './components/JourneyStats';

// 3. Use in render
<JourneyStats />
```

### Database Queries

```typescript
// Find all journeys with stops and transports
const journeys = await Journey.findAll({
  include: [
    { model: Stop, include: [Attraction] },
    { model: Transport }
  ]
});

// Find journey by ID
const journey = await Journey.findByPk(id, {
  include: [
    { model: Stop, include: [Attraction] },
    { model: Transport }
  ]
});

// Create journey with stops
const journey = await Journey.create({
  title: 'New Journey',
  startDate: new Date(),
  endDate: new Date(),
  currency: 'PLN'
});

await Stop.create({
  journeyId: journey.id,
  city: 'Warsaw',
  country: 'Poland',
  latitude: 52.2297,
  longitude: 21.0122,
  arrivalDate: new Date(),
  departureDate: new Date()
});

// Update journey
await journey.update({
  title: 'Updated Journey'
});

// Delete journey (cascade deletes stops, transports, attractions)
await journey.destroy();
```

## 🚀 Deployment Preparation

### Pre-deployment Checklist

```bash
# 1. Update dependencies
npm run install:all

# 2. Run tests (if any)
# npm test

# 3. Build applications
npm run build:all

# 4. Test built applications locally
# Terminal 1:
python scripts/serve-local.py

# Terminal 2:
cd server && NODE_ENV=production npm start

# 5. Check for errors in browser console

# 6. Verify all features work

# 7. Check environment variables
cat server/.env.production
cat client/.env.production

# 8. Ready to deploy!
```

### Deploy to Raspberry Pi

```bash
# Option 1: Automated
chmod +x deploy.sh
./deploy.sh

# Option 2: Manual
# 1. SSH to Raspberry Pi
ssh pi@your-raspberry-pi.local

# 2. Navigate to project
cd /path/to/journey-planner

# 3. Pull latest code
git pull origin main

# 4. Install dependencies
npm run install:all

# 5. Build
npm run build:all

# 6. Restart with PM2
pm2 restart journey-planner-api

# 7. Check status
pm2 status
pm2 logs journey-planner-api

# 8. Test
curl http://localhost:5001/api/health
```

## 📊 Performance Testing

### Backend Performance

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:5001/api/health

# Test journeys endpoint
ab -n 100 -c 5 http://localhost:5001/api/journeys
```

### Database Performance

```sql
-- Connect to database
docker exec -it journey-planner-db psql -U journey_user -d journey_planner

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM journeys WHERE start_date > '2024-01-01';

-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Add indexes for performance
CREATE INDEX idx_journeys_dates ON journeys(start_date, end_date);
CREATE INDEX idx_stops_journey_id ON stops(journey_id);
```

## 🔍 Debugging Tips

### Backend Debugging

```bash
# Verbose logging
cd server
DEBUG=express:* npm run dev

# Node.js inspector
node --inspect dist/index.js

# Then open chrome://inspect in Chrome
```

### Frontend Debugging

```bash
# Open DevTools (F12)
# - Console tab: errors and logs
# - Network tab: API calls
# - Application tab: localStorage, cookies
# - Elements tab: inspect DOM

# Source maps available in dev mode for debugging TypeScript
```

### Database Debugging

```bash
# Check tables
docker exec -it journey-planner-db psql -U journey_user -d journey_planner
\dt

# Check data
SELECT * FROM journeys;
SELECT * FROM stops WHERE journey_id = 1;
SELECT * FROM transports WHERE journey_id = 1;

# Check relations
SELECT j.title, s.city, t.type 
FROM journeys j
LEFT JOIN stops s ON j.id = s.journey_id
LEFT JOIN transports t ON j.id = t.journey_id;
```

---

**Need more examples?** Check out:
- [README.md](../README.md)
- [QUICK_REFERENCE.md](../QUICK_REFERENCE.md)
- [scripts/README.md](README.md)
