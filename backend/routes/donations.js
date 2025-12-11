const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

// Public routes
router.get('/stats', donationController.getDonationStats);
router.post('/create-payment-intent', donationController.createPaymentIntent);
router.post('/confirm', donationController.confirmDonation);

module.exports = router;
