const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const fs = require('fs');
const path = require('path');

exports.getSettings = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    let s = await Settings.findOne({ userId });
    if (!s) {
      return res.json({
        userId,
        ownerName: '',
        shopName: 'PestiShop Pro',
        address: '',
        contact: '',
        logoUrl: '/logo.svg',
        nearExpiryDays: 30
      });
    }
    res.json(s);
  } catch (error) {
    console.error('API ERROR GET /api/settings', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const payload = Object.assign({}, req.body, { updatedAt: new Date(), userId });
    const s = await Settings.findOneAndUpdate({ userId }, payload, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json(s);
  } catch (error) {
    console.error('API ERROR PUT /api/settings', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const dataUrl = req.body && req.body.dataUrl;
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Invalid image data' });
    }
    const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i.exec(dataUrl);
    if (!m) return res.status(400).json({ message: 'Unsupported image format' });
    const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
    const base64 = m[2];
    const buf = Buffer.from(base64, 'base64');
    if (!buf || !buf.length) return res.status(400).json({ message: 'Empty image' });

    const userDir = path.join(__dirname, '..', 'uploads', String(userId));
    try { fs.mkdirSync(userDir, { recursive: true }); } catch (_) {}
    const filePath = path.join(userDir, `logo.${ext}`);
    fs.writeFileSync(filePath, buf);

    const host = req.headers.host;
    const url = `${req.protocol}://${host}/uploads/${userId}/logo.${ext}`;

    const s = await Settings.findOneAndUpdate(
      { userId },
      { logoUrl: url, updatedAt: new Date(), userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ url, settings: s });
  } catch (error) {
    console.error('API ERROR POST /api/settings/logo', error);
    res.status(500).json({ message: 'Upload failed' });
  }
};
