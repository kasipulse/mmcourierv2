import express from 'express';
import { supabase } from '../db.js';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../cloudinary.js';

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mmcourierv2/collections',
    allowed_formats: ['jpg','png','jpeg']
  }
});
const upload = multer({ storage });

// create temporary collection
router.post('/create', async (req, res) => {
  try {
    const { temp_collection_no, requestor, client, address, contact_person, assigned_driver_id } = req.body;
    const { data, error } = await supabase
      .from('collections')
      .insert([{
        temp_collection_no, requestor, client, address, contact_person, driver_id: assigned_driver_id
      }])
      .select()
      .single();
    if (error) return res.status(500).json({ error });
    res.json({ collection: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// list collections for a driver
router.get('/driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error });
    res.json({ collections: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Induct actual waybill (replace temp no) and optionally upload photo/signature
router.post('/induct/:collectionId', upload.single('photo'), async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { waybill_no, driver_id } = req.body;
    const photo_url = req.file ? req.file.path : null;

    const { data, error } = await supabase
      .from('collections')
      .update({ waybill_no, status: 'Collected', photo_url, driver_id, updated_at: new Date().toISOString() })
      .eq('id', collectionId)
      .select()
      .single();

    if (error) return res.status(500).json({ error });

    // Optional: create a parcel record so it enters normal lifecycle
    if (waybill_no) {
      const existing = await supabase.from('parcels').select('id').eq('waybill', waybill_no).limit(1).maybeSingle();
      if (!existing.data) {
        await supabase.from('parcels').insert([{
          waybill: waybill_no,
          client: data.client || data.requestor,
          address: data.address,
          status: 'At Hub',
          driver_id: driver_id || data.driver_id
        }]);
      }
    }

    res.json({ collection: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
