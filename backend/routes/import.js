// backend/routes/import.js
import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Multer setup for temp uploads
const upload = multer({ dest: "uploads/" });

// POST /api/import/upload
router.post("/upload", upload.fields([
  { name: "content" }, 
  { name: "waybill" }, 
  { name: "track" }
]), async (req, res) => {
  try {
    const { company_id } = req.body || {};
    if (!req.files?.content || !req.files?.waybill || !req.files?.track) {
      return res.status(400).json({ error: "Please upload all three files (content, waybill, track)" });
    }

    // Helper to parse CSV
    const parseCSV = (filePath) => new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", () => resolve(results))
        .on("error", reject);
    });

    const contentData = await parseCSV(req.files.content[0].path);
    const waybillData = await parseCSV(req.files.waybill[0].path);
    const trackData = await parseCSV(req.files.track[0].path);

    // Merge by Waybill
    const parcels = waybillData.map((w) => {
      const content = contentData.find((c) => c.Waybill === w.Waybill);
      const tracks = trackData.filter((t) => t.Waybill === w.Waybill);
      return {
        waybill: w.Waybill || "",
        service: w.Service || "",
        sender: w.Sender || "",
        receiver: w.Receiver || "",
        origin: w.OrigPlace || "",
        destination: w.DestPlace || "",
        pieces: parseInt(w.Pieces || 0),
        actmass: parseFloat(content?.ActMass || 0),
        tracking_numbers: tracks.map((t) => t.TrackNo),
        status: "RECEIVED",
        company_id: company_id || null,
        created_at: new Date().toISOString(),
      };
    });

    // Insert into Supabase
    const { data, error } = await supabase.from("parcels").insert(parcels).select("*");
    if (error) throw error;

    // Cleanup temp files
    Object.values(req.files).flat().forEach((f) => fs.unlinkSync(f.path));

    res.json({
      success: true,
      inserted: parcels.length,
      insertedData: data || parcels, // send inserted rows back
    });

  } catch (err) {
    console.error("❌ Import error:", err);
    res.status(500).json({ error: err.message || "Failed to process files" });
  }
});

export default router;
