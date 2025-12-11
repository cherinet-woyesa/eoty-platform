const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

if (!stripe) {
  console.warn('WARNING: STRIPE_SECRET_KEY is not set. Donation features will not work.');
}

exports.getDonationStats = async (req, res) => {
  try {
    const result = await pool.query('SELECT SUM(amount) as total_raised FROM donations WHERE status = $1', ['succeeded']);
    const totalRaised = result.rows[0].total_raised || 0;
    res.json({ totalRaised: parseFloat(totalRaised) });
  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({ error: 'Failed to fetch donation stats' });
  }
};

exports.createPaymentIntent = async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Payment system not configured' });
  }

  const { amount, currency = 'usd', donorInfo } = req.body;

  try {
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in cents
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        donor_name: donorInfo?.name,
        donor_email: donorInfo?.email
      }
    });

    // Create a pending donation record
    const result = await pool.query(
      `INSERT INTO donations (amount, currency, donor_name, donor_email, payment_intent_id, status) 
       VALUES ($1, $2, $3, $4, $5, 'pending') 
       RETURNING id`,
      [amount, currency, donorInfo?.name, donorInfo?.email, paymentIntent.id]
    );

    res.send({
      clientSecret: paymentIntent.client_secret,
      donationId: result.rows[0].id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.confirmDonation = async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Payment system not configured' });
  }

  const { paymentIntentId } = req.body;

  try {
    // Verify with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      await pool.query(
        'UPDATE donations SET status = $1, updated_at = NOW() WHERE payment_intent_id = $2',
        ['succeeded', paymentIntentId]
      );
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Payment not succeeded' });
    }
  } catch (error) {
    console.error('Error confirming donation:', error);
    res.status(500).json({ error: 'Failed to confirm donation' });
  }
};
