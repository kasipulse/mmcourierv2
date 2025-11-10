// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- IMPORT ROUTES ---
import authRoutes from './routes/auth.js';
import collectionsRoutes from './routes/collections.js';
import driversRoutes from './routes/drivers.js';
import vehiclesRoutes from './routes/vehicles.js';
import customersRoutes from './routes/customers.js';
import invoicesRoutes from './routes/invoices.js';
import importRoutes from './routes/import.js';

dotenv.config();

const app = express();

// --- CORS ---
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.mmcourier.co.za';
app.use(
  cors({
    origin: [FRONTEND_URL, 'https://mmcourierv2.onrender.com'],
    credentials: true,
  })
);

app.use(express.json());

// ✅ --- API ROUTES FIRST ---
app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/import', importRoutes);

// --- BASE HEALTH ROUTE ---
app.get('/api', (req, res) => {
  res.send('✅ MMCourierV2 API is running');
});

// ✅ --- STATIC FRONTEND LAST ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '..', 'public');

app.use(express.static(publicPath));

// Only serve index.html for non-API requests
app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ MMCourierV2 backend running on port ${PORT}`)
);
