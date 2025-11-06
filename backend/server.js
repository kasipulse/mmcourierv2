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
import importRoutes from './routes/import.js';  // <--- make sure this is imported

dotenv.config();

const app = express();

// --- CORS ---
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://mmcourier-v2.onrender.com';
app.use(cors({ origin: [FRONTEND_URL], credentials: true }));

app.use(express.json());

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/import', importRoutes); // <--- now it works because importRoutes exists

// --- Serve frontend ---
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
