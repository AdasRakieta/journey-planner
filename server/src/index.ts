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

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5001;

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors());
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
  console.log(`   - GET    http://localhost:${PORT}/api/journeys`);
  console.log(`   - POST   http://localhost:${PORT}/api/journeys`);
  console.log(`🔌 WebSocket ready for real-time updates`);
  console.log(``);
});

export default app;
