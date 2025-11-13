// =======================================================
// backend/routes/import.js
// =======================================================

import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Initialize Supabase Client with Service Role Key for secure, privileged writes
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure Multer for temporary file uploads
const upload = multer({ dest: "uploads/" });

// Helper function to read and parse CSV data
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
    { name: "content" }, // Included for parsing, but not inserted in this logic
    { name: "waybill" }, // Mandatory file for parcel creation
    { name: "track" }    // Included for parsing, but not inserted in this logic
]), async (req, res) => {
    let uploadedFiles = [];
    let insertedCount = 0;

    try {
        // --- 1. VALIDATION AND SETUP ---
        // Expecting these UUIDs in the request body from the frontend
        const { company_id, customer_id, user_id } = req.body || {};
        
        if (!req.files?.waybill) {
            return res.status(400).json({ error: "The Waybill file is mandatory for import." });
        }
        
        // Store file paths for cleanup, regardless of success or failure
        uploadedFiles = Object.values(req.files).flat();

        // --- 2. PARSE DATA ---
        const waybillData = await parseCSV(req.files.waybill[0].path);
        // Note: Content and Track data are available but omitted from insert logic for simplicity

        // --- 3. DATA TRANSFORMATION (Mapping to 'parcels' table) ---
        const parcelsToInsert = waybillData.map(w => {
            // Your CSV combines address fields, but your table doesn't have an 'address' column.
            // We use the appropriate destination fields and rely on other tables (if they existed) for full detail.

            return {
                // --- REQUIRED FOREIGN KEYS (Must exist in DB) ---
                company_id: company_id,
                customer_id: customer_id, 
                
                // --- SHIPMENT IDENTIFIERS & LOGISTICS ---
                waybill_number: w.Waybill.trim(),
                sender: w.Sender,
                recipient: w.Receiver,
                origin: w.OrigPlace, 
                destination: w.DestPlace, 
                service_type: w.Service,
                
                // --- WEIGHTS & PIECES (Casting) ---
                pieces: parseInt(w.Pieces || 1),
                actual_mass: parseFloat(w.ActKg || 0),
                charge_mass: parseFloat(w.ChargeMass || 0),
                
                // --- PRICING COLUMNS (Defaulting to 0.00 as CSV lacks this data) ---
                surcharges: 0.00,
                basic: 0.00,
                fuel: 0.00,
                other: 0.00,
                subtotal: 0.00,
                vat: 0.00,
                total: 0.00,

                // --- STATUS & DEFAULTS ---
                status: "Pending", // Initial operational status
            }
        });

        insertedCount = parcelsToInsert.length;

        // --- 4. TRANSACTIONAL INSERTS INTO SUPABASE ---
        
        // a. Insert Parcels (Parent records) and retrieve their new UUIDs
        let { data: insertedParcels, error: parcelsError } = await supabase
            .from("parcels")
            .insert(parcelsToInsert)
            .select("id, waybill_number"); // CRITICAL: Get IDs for 'scans' table FK

        if (parcelsError) throw new Error(`Parcels Insert Failed: ${parcelsError.message}`);
        if (!insertedParcels || insertedParcels.length === 0) throw new Error("No parcels were inserted.");
        
        // b. Prepare Scans data using the new parcel UUIDs
        const scansToInsert = insertedParcels.map(p => {
            // Find the original waybill data to get the origin location for the scan
            const originalWaybill = waybillData.find(w => w.Waybill.trim() === p.waybill_number);

            return {
                parcel_id: p.id,
                company_id: company_id,
                scanned_by_user_id: user_id, // User performing the import (if available)
                scan_type: 'MANIFEST',
                location: originalWaybill ? originalWaybill.OrigPlace : 'DEPOT', 
                notes: `Waybill ${p.waybill_number} Manifested via CSV Import`,
                created_at: new Date().toISOString(),
            };
        });
        
        // c. Insert Scans (History records)
        let { error: scansError } = await supabase.from("scans").insert(scansToInsert);
        if (scansError) throw new Error(`Scans Insert Failed: ${scansError.message}`);

        // --- 5. SUCCESS RESPONSE ---
        res.json({
            success: true,
            inserted_waybills: insertedCount,
            message: `✅ Successfully imported ${insertedCount} waybills and created initial MANIFEST scans.`
        });

    } catch (err) {
        // --- 6. ERROR RESPONSE ---
        console.error("❌ Import error:", err);
        // Send a structured JSON error response to the client
        res.status(500).json({ error: err.message || "Failed to process files" });
        
    } finally {
        // --- 7. CRITICAL: SAFE FILE CLEANUP (Prevents the 'Unexpected end of JSON input' crash) ---
        if (uploadedFiles.length > 0) {
            uploadedFiles.forEach((f) => {
                try {
                    fs.unlinkSync(f.path);
                } catch(e) {
                    // Log cleanup error but DO NOT let it crash the server
                    console.warn(`Could not delete file ${f.path}:`, e.message);
                }
            });
        }
    }
});

export default router;
