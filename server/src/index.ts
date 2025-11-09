import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import journeyRoutes from './routes/journeys';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001; // Changed from 5000 to avoid conflict with SmartHome app

// Middleware
app.use(cors());
app.use(express.json());

// Connect to PostgreSQL
connectDB();

// Routes
app.use('/api/journeys', journeyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Journey Planner API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
