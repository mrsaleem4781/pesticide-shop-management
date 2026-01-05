const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  invoiceNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  customer: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      product: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      total: { type: Number, required: true }
    }
  ],
  subtotal: { type: Number, required: true },
  discountType: { type: String, enum: ['percent', 'fixed', 'none'], default: 'none' },
  discountValue: { type: Number, default: 0 },
  total: { type: Number, required: true },
  advancePaid: { type: Number, default: 0 },
  remainingBalance: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['Paid','Partial','Credit'], default: 'Paid' },
  // Payment metadata
  paymentMethod: { type: String, default: '' },
  paymentReference: { type: String, default: '' },
  paymentHistory: { type: Array, default: [] }, // {amount, date, method, reference}
  previousCustomerBalance: { type: Number, default: 0 },
  newCustomerBalance: { type: Number, default: 0 },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  createdAt: { type: Date, default: Date.now }
});

InvoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
