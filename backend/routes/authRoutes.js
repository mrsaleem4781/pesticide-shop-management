const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.post('/auth/signup', auth.signup);
router.post('/auth/login', auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', auth.me);

module.exports = router;
