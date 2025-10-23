import express from 'express';
import { supabase } from '../db.js';
const router = express.Router();

// list drivers
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('drivers').select('*');
  if (error) return res.status(500).json({ error });
  res.json({ drivers: data });
});

// create driver
router.post('/', async (req, res) => {
  const { name, phone, email, user_id, vehicle_id, route } = req.body;
  const { data, error } = await supabase.from('drivers').insert([{ name, phone, email, user_id, vehicle_id, route }]).select().single();
  if (error) return res.status(500).json({ error });
  res.json({ driver: data });
});

export default router;
