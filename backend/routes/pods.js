// routes/pods.js
import express from 'express';
import multer from 'multer';
import streamifier from 'streamifier';
import cloudinaryModule from 'cloudinary';
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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

const router = express.Router();

/**
 * POST /api/pods/upload
 * body: multipart/form-data { file: image, barcode: string }
 *
 * Response:
 * { success: true, matched: true|false, parcel: {...} | null, pod_url }
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });

    const barcode = (req.body.barcode || '').trim();
    if (!barcode) return res.status(400).json({ error: 'barcode required' });

    // Upload image buffer to Cloudinary via stream
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

    const uploadResult = await streamUpload(req.file.buffer);
    const podUrl = uploadResult.secure_url;

    // Try to find parcel by waybill (adjust column name if different)
    // Example assumes parcels table with column waybill_number
    const { data: parcelsFound, error: selectError } = await supabase
      .from('parcels')
      .select('*')
      .eq('waybill_number', barcode)
      .limit(1);

    if (selectError) {
      console.error('Supabase select error', selectError);
      // still record unmatched for reconciliation
    }

    if (parcelsFound && parcelsFound.length > 0) {
      const parcel = parcelsFound[0];

      // update parcel with pod info
      const updates = {
        pod_url: podUrl,
        pod_uploaded_at: new Date().toISOString(),
        pod_confirmed_by: req.body.confirmed_by || null, // optional
        status: req.body.status || 'POD Received',
      };

      const { data: updated, error: updateError } = await supabase
        .from('parcels')
        .update(updates)
        .eq('id', parcel.id)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase update error', updateError);
        return res.status(500).json({ error: 'Failed to update parcel' });
      }

      return res.json({
        success: true,
        matched: true,
        parcel: updated,
        pod_url: podUrl,
      });
    } else {
      // waybill not found - store in `unmatched_pods` table for later manual reconciliation
      const { error: insertError } = await supabase
        .from('unmatched_pods')
        .insert([{
          barcode,
          pod_url: podUrl,
          filename: req.file.originalname,
          uploaded_at: new Date().toISOString(),
        }]);

      if (insertError) {
        console.error('Failed to insert unmatched_pod', insertError);
      }

      return res.json({
        success: true,
        matched: false,
        parcel: null,
        pod_url: podUrl,
      });
    }
  } catch (err) {
    console.error('POD upload error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
