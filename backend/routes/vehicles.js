import express from 'express';
import { supabase } from '../db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) return res.status(500).json({ error });
    res.json({ vehicles: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { registration, type, capacity } = req.body;
    const { data, error } = await supabase.from('vehicles').insert([{ registration, type, capacity }]).select().single();
    if (error) return res.status(500).json({ error });
    res.json({ vehicle: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
