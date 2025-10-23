import express from 'express';
import { supabase } from '../db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('vehicles').select('*');
  if (error) return res.status(500).json({ error });
  res.json({ vehicles: data });
});

router.post('/', async (req, res) => {
  const { registration, type, capacity } = req.body;
  const { data, error } = await supabase.from('vehicles').insert([{ registration, type, capacity }]).select().single();
  if (error) return res.status(500).json({ error });
  res.json({ vehicle: data });
});

export default router;
