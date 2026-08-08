const { randomUUID } = require('crypto');
const Stripe = require('stripe');
const db = require('/opt/nodejs/lib/db');
const { getSecret } = require('/opt/nodejs/lib/secrets');
const { ok, badRequest, notFound, serverError } = require('/opt/nodejs/lib/response');

exports.handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { checkIn, checkOut, guests, guest, pricing } = body;

    if (!checkIn || !checkOut || !guests || !guest?.email) {
      return badRequest('checkIn, checkOut, guests, and guest.email are required');
    }

    // Verify property exists
    const { Item: property } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'METADATA',
    });
    if (!property || !property.active) return notFound(`Property not found: ${propertyId}`);

    // Init Stripe
    const stripeSecrets = await getSecret(`altus-retreats/${process.env.ENVIRONMENT}/stripe`);
    const stripe = Stripe(stripeSecrets.secretKey);

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.total,   // cents
      currency: 'usd',
      metadata: {
        propertyId,
        checkIn,
        checkOut,
        guestEmail: guest.email,
      },
    });

    // Write pending booking to DynamoDB
    const bookingId = `bk_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();

    await db.put({
      PK: `BOOKING#${bookingId}`,
      SK: `BOOKING#${bookingId}`,
      GSI1PK: `PROPERTY#${propertyId}`,
      GSI1SK: `CHECKIN#${checkIn}`,
      GSI2PK: `STRIPE#${paymentIntent.id}`,
      GSI2SK: `BOOKING#${bookingId}`,
      entityType: 'BOOKING',
      bookingId,
      propertyId,
      status: 'PENDING',
      guest,
      checkIn,
      checkOut,
      nights: Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000),
      guests,
      pricing,
      stripe: { paymentIntentId: paymentIntent.id },
      hospitable: { reservationId: null },
      createdAt: now,
      updatedAt: now,
    });

    return ok({
      bookingId,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    return serverError(err);
  }
};
