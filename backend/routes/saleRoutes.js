const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

router.get('/sales', saleController.getSales);
router.post('/sales', saleController.createSale);
router.put('/sales/:id', saleController.updateSale);
router.delete('/sales/:id', saleController.deleteSale);

module.exports = router;
