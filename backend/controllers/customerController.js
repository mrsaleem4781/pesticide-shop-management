const mongoose = require('mongoose');
const Customer = require('../models/Customer');

// Get all customers
exports.getCustomers = async (req, res) => {
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
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } }
        ];
    }
    
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(query)
    ]);
    
    res.json({ data: customers, total, page, limit });
  } catch (error) {
    console.error('API ERROR GET /api/customers', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Add new customer
exports.createCustomer = async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const customer = new Customer({ ...req.body, userId });
  try {
    const savedCustomer = await customer.save();
    res.status(201).json(savedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update Customer
exports.updateCustomer = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const updatedCustomer = await Customer.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!updatedCustomer) return res.status(404).json({ message: 'Customer not found' });
    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const deleted = await Customer.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Record payment
exports.recordPayment = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const amount = Math.max(0, Number(req.body.amount) || 0);
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });

    const customer = await Customer.findOne({ _id: req.params.id, userId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.totalPaid = (customer.totalPaid || 0) + amount;

    // If customer had a remainingBalance, reduce it; otherwise this will simply increase totalPaid
    customer.remainingBalance = Math.max(0, (customer.remainingBalance || 0) - amount);

    customer.paymentHistory = customer.paymentHistory || [];
    customer.paymentHistory.push({ amount, date: new Date(), type: 'payment', note: req.body.note || 'manual' });

    customer.isCredit = (customer.remainingBalance || 0) > 0;

    await customer.save();

    res.json(customer);
  } catch (error) {
    console.error('Error recording customer payment', error);
    res.status(500).json({ message: 'Payment failed' });
  }
};
