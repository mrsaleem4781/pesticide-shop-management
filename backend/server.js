const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const Invoice = require('./models/Invoice');

// Middleware
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) {
      // Default allow localhost in dev
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    }
    if (allowedOrigins.includes('*')) return callback(null, true);
    if (allowedOrigins.some(o => origin.indexOf(o) !== -1)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) {
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    }
    if (allowedOrigins.includes('*')) return callback(null, true);
    if (allowedOrigins.some(o => origin.indexOf(o) !== -1)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use(cookieParser());

// Attach authenticated user from cookie token (if present)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
app.use((req, res, next) => {
  try {
    const token = req.cookies && req.cookies['psm_token'];
    if (token) {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
    }
  } catch (_) {}
  next();
});

// Request logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.path} | DB readyState=${mongoose.connection.readyState}`);
  next();
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pesticide-shop';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

// Ensure indexes and fix legacy unique index on invoiceNumber
const ensureIndexes = async () => {
  try {
    // Drop legacy unique index if present
    const indexes = await Invoice.collection.indexes();
    const legacy = indexes.find(i => Array.isArray(i.key) ? false : (i.key && i.key.invoiceNumber === 1));
    if (legacy && legacy.name) {
      try {
        await Invoice.collection.dropIndex(legacy.name);
        console.log('🔧 Dropped legacy index:', legacy.name);
      } catch (e) {
        console.log('ℹ️ Could not drop legacy index (may not exist):', legacy.name);
      }
    }
    // Create compound unique index per user
    await Invoice.collection.createIndex({ userId: 1, invoiceNumber: 1 }, { unique: true, name: 'user_invoice_unique' });
    console.log('✅ Ensured compound unique index on (userId, invoiceNumber)');
  } catch (e) {
    console.error('❌ Failed to ensure indexes:', e);
  }
};

// Static serving for uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}
}
app.use('/uploads', express.static(uploadsDir));

const startServer = async () => {
  await connectDB();
  await ensureIndexes();
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();

// Routes
app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/productRoutes'));
app.use('/api', require('./routes/saleRoutes'));
app.use('/api', require('./routes/customerRoutes'));
app.use('/api', require('./routes/invoiceRoutes'));
app.use('/api', require('./routes/dashboardRoutes'));
app.use('/api', require('./routes/settingsRoutes'));

// Health check
app.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.json({ status: 'ok', dbConnected: connected });
});

// Ping
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, time: new Date() });
});

// Debug counts
app.get('/api/debug-counts', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const Sale = require('./models/Sale');
    const Customer = require('./models/Customer');
    const totalProducts = await Product.countDocuments();
    const totalSales = await Sale.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    res.json({ totalProducts, totalSales, totalCustomers });
  } catch (error) {
    console.error('API ERROR GET /api/debug-counts', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Error handling
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION at Promise', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION thrown:', err);
});
