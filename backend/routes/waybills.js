import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

// Get all waybills
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("waybills")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Create new waybill
router.post("/", async (req, res) => {
  const { waybill_number, client_name, sender_name, sender_address, receiver_name, receiver_address, receiver_phone, parcel_count, weight } = req.body;

  const { data, error } = await supabase
    .from("waybills")
    .insert([{ waybill_number, client_name, sender_name, sender_address, receiver_name, receiver_address, receiver_phone, parcel_count, weight }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// Update waybill status or details
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status, ...fields } = req.body;

  const { data, error } = await supabase
    .from("waybills")
    .update({ ...fields, status, updated_at: new Date() })
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

export default router;
