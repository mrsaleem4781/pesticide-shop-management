const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');

// Get all sales
exports.getSales = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;
    
    let query = { userId };
    if (search) {
      query.$or = [
          { customer: { $regex: search, $options: 'i' } },
          { product: { $regex: search, $options: 'i' } }
        ];
    }
    
    const [sales, total] = await Promise.all([
      Sale.find(query)
        .populate('invoiceId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sale.countDocuments(query)
    ]);

    // Check for missing invoiceId and try to backfill
    const missingSaleIds = sales.filter(s => !s.invoiceId).map(s => s._id);

    let invoiceBySaleId = {};
    if (missingSaleIds.length) {
      const invs = await Invoice.find({ saleId: { $in: missingSaleIds } }).sort({ createdAt: -1 }).lean();
      for (const inv of invs) {
        const sid = inv.saleId ? String(inv.saleId) : null;
        if (sid && !invoiceBySaleId[sid]) invoiceBySaleId[sid] = inv;
      }

      const toBackfill = sales
        .filter(s => !s.invoiceId && invoiceBySaleId[String(s._id)])
        .map(s => ({ saleId: s._id, invoiceId: invoiceBySaleId[String(s._id)]._id }));

      if (toBackfill.length) {
        try {
          await Promise.all(toBackfill.map(x => Sale.findByIdAndUpdate(x.saleId, { invoiceId: x.invoiceId })));
        } catch (e) {
          console.error('Backfill sale.invoiceId failed', e);
        }
      }
    }

    const normalizedSales = sales.map(s => {
      const inv = s.invoiceId || invoiceBySaleId[String(s._id)] || null;
      return { ...s, invoice: inv };
    });

    res.json({ data: normalizedSales, total, page, limit });
  } catch (error) {
    console.error('API ERROR GET /api/sales', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Add new sale
exports.createSale = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { product: productName, quantity, total } = req.body;

    // Find product
    const product = await Product.findOne({ name: productName, userId });
    if (product) {
      const available = (typeof product.remainingQuantity === 'number') ? product.remainingQuantity : (product.stock || 0);
      if (available < quantity) return res.status(400).json({ message: 'Insufficient stock for product' });

      // Deduct quantities
      product.remainingQuantity = Math.max(0, available - quantity);
      if (typeof product.stock === 'number') product.stock = Math.max(0, (product.stock || 0) - quantity);
      await product.save();
    }

    const sale = new Sale({ ...req.body, userId });
    const savedSale = await sale.save();

    // Update customer total purchases
    const customer = await Customer.findOne({ name: req.body.customer, userId });
    if (customer) {
      customer.totalPurchases += total || 0;
      await customer.save();
    }

    // Auto-create invoice if requested
    if (req.body.createInvoice) {
      try {
        const discountType = req.body.discountType || 'none';
        const discountValue = Number(req.body.discountValue) || 0;
        const advancePaid = Math.max(0, Number(req.body.advancePaid) || 0);

        const pricePerUnit = savedSale.quantity ? ((savedSale.total || 0) / savedSale.quantity) : (savedSale.total || 0);
        const items = [{ productId: null, product: savedSale.product, quantity: savedSale.quantity, price: pricePerUnit, total: savedSale.total }];
        const subtotal = savedSale.total || 0;

        let totalInvoice = subtotal;
        if (discountType === 'percent' && discountValue) {
          totalInvoice = totalInvoice - (totalInvoice * (discountValue / 100));
        } else if (discountType === 'fixed' && discountValue) {
          totalInvoice = totalInvoice - discountValue;
        }
        totalInvoice = Math.max(0, totalInvoice);

        const remainingBalance = Math.max(0, totalInvoice - advancePaid);
        const paymentStatus = remainingBalance === 0 ? 'Paid' : (advancePaid > 0 ? 'Partial' : 'Credit');

        const lastInv = await Invoice.findOne({ userId }).sort({ createdAt: -1 });
        let nextNum = 1;
        if (lastInv && lastInv.invoiceNumber) {
          const parts = lastInv.invoiceNumber.split('-');
          if (parts.length === 2 && !isNaN(parts[1])) nextNum = parseInt(parts[1]) + 1;
        }
        const invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`;

        const newInvoice = new Invoice({
          invoiceNumber,
          customer: savedSale.customer,
          customerId: customer ? customer._id : null,
          items,
          subtotal,
          discountType,
          discountValue,
          total: totalInvoice,
          advancePaid,
          remainingBalance,
          paymentStatus,
          saleId: savedSale._id,
          userId
        });

        const savedInvoice = await newInvoice.save();
        savedSale.invoiceId = savedInvoice._id;
        await savedSale.save();

        if (customer) {
          customer.totalPaid = (customer.totalPaid || 0) + advancePaid;
          customer.remainingBalance = (customer.remainingBalance || 0) + remainingBalance;
          customer.isCredit = customer.remainingBalance > 0;
          await customer.save();
        }
      } catch (err) {
        console.error('Auto-invoice creation failed', err);
      }
    }

    res.status(201).json(savedSale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update sale
exports.updateSale = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const updatedSale = await Sale.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!updatedSale) return res.status(404).json({ message: 'Sale not found' });
    res.json(updatedSale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete sale
exports.deleteSale = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const deleted = await Sale.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ message: 'Sale not found' });
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
