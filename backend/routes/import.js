// =======================================================
// backend/routes/import.js
// Stable, complete, syntax-safe import handler
// =======================================================

import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// --- HARDCODED SUPABASE CREDS (TEMP) ---
const SUPABASE_URL = "https://lavqgvnjdjfywcjztame.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdnFndm5qZGpmeXdjanp0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIyOTQ4NiwiZXhwIjoyMDc2ODA1NDg2fQ.LBU2sJP8CdZQ8dhhBJP0NpGdH9HBvl16SaxsVLfziwg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Multer upload setup
const upload = multer({ dest: "uploads/" });

// CSV parser helper
const parseCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
};

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
      if (!waybillFile) {
        return res
          .status(400)
          .json({ error: "Waybill CSV file missing." });
      }

      if (!company_id || !customer_id) {
        return res.status(400).json({
          error: "Missing required company_id or customer_id.",
        });
      }

      // Parse CSV
      const waybillData = await parseCSV(waybillFile.path);

      if (waybillData.length === 0) {
        return res.status(400).json({
          error: "Waybill CSV is empty or unreadable.",
        });
      }

      // Build parcel rows
      const parcelsToInsert = waybillData.map((w, index) => {
        const waybill =
          w.Waybill ||
          w.waybill ||
          w.WAYBILL ||
          w.tracking_number ||
          null;

        if (!waybill) {
          throw new Error(
            `Waybill missing on row ${index + 1}.`
          );
        }

        return {
          waybill: waybill.trim(),
          recipient: w.Recipient || w.recipient || null,
          address: w.Address || w.address || null,
          suburb: w.Suburb || w.suburb || null,
          city: w.City || w.city || null,
          company_id,
          customer_id,
          user_id: user_id || null,
          imported_at: new Date().toISOString(),
        };
      });

      // Insert into Supabase
      const { data, error } = await supabase
        .from("parcels")
        .insert(parcelsToInsert);

      if (error) {
        return res.status(500).json({
          error: error.message,
        });
      }

      return res.json({
        success: true,
        message: "Import complete",
        inserted: parcelsToInsert.length,
      });
    } catch (err) {
      return res.status(500).json({
        error: err.message || "Unknown server error",
      });
    } finally {
      // Cleanup uploads
      uploadedFiles.forEach((f) => {
        if (f?.path && fs.existsSync(f.path)) {
          fs.unlinkSync(f.path);
        }
      });
    }
  }
);

export default router;
