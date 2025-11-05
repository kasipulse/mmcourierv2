import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
