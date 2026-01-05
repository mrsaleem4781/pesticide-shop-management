const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');

// Get invoices
exports.getInvoices = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const search = (req.query.search || '').trim();

    const q = { userId };
    if (search) q.$or = [ { invoiceNumber: new RegExp(search, 'i') }, { customer: new RegExp(search, 'i') } ];

    const total = await Invoice.countDocuments(q);
    const invoices = await Invoice.find(q).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit);
    res.json({ data: invoices, page, limit, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get invoice by id
exports.getInvoiceById = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const inv = await Invoice.findOne({ _id: req.params.id, userId });
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });
    res.json(inv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create invoice from sale
exports.createInvoiceFromSale = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const sale = await Sale.findOne({ _id: req.params.saleId, userId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    if (sale.invoiceId) {
      const existing = await Invoice.findOne({ _id: sale.invoiceId, userId });
      if (existing) return res.json(existing);
    }

    const lastInv = await Invoice.findOne({ userId }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastInv && lastInv.invoiceNumber) {
      const parts = lastInv.invoiceNumber.split('-');
      if (parts.length === 2 && !isNaN(parts[1])) nextNum = parseInt(parts[1]) + 1;
    }
    const invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`;

    const customer = await Customer.findOne({ name: sale.customer, userId });
    const prevCustomerBalance = customer ? (customer.remainingBalance || 0) : 0;

    const pricePerUnit = sale.quantity ? (sale.total / sale.quantity) : sale.total;
    const items = [{ productId: null, product: sale.product, quantity: sale.quantity, price: pricePerUnit, total: sale.total }];
    
    // Apply discount and advance if provided
    const discountType = req.body.discountType || 'none';
    const discountValue = Number(req.body.discountValue) || 0;
    const advancePaid = Math.max(0, Number(req.body.advancePaid) || 0);
    let subtotal = sale.total;
    let total = sale.total;
    if (discountType === 'percent' && discountValue) {
      total = Math.max(0, total - (total * (discountValue / 100)));
    } else if (discountType === 'fixed' && discountValue) {
      total = Math.max(0, total - discountValue);
    }
    const remainingBalance = Math.max(0, total - advancePaid);
    const paymentStatus = remainingBalance === 0 ? 'Paid' : (advancePaid > 0 ? 'Partial' : 'Credit');

    const newInvoice = new Invoice({
      invoiceNumber,
      customer: sale.customer,
      customerId: customer ? customer._id : null,
      items,
      subtotal,
      total,
      advancePaid,
      remainingBalance,
      paymentStatus,
      saleId: sale._id,
      previousCustomerBalance: prevCustomerBalance,
      newCustomerBalance: prevCustomerBalance + remainingBalance,
      userId
    });

    const saved = await newInvoice.save();

    // Link sale
    sale.invoiceId = saved._id;
    await sale.save();

    // Update customer
    if (customer) {
      customer.totalPaid = (customer.totalPaid || 0) + advancePaid;
      customer.remainingBalance = (customer.remainingBalance || 0) + remainingBalance;
      customer.paymentHistory = customer.paymentHistory || [];
      if (advancePaid > 0) customer.paymentHistory.push({ amount: advancePaid, date: new Date(), type: 'payment', method: req.body.paymentMethod || '', reference: req.body.paymentReference || '', invoiceId: saved._id });
      customer.isCredit = (customer.remainingBalance || 0) > 0;
      await customer.save();
    }

    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating invoice from sale', error);
    res.status(500).json({ message: error.message });
  }
};

// Create manual invoice
exports.createInvoice = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const lastInv = await Invoice.findOne({ userId }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastInv && lastInv.invoiceNumber) {
      const parts = lastInv.invoiceNumber.split('-');
      if (parts.length === 2 && !isNaN(parts[1])) nextNum = parseInt(parts[1]) + 1;
    }
    const invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`;

    const invoiceData = { ...req.body, invoiceNumber, userId };
    const invoice = new Invoice(invoiceData);
    const saved = await invoice.save();

    // Update customer balance
    try {
      const customer = await Customer.findOne({ name: saved.customer, userId });
      let prevBalance = 0;
      if (customer) {
        prevBalance = customer.remainingBalance || 0;
        customer.totalPaid = (customer.totalPaid || 0) + (saved.advancePaid || 0);
        customer.remainingBalance = (customer.remainingBalance || 0) + (saved.remainingBalance || 0);
        customer.paymentHistory = customer.paymentHistory || [];
        if (Array.isArray(saved.paymentHistory) && saved.paymentHistory.length) {
          for (const p of saved.paymentHistory) customer.paymentHistory.push({ amount: p.amount, date: p.date, type: 'payment', method: p.method, reference: p.reference, invoiceId: saved._id });
        }
        customer.isCredit = (customer.remainingBalance || 0) > 0;
        await customer.save();
      }

      saved.previousCustomerBalance = prevBalance;
      saved.newCustomerBalance = (prevBalance || 0) + (saved.remainingBalance || 0);
      await saved.save();
    } catch (err) {
      console.error('Customer update after invoice failed', err);
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Pay invoice
exports.payInvoice = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const amount = Math.max(0, Number(req.body.amount) || 0);
    const method = req.body.method || 'Cash';
    const reference = req.body.reference || '';

    const inv = await Invoice.findOne({ _id: req.params.id, userId });
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });

    if (amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    // Update invoice
    inv.advancePaid = (inv.advancePaid || 0) + amount;
    inv.remainingBalance = Math.max(0, (inv.remainingBalance || 0) - amount);
    if (inv.remainingBalance === 0) inv.paymentStatus = 'Paid';
    else inv.paymentStatus = 'Partial';

    inv.paymentHistory = inv.paymentHistory || [];
    inv.paymentHistory.push({ amount, date: new Date(), method, reference });

    await inv.save();

    // Update customer
    try {
      const customer = await Customer.findOne({ name: inv.customer, userId });
      if (customer) {
        customer.totalPaid = (customer.totalPaid || 0) + amount;
        customer.remainingBalance = Math.max(0, (customer.remainingBalance || 0) - amount);
        customer.paymentHistory = customer.paymentHistory || [];
        customer.paymentHistory.push({ amount, date: new Date(), type: 'payment', invoiceId: inv._id, method, reference, note: req.body.note });
        customer.isCredit = (customer.remainingBalance || 0) > 0;
        await customer.save();
      }
    } catch (err) {
      console.error('Customer update after invoice payment failed', err);
    }

    res.json(inv);
  } catch (error) {
    res.status(500).json({ message: 'Payment failed' });
  }
};
