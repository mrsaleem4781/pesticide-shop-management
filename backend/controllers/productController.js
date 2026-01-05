const mongoose = require('mongoose');
const Product = require('../models/Product');

// Get all products (supports pagination & filters)
exports.getProducts = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10)); // cap at 100
    const search = (req.query.search || '').trim();
    const category = req.query.category;
    const stock = req.query.stock; // 'all' | 'in' | 'low'

    const q = {};
    if (search) {
      q.$or = [
        { name: new RegExp(search, 'i') },
        { supplier: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
        { invoiceRef: new RegExp(search, 'i') }
      ];
    }

    if (category) q.category = category;
    if (stock === 'low') q.$expr = { $lte: ["$remainingQuantity", "$reorderLevel"] };
    if (stock === 'in') q.remainingQuantity = { $gt: 0 };

    q.userId = userId;
    const total = await Product.countDocuments(q);
    const products = await Product.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);

    res.json({ data: products, page, limit, total });
  } catch (error) {
    console.error('API ERROR GET /api/products', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Add new product
exports.createProduct = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const data = Object.assign({}, req.body);
    if (typeof data.totalQuantity === 'undefined') data.totalQuantity = (typeof data.stock === 'number' ? data.stock : 0);
    if (typeof data.remainingQuantity === 'undefined') data.remainingQuantity = data.totalQuantity;

    const product = new Product({ ...data, userId });
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const updatedProduct = await Product.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const deleted = await Product.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Migration
exports.migrateRemainingQuantity = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const products = await Product.find({ userId });
    let updated = 0;
    for (const p of products) {
      const total = (typeof p.totalQuantity === 'number') ? p.totalQuantity : ((typeof p.stock === 'number') ? p.stock : 0);
      const desiredRemaining = (typeof p.remainingQuantity === 'number') ? p.remainingQuantity : undefined;

      if (typeof p.remainingQuantity === 'undefined' || p.remainingQuantity === null) {
        p.remainingQuantity = total;
        if (typeof p.totalQuantity === 'undefined') p.totalQuantity = total;
        await p.save();
        updated++;
      }
    }
    res.json({ message: `Migrated ${updated} products`, totalProcessed: products.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
