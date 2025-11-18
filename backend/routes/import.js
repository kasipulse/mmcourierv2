// =======================================================
// backend/routes/import.js
// Fully fixed & safe JSON responses
// =======================================================

import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// --- TEMPORARY HARDCODED SUPABASE CREDENTIALS ---
const SUPABASE_URL = "https://lavqgvnjdjfywcjztame.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdnFndm5qZGpmeXdjanp0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIyOTQ4NiwiZXhwIjoyMDc2ODA1NDg2fQ.LBU2sJP8CdZQ8dhhBJP0NpGdH9HBvl16SaxsVLfziwg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Multer upload setup
const upload = multer({ dest: "uploads/" });

// Parse CSV helper
const parseCSV = (filePath) =>
  new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });

// =======================================================
// POST /api/import/upload
// =======================================================

router.post(
  "/upload",
  upload.fields([
    { name: "content" },
    { name: "waybill" },
    { name: "track" },
  ]),
  async (req, res) => {
    let uploadedFiles = [];

    try {
      const waybillFile = req.files?.waybill?.[0];
      const { company_id, customer_id, user_id } = req.body;

      uploadedFiles = Object.values(req.files || {}).flat();

      // Required validation
      if (!waybillFile)
        return res
          .status(400)
          .json({ error: "Waybill CSV file missing." });

      if (!company_id || !customer_id) {
        return res.status(400).json({
          error: "Missing required company_id or customer_id.",
        });
      }

      // Parse CSV
      const waybillData = await parseCSV(waybillFile.path);

      if (waybillData.length === 0)
        return res
          .status(400)
          .json({ error: "Waybill CSV is empty or unreadable." });

      // Build parcel rows
      const parcelsToInsert = waybillData.map((w) => {
        const waybill = w.Waybill?.trim();

        if (!waybill) {
          throw new Error("Waybill miss
