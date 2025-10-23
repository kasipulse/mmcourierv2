import express from 'express';
import { supabase } from '../db.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Create user (admin or driver) - call this from admin or seed script
router.post('/create-user', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login (driver or admin)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (error) return res.status(500).json({ error });
    if (!data) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, data.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // Return user info to frontend (no session token used here - frontend stores user)
    res.json({ user: { id: data.id, email: data.email, role: data.role, name: data.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
