// backend/routes/parcels.js
import express from "express";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const upload = multer({ dest: "tmp/" });

// --- 1️⃣ Import Manifest CSV ---
router.post("/import-manifest", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        const { error } = await supabase.from("parcels").insert(results);
        fs.unlinkSync(req.file.path);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, inserted: results.length });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    });
});

// --- 2️⃣ Import Scan CSV ---
router.post("/import-scan", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        for (const row of results) {
          const { error } = await supabase
            .from("parcels")
            .update({ scan_status: row.scan_status, last_updated: new Date() })
            .eq("tracking_number", row.tracking_number);
          if (error) return res.status(500).json({ error: error.message });
        }
        fs.unlinkSync(req.file.path);
        res.json({ success: true, updated: results.length });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    });
});

export default router;
