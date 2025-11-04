// routes/pods.js
import express from 'express';
import multer from 'multer';
import streamifier from 'streamifier';
import { v2 as cloudinary } from 'cloudinary';
import vision from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// 🔹 Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 🔹 Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔹 Initialize Google Vision client from env var
let visionClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    visionClient = new vision.ImageAnnotatorClient({ credentials: creds });
    console.log("✅ Google Vision client initialized");
  } catch (err) {
    console.error("❌ Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", err.message);
  }
} else {
  console.warn("⚠️ GOOGLE_APPLICATION_CREDENTIALS_JSON not found. OCR disabled.");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const router = express.Router();

/**
 * POST /api/pods/upload
 * Upload a scanned POD image.
 * - Automatically detects barcode/waybill using Google Vision
 * - Matches parcel in Supabase
 * - Updates parcel or stores unmatched POD
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // 🔹 1. OCR scan for barcode (or use provided one)
    let barcode = (req.body.barcode || '').trim();
    if (!barcode && visionClient) {
      const [result] = await visionClient.textDetection(req.file.buffer);
      const detections = result.textAnnotations;
      if (detections && detections.length > 0) {
        const text = detections[0].description;
        const match = text.match(/\b\d{10,15}\b/); // Match 10–15 digit number
        if (match) barcode = match[0];
      }
    }

    if (!barcode) {
      return res.status(400).json({ error: 'No barcode detected in image' });
    }

    // 🔹 2. Upload image to Cloudinary
    const uploadToCloudinary = () => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'mmcourier/pods', resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const cloudRes = await uploadToCloudinary();
    const podUrl = cloudRes.secure_url;

    // 🔹 3. Try find parcel by barcode/waybill
    const { data: parcels, error: parcelErr } = await supabase
      .from('parcels')
      .select('*')
      .eq('waybill_number', barcode)
      .limit(1);

    if (parcelErr) {
      console.error('Supabase select error:', parcelErr);
      return res.status(500).json({ error: 'Database error' });
    }

    if (parcels && parcels.length > 0) {
      const parcel = parcels[0];

      const updates = {
        pod_url: podUrl,
        pod_uploaded_at: new Date().toISOString(),
        status: 'POD Received',
      };

      const { data: updated, error: updateErr } = await supabase
        .from('parcels')
        .update(updates)
        .eq('id', parcel.id)
        .select()
        .single();

      if (updateErr) {
        console.error('Supabase update error:', updateErr);
        return res.status(500).json({ error: 'Failed to update parcel' });
      }

      return res.json({
        success: true,
        matched: true,
        barcode,
        parcel: updated,
        pod_url: podUrl,
      });
    } else {
      // 🔹 4. Save to unmatched_pods for manual review
      await supabase.from('unmatched_pods').insert([
        {
          barcode,
          pod_url: podUrl,
          uploaded_at: new Date().toISOString(),
          filename: req.file.originalname,
        },
      ]);

      return res.json({
        success: true,
        matched: false,
        barcode,
        message: 'Barcode not matched. Saved to unmatched_pods.',
        pod_url: podUrl,
      });
    }
  } catch (err) {
    console.error('POD upload error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
