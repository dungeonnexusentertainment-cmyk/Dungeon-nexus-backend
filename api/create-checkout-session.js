const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      playerName,
      playerEmail,
      gmName,
      gameSystem,
      duration,
      amount, // in cents
    } = req.body;

    // Validate required fields
    if (!playerEmail || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate Dungeon Nexus commission (8%)
    const applicationFee = Math.round(amount * 0.08);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: playerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${gameSystem} Session with ${gmName}`,
              description: `Duration: ${duration}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}?canceled=true`,
      payment_intent_data: {
        application_fee_amount: applicationFee,
      },
      metadata: {
        playerName,
        playerEmail,
        gmName,
        gameSystem,
        duration,
      },
    });

    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
}
