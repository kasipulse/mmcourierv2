// routes/pods.js
import express from 'express';
import multer from 'multer';
import streamifier from 'streamifier';
import cloudinaryModule from 'cloudinary';
import vision from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const { v2: cloudinary } = cloudinaryModule;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = express.Router();

// Initialize Google Vision API client for OCR
const visionClient = new vision.ImageAnnotatorClient();

/**
 * Utility: Upload buffer to Cloudinary
 */
const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'mmcourier/pods', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Utility: Detect barcode/waybill text from image using OCR
 */
const extractBarcodeFromImage = async (buffer) => {
  try {
    const [result] = await visionClient.textDetection({ image: { content: buffer } });
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) return null;

    const fullText = detections[0].description.replace(/\s+/g, '');
    // Basic heuristic: find 12–14 digit numeric string (FedEx/waybill style)
    const match = fullText.match(/\b\d{10,14}\b/);
    return match ? match[0] : null;
  } catch (err) {
    console.error('OCR error:', err);
    return null;
  }
};

/**
 * POST /api/pods/batch-upload
 * Allows multiple image uploads — auto detects barcodes and matches to parcels
 */
router.post('/batch-upload', upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];

    for (const file of req.files) {
      const buffer = file.buffer;

      // Step 1: Extract barcode from image via OCR
      const detectedBarcode = await extractBarcodeFromImage(buffer);

      // Step 2: Upload to Cloudinary
      const uploadResult = await streamUpload(buffer);
      const podUrl = uploadResult.secure_url;

      if (detectedBarcode) {
        const { data: parcels, error } = await supabase
          .from('parcels')
          .select('*')
          .eq('waybill_number', detectedBarcode)
          .limit(1);

        if (error) console.error('Supabase select error', error);

        if (parcels && parcels.length > 0) {
          const parcel = parcels[0];
          const { error: updateError } = await supabase
            .from('parcels')
            .update({
              pod_url: podUrl,
              pod_uploaded_at: new Date().toISOString(),
              status: 'POD Received',
            })
            .eq('id', parcel.id);

          if (updateError) console.error('Update error:', updateError);

          results.push({
            filename: file.originalname,
            matched: true,
            waybill: detectedBarcode,
            pod_url: podUrl,
          });
        } else {
          await supabase.from('unmatched_pods').insert([
            {
              barcode: detectedBarcode,
              pod_url: podUrl,
              filename: file.originalname,
              uploaded_at: new Date().toISOString(),
            },
          ]);

          results.push({
            filename: file.originalname,
            matched: false,
            barcode: detectedBarcode,
            pod_url: podUrl,
          });
        }
      } else {
        // No barcode detected at all
        await supabase.from('unmatched_pods').insert([
          {
            barcode: null,
            pod_url: podUrl,
            filename: file.originalname,
            uploaded_at: new Date().toISOString(),
          },
        ]);

        results.push({
          filename: file.originalname,
          matched: false,
          barcode: null,
          pod_url: podUrl,
        });
      }
    }

    res.json({ success: true, count: results.length, results });
  } catch (err) {
    console.error('Batch POD upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
