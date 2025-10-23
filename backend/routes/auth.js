import express from 'express';
import { supabase } from '../db.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Admin creates a user (for bootstrap)
router.post('/create-user', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([{ email, password_hash: hash, name, role }])
    .select()
    .single();

  if (error) return res.status(500).json({ error });
  res.json({ user: data });
});

// Driver or admin login - simple: validate credentials against users table
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1)
    .single();

  if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, data.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  // return basic user info (frontend should get session)
  res.json({ user: { id: data.id, email: data.email, role: data.role, name: data.name } });
});

export default router;
