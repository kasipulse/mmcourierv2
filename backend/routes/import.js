// =======================================================
// backend/routes/import.js (Hardcoded Fix for Server Startup)
// =======================================================

// WARNING: This file contains hardcoded, sensitive keys and MUST be reverted 
// to use process.env before deploying to ANY public environment.

import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// --- HARDCODED SUPABASE CREDENTIALS (Temporary FIX) ---
const SUPABASE_URL = "https://lavqgvnjdjfywcjztame.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdnFndm5qZGpmeXdjanp0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIyOTQ4NiwiZXhwIjoyMDc2ODA1NDg2fQ.LBU2sJP8CdZQ8dhhBJP0NpGdH9HBvl16SaxsVLfziwg";

// Supabase setup: Using the Service Role Key for privileged writes
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    let uploadedFiles = [];
    let insertedCount = 0;
    
    // --- 0. FILE & BODY SETUP ---
    const waybillFile = req.files?.waybill?.[0];
    const { company_id, customer_id, user_id } = req.body || {};
    
    uploadedFiles = Object.values(req.files || {}).flat();

    try {
        // --- 1. CRITICAL SYNCHRONOUS VALIDATION ---
        if (!waybillFile || !waybillFile.path) {
            return res.status(400).json({ error: "Waybill file missing or path is inaccessible." });
        }
        
        if (!company_id || !customer_id) {
            return res.status(400).json({ 
                error: "Missing mandatory Company ID or Customer ID in request body." 
            });
        }
        
        // --- 2. PARSE DATA ---
        let waybillData;
        try {
            waybillData = await parseCSV(waybillFile.path);
        } catch (e) {
             throw new Error(`CSV Parsing failed: ${e.message.substring(0, 100)}...`);
        }

        // --- 3. DATA TRANSFORMATION & DATA SANITIZATION ---
        const parcelsToInsert = waybillData.map(w => {
            const waybillNumber = w.Waybill?.trim();
            if (!waybillNumber) {
                throw new Error("Invalid row detected: Waybill number is missing or empty.");
            }

            return {
                // --- REQUIRED FOREIGN KEYS ---
                company_id: company_id,
                customer_id: customer_id, 
                
                // --- SHIPMENT IDENTIFIERS & LOGISTICS ---
                waybill_number: waybillNumber,
                sender: w.Sender,
                recipient: w.Receiver,
                origin: w.OrigPlace, 
                destination: w.DestPlace, 
                service_type: w.Service,
                
                // --- WEIGHTS & PIECES (Casting) ---
                pieces: parseInt(w.Pieces || 1),
                actual_mass: parseFloat(w.ActKg || 0),
                charge_mass: parseFloat(w.ChargeMass || 0),
                
                // --- PRICING COLUMNS (Defaults) ---
                surcharges: 0.00, basic: 0.00, fuel: 0.00, other: 0.00,
                subtotal: 0.00, vat: 0.00, total: 0.00,

                // --- STATUS & DEFAULTS ---
                status: "Pending",
            }
        });

        insertedCount = parcelsToInsert.length;
        if (insertedCount === 0) {
             return res.status(400).json({ error: "No valid parcel records found after processing the CSV." });
        }
        
        // --- 4. TRANSACTIONAL INSERTS INTO SUPABASE ---
        
        // a. Insert Parcels (Parent records)
        let { data: insertedParcels, error: parcelsError } = await supabase
            .from("parcels")
            .insert(parcelsToInsert)
            .select("id, waybill_number");

        if (parcelsError) throw new Error(`Parcels Insert Failed: ${parcelsError.message}`);
        
        // b. Prepare Scans data using the new parcel UUIDs
        const scansToInsert = insertedParcels.map(p => {
            const originalWaybill = waybillData.find(w => w.Waybill.trim() === p.waybill_number);
            
            return {
                parcel_id: p.id,
                company_id: company_id,
                scanned_by_user_id: user_id, 
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
        res.status(500).json({ error: err.message || "An unexpected server error occurred." });
        
    } finally {
        // --- 7. SAFE FILE CLEANUP ---
        if (uploadedFiles.length > 0) {
            uploadedFiles.forEach((f) => {
                try {
                    if (fs.existsSync(f.path)) {
                        fs.unlinkSync(f.path);
                    }
                } catch(e) {
                    console.warn(`Could not delete file ${f.path}:`, e.message);
                }
            });
        }
    }
});

export default router;
