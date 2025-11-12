// backend/routes/import.js
import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Supabase setup: Using the Service Role Key for privileged writes
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Multer setup for temp uploads
const upload = multer({ dest: "uploads/" });

// Helper to parse CSV data from a file path
const parseCSV = (filePath) => new Promise((resolve, reject) => {
  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => results.push(row))
    .on("end", () => resolve(results))
    .on("error", reject);
});


// POST /api/import/upload
router.post("/upload", upload.fields([
  { name: "content" }, 
  { name: "waybill" }, 
  { name: "track" }
]), async (req, res) => {
  let uploadedFiles = []; // Array to store file objects for guaranteed cleanup
  let insertedCount = 0;

  try {
    // 1. VALIDATION AND FILE PATH STORAGE
    // The frontend must provide company_id and customer_id (the client you are importing for)
    const { company_id, customer_id, user_id } = req.body || {};
    if (!req.files?.waybill) {
      return res.status(400).json({ error: "The Waybill file is mandatory for import." });
    }
    // NOTE: We use waybillData for parcels/scans. The content/track files are available 
    // in req.files but not required for this specific insertion flow.

    uploadedFiles = Object.values(req.files).flat();

    // 2. PARSE CSV DATA
    const waybillData = await parseCSV(req.files.waybill[0].path);

    // 3. DATA TRANSFORMATION (Mapping Waybill CSV to 'parcels' table)
    const parcelsToInsert = waybillData.map(w => {
        // Concatenate address fields from Waybill.csv
        const fullRecipientAddress = `${w.DestAdd1 || ''} ${w.DestAdd2 || ''} ${w.DestAdd3 || ''} ${w.DestAdd4 || ''}`.replace(/\s+/g, ' ').trim();
        
        // Use the content mass if available, otherwise default to Waybill's ActKg
        const matchingContent = req.files.content ? contentData.find(c => c.Waybill.trim() === w.Waybill.trim()) : null;

        return {
            company_id: company_id,
            customer_id: customer_id, 
            waybill_number: w.Waybill.trim(),
            sender: w.Sender,
            recipient: w.Receiver,
            origin: w.OrigPlace, // Mapping to your schema's 'origin'
            destination: w.DestPlace, // Mapping to your schema's 'destination'
            address: fullRecipientAddress || null, // Mapping to your schema's 'address'
            service_type: w.Service,
            pieces: parseInt(w.Pieces || 1),
            actual_mass: parseFloat(w.ActKg || matchingContent?.ActMass || 0), // Use ActKg from waybill
            charge_mass: parseFloat(w.ChargeMass || 0),
            status: "Pending", // Initial status for your operational flow
        }
    });

    insertedCount = parcelsToInsert.length;

    // 4. TRANSACTIONAL INSERTS INTO SUPABASE 
    
    // a. Insert Parcels (Parent records) - Must happen first
    let { data: insertedParcels, error: parcelsError } = await supabase
      .from("parcels")
      .insert(parcelsToInsert)
      .select("id, waybill_number"); // CRITICAL: Retrieve the UUIDs for Scans FK

    if (parcelsError) throw new Error(`Parcels Insert Failed: ${parcelsError.message}`);
    if (!insertedParcels || insertedParcels.length === 0) throw new Error("No parcels were inserted.");
    
    // b. Prepare Scans data using the new parcel UUIDs
    const scansToInsert = insertedParcels.map(p => {
      // Find the original waybill data for location
      const originalWaybill = waybillData.find(w => w.Waybill.trim() === p.waybill_number);

      return {
        parcel_id: p.id,
        company_id: company_id,
        scanned_by: user_id, // User performing the import
        scan_type: 'MANIFEST',
        location: originalWaybill ? originalWaybill.OrigPlace : 'DEPOT', 
        notes: "Bulk Manifested via CSV Import",
        created_at: new Date().toISOString(),
      };
    });
    
    // c. Insert Scans (History records)
    let { error: scansError } = await supabase.from("scans").insert(scansToInsert);
    if (scansError) throw new Error(`Scans Insert Failed: ${scansError.message}`);

    // 5. SUCCESS RESPONSE
    res.json({
      success: true,
      inserted_waybills: insertedCount,
      message: `✅ Successfully imported ${insertedCount} waybills and created initial MANIFEST scans.`
    });

  } catch (err) {
    // 6. ERROR RESPONSE
    console.error("❌ Import error:", err);
    res.status(500).json({ error: err.message || "Failed to process files" });
    
  } finally {
    // 7. CRITICAL: SAFE CLEANUP (Fix for the original crash)
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach((f) => {
        try {
          fs.unlinkSync(f.path);
        } catch(e) {
          console.warn(`Could not delete file ${f.path}:`, e.message);
        }
      });
    }
  }
});

export default router;
