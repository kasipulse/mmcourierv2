// routes/parcels.js
import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import csv from 'csv-parser';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const router = express.Router();
const upload = multer({ dest: 'tmp/' });

// 1️⃣ Import Manifest CSV → inserts parcels
router.post('/import-manifest', upload.single('file'), async (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // insert into parcels table
      const { error } = await supabase.from('parcels').insert(results);
      fs.unlinkSync(req.file.path); // clean temp file
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, inserted: results.length });
    });
});

// 2️⃣ Import Scan CSV → updates parcels
router.post('/import-scan', upload.single('file'), async (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const row of results) {
        const { error } = await supabase.from('parcels')
          .update({ scan_status: row.scan_status, last_updated: new Date() })
          .eq('tracking_number', row.tracking_number);
        if (error) return res.status(500).json({ error: error.message });
      }
      fs.unlinkSync(req.file.path);
      res.json({ success: true, updated: results.length });
    });
});

export default router;
