const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', dashboardController.getStats);
router.get('/alerts/low-stock', dashboardController.getAlerts);
router.get('/alerts/near-expiry', dashboardController.getExpiryAlerts);

module.exports = router;
