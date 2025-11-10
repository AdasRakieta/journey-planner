import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db';
import journeyRoutes from './routes/journeys';
import stopRoutes from './routes/stops';
import attractionRoutes from './routes/attractions';
import transportRoutes from './routes/transports';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';

dotenv.config();

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

// Connect to PostgreSQL
connectDB();

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Journey Planner API is running' });
});

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   - GET    http://localhost:${PORT}/api/health`);
  console.log(`   - POST   http://localhost:${PORT}/api/auth/login`);
  console.log(`   - POST   http://localhost:${PORT}/api/auth/register`);
  console.log(`   - GET    http://localhost:${PORT}/api/journeys`);
  console.log(`   - POST   http://localhost:${PORT}/api/journeys`);
  console.log(`🔐 Authentication endpoints available at /api/auth`);
  console.log(`👤 User endpoints available at /api/user`);
  console.log(`👑 Admin endpoints available at /api/admin`);
  console.log(`🔌 WebSocket ready for real-time updates`);
  console.log(``);
});

export default app;
