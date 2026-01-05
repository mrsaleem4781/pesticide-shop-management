const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');

exports.getStats = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const totalProducts = await Product.countDocuments({ userId });
    const totalCustomers = await Customer.countDocuments({ userId });
    const totalSales = await Sale.countDocuments({ userId });

    const sales = await Sale.find({ userId });
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    const products = await Product.find({ userId });
    const lowStockProducts = products.filter(p => {
      const remaining = (typeof p.remainingQuantity === 'number') ? p.remainingQuantity : (p.stock || 0);
      return remaining <= (p.lowStockThreshold || 5);
    }).length;

    let nearExpiryDays = 30;
    try {
      const s = await Settings.findOne({ userId }).lean();
      if (s && typeof s.nearExpiryDays === 'number') nearExpiryDays = Math.max(1, s.nearExpiryDays);
    } catch (_) {}
    const now = new Date();
    const cutoff = new Date(now.getTime() + nearExpiryDays * 24 * 60 * 60 * 1000);
    const nearExpiryCount = await Product.countDocuments({ userId, expiryDate: { $exists: true, $ne: null, $lte: cutoff } });

    // --- Chart Data: Sales Last 7 Days ---
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
    }

    const salesChartData = last7Days.map(dateStr => {
      // Simple filtering (ideally do this in DB aggregation for performance)
      const daySales = sales.filter(s => {
        // Assuming s.date is stored as ISO string or similar date-able format
        // If s.date is just "YYYY-MM-DD" string, direct comparison works
        // If it's Date object, need to convert.
        // Based on Sale model, date is String required.
        let saleDateStr = '';
        try {
           saleDateStr = new Date(s.date).toISOString().split('T')[0];
        } catch(e) {}
        return saleDateStr === dateStr;
      });
      const dayRevenue = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
      return { date: dateStr, revenue: dayRevenue };
    });

    // --- Recent Sales ---
    // Get last 5 sales
    const recentSales = await Sale.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      totalProducts,
      totalSales,
      totalCustomers,
      totalRevenue,
      lowStockProducts,
      nearExpiryCount,
      salesChartData,
      recentSales
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));

    // Low Stock
    const products = await Product.find({ userId });
    const lowStockItems = products.filter(p => {
      const remaining = (typeof p.remainingQuantity === 'number') ? p.remainingQuantity : (p.stock || 0);
      return remaining <= (p.lowStockThreshold || 5);
    });
    
    // Manual pagination for filtered array (not ideal for large datasets but works for now)
    const startIndex = (page - 1) * limit;
    const paginatedItems = lowStockItems.slice(startIndex, startIndex + limit);

    res.json({ data: paginatedItems, page, limit, total: lowStockItems.length });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getExpiryAlerts = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    let days = parseInt(req.query.days || '', 10);
    if (!days || isNaN(days)) {
      days = 30;
      try {
        const s = await Settings.findOne({ userId }).lean();
        if (s && typeof s.nearExpiryDays === 'number') days = Math.max(1, s.nearExpiryDays);
      } catch (_) {}
    }
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, parseInt(req.query.limit || '100', 10));

    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const q = { userId, expiryDate: { $exists: true, $ne: null, $lte: cutoff } };
    const total = await Product.countDocuments(q);
    const items = await Product.find(q).sort({ expiryDate: 1 }).skip((page - 1) * limit).limit(limit);

    res.json({ data: items, page, limit, total, cutoff: cutoff.toISOString() });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
