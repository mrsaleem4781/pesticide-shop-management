const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.get('/invoices', invoiceController.getInvoices);
router.get('/invoices/:id', invoiceController.getInvoiceById);
router.post('/invoices/from-sale/:saleId', invoiceController.createInvoiceFromSale);
router.post('/invoices', invoiceController.createInvoice);
router.post('/invoices/:id/pay', invoiceController.payInvoice);

module.exports = router;
