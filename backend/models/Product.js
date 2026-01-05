const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  invoiceRef: { type: String, default: null },
  batchRef: { type: String, default: null },
  expiryDate: { type: Date, default: null },
  costPrice: { type: Number, default: 0 },
  price: { type: Number, required: true },
  supplier: { type: String, required: true },
  totalQuantity: { type: Number, required: true, default: 0 },
  remainingQuantity: { type: Number, default: function() { return this.totalQuantity || this.stock || 0; } },
  stock: { type: Number, required: true },
  reorderLevel: { type: Number, required: true },
  lowStockThreshold: { type: Number, default: 5 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);
