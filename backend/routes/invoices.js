import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('invoices').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
