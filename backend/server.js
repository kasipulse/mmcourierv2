import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import collectionsRoutes from './routes/collections.js';
import driversRoutes from './routes/drivers.js';
import vehiclesRoutes from './routes/vehicles.js';

dotenv.config();

const app = express();

// --- CORS ---
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://mmcourier-v2.onrender.com';
app.use(cors({
  origin: [FRONTEND_URL],
  credentials: true
}));

app.use(express.json());

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/vehicles', vehiclesRoutes);

// --- Serve static frontend (optional if backend also serves frontend) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MMCourierV2 backend running on port ${PORT}`));
