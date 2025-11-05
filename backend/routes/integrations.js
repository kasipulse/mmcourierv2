import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// GET all integrations
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .order('partner_name', { ascending: true });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH update status or last sync
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, last_sync } = req.body;

  const { data, error } = await supabase
    .from('integrations')
    .update({
      status,
      last_sync: last_sync || new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
