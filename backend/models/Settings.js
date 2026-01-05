const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, index: true },
  ownerName: { type: String, default: '' },
  shopName: { type: String, default: '' },
  address: { type: String, default: '' },
  contact: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  nearExpiryDays: { type: Number, default: 30 },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'settings' });

module.exports = mongoose.model('Settings', SettingsSchema);
