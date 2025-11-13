// WARNING: This file contains hardcoded, sensitive keys and should be reverted
// to use process.env before deploying to ANY public environment.

import express from "express";
import { createClient } from "@supabase/supabase-js";

// --- HARDCODED SUPABASE CREDENTIALS (Temporary FIX) ---
const SUPABASE_URL = "https://lavqgvnjdjfywcjztame.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdnFndm5qZGpmeXdjanp0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIyOTQ4NiwiZXhwIjoyMDc2ODA1NDg2fQ.LBU2sJP8CdZQ8dhhBJP0NpGdH9HBvl16SaxsVLfziwg";

const router = express.Router();
// Supabase client initialized with hardcoded values
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ✅ Get all customers
router.get("/", async (req, res) => {
  const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ✅ Add a customer
router.post("/", async (req, res) => {
  const { name, email, phone, address } = req.body;
  const { error } = await supabase.from("customers").insert([{ name, email, phone, address }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
