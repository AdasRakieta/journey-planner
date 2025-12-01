import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Wymuś ładowanie .env z katalogu głównego
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Jeśli istnieje stack.env (Portainer), załaduj dodatkowo i nadpisz zmienne
const stackEnvPath = path.resolve(__dirname, '../../stack.env');
if (require('fs').existsSync(stackEnvPath)) {
  console.log('📦 Loading Portainer stack.env...');
  dotenv.config({ path: stackEnvPath, override: true });
}

import { Server } from 'socket.io';
import { connectDB, DB_AVAILABLE } from './config/db';
import jsonStore from './config/jsonStore';
import { hashPassword } from './utils/auth';
import journeyRoutes from './routes/journeys';
import stopRoutes from './routes/stops';
import attractionRoutes from './routes/attractions';
import transportRoutes from './routes/transports';
import attachmentRoutes from './routes/attachments';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import currencyRoutes from './routes/currency';
import proxyRoutes from './routes/proxy';
import proxyRenderRoutes from './routes/proxyRender';
import { startAutoRefresh } from './services/currencyService';

// Validate required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Make sure these variables are set in your .env file or Docker environment');
  process.exit(1);
}

console.log('✅ All required environment variables are set');
console.log(`📊 Database configuration:`);
console.log(`   Host: ${process.env.DB_HOST}`);
console.log(`   Port: ${process.env.DB_PORT}`);
console.log(`   Database: ${process.env.DB_NAME}`);
console.log(`   User: ${process.env.DB_USER}`);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5001;

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'https://twoja-domena',
  credentials: true
}));
app.use(express.json());

// Connect to PostgreSQL and offer retry if connection fails
const tryConnect = async () => {
  const ok = await connectDB();
  return !!ok;
};

// Startup: attempt DB, if unreachable fall back to JSON store automatically
(async () => {
  try {
    const ok = await tryConnect();
    if (!ok) {
      console.warn('\nDatabase not reachable - server will run using JSON fallback. Continuing automatically.');
      
      // Ensure JSON users store has at least an admin account (only in fallback mode)
      try {
        const users = await jsonStore.getAll('users');
        const hasAdmin = users.some((u: any) => u.username === 'admin');
        if (!hasAdmin) {
          const pw = 'admin123';
          const pwHash = await hashPassword(pw);
          const adminUser = {
            username: 'admin',
            email: 'admin@local',
            password_hash: pwHash,
            role: 'admin',
            is_active: true,
            email_verified: true,
            created_at: new Date().toISOString()
          };
          await jsonStore.insert('users', adminUser);
          console.log("⚙️ JSON fallback: created default admin user 'admin' with password 'admin123' in server/data/users.json");
        }
      } catch (e) {
        console.error('Failed to ensure admin user in JSON store:', e);
      }
    } else {
      console.log('✅ Using PostgreSQL database - JSON fallback disabled');
    }

    // no interactive prompt - continue automatically

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
      });
    });

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/journeys', journeyRoutes);
    app.use('/api/stops', stopRoutes);
    app.use('/api/attractions', attractionRoutes);
    app.use('/api/transports', transportRoutes);
    app.use('/api/attachments', attachmentRoutes);
    app.use('/api/proxy', proxyRoutes);
    app.use('/api/proxy', proxyRenderRoutes);
    app.use('/api/currency', currencyRoutes);

    // Start periodic currency rates refresh (background) only if explicitly enabled
    // by environment variable ENABLE_RATES_AUTO_REFRESH=1. By default the app will
    // use cached values and only fetch when a requested base is missing or when
    // an admin triggers a manual refresh.
    try {
      if (process.env.ENABLE_RATES_AUTO_REFRESH === '1') {
        // Refresh once per day (24h) for PLN base to match provider daily updates and API limits
        startAutoRefresh({ intervalMs: 24 * 60 * 60 * 1000, bases: ['PLN'] });
        console.log('🕒 Currency auto-refresh started (daily) for PLN');
      } else {
        console.log('🕒 Currency auto-refresh is disabled (ENABLE_RATES_AUTO_REFRESH != 1)');
      }
    } catch (e) {
      console.warn('Failed to start currency auto-refresh:', e);
    }

    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', message: 'Journey Planner API is running' });
    });

    httpServer.listen(PORT, () => {
      // Wyświetl rzeczywiste adresy z ENV zamiast localhost
      const backendUrl = process.env.VITE_API_URL?.replace('/api', '') || 
                         process.env.FRONTEND_URL?.replace(/:\d+$/, `:${PORT}`) ||
                         (process.env.DB_HOST ? `http://${process.env.DB_HOST}:${PORT}` : `http://localhost:${PORT}`);
      
      const apiBase = process.env.VITE_API_URL || 
                      (process.env.DB_HOST ? `http://${process.env.DB_HOST}:${PORT}/api` : `http://localhost:${PORT}/api`);
      
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Backend URL: ${backendUrl}`);
      console.log(`📡 API Base URL: ${apiBase}`);
      console.log(`\n📋 API endpoints:`);
      console.log(`   - GET    ${apiBase}/health`);
      console.log(`   - POST   ${apiBase}/auth/login`);
      console.log(`   - POST   ${apiBase}/auth/register`);
      console.log(`   - GET    ${apiBase}/journeys`);
      console.log(`   - POST   ${apiBase}/journeys`);
      console.log(`\n🔐 Authentication endpoints available at ${apiBase}/auth`);
      console.log(`👤 User endpoints available at ${apiBase}/user`);
      console.log(`👑 Admin endpoints available at ${apiBase}/admin`);
      console.log(`🔌 WebSocket ready for real-time updates`);
      console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(``);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();

export default app;
