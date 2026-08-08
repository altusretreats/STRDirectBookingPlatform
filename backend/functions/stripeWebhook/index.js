const db = require('/opt/nodejs/lib/db');
const { getSecret } = require('/opt/nodejs/lib/secrets');
const { getHospitableClient } = require('/opt/nodejs/lib/hospitable');
const { ok, badRequest, serverError } = require('/opt/nodejs/lib/response');

exports.handler = async (event) => {
  try {
    const stripeSecrets = await getSecret(`altus-retreats/${process.env.ENVIRONMENT}/stripe`);
    const Stripe = require('stripe');
    const stripe = Stripe(stripeSecrets.secretKey);

    // Validate webhook signature
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        event.headers['stripe-signature'],
        stripeSecrets.webhookSecret
      );
    } catch (err) {
      console.warn('Stripe signature validation failed:', err.message);
      return badRequest('Invalid signature');
    }

    if (stripeEvent.type !== 'payment_intent.succeeded') {
      return ok({ received: true, action: 'ignored', type: stripeEvent.type });
    }

    const paymentIntent = stripeEvent.data.object;

    // Look up booking by Stripe payment intent via GSI2
    const { Items } = await db.query({
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `STRIPE#${paymentIntent.id}` },
    });

    if (!Items?.length) {
      console.error('No booking found for paymentIntent:', paymentIntent.id);
      return ok({ received: true, action: 'no_booking_found' });
    }

    const booking = Items[0];
    const { bookingId, propertyId, checkIn, checkOut, nights, guests, guest, pricing } = booking;

    // Get property config for Hospitable listing ID
    const { Item: property } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'METADATA',
    });

    // Write reservation to Hospitable to block calendar
    let hospReservationId = null;
    try {
      const hospitable = await getHospitableClient(propertyId);
      const reservation = await hospitable.createReservation(property.hospitable.listingId, {
        check_in: checkIn,
        check_out: checkOut,
        guest_name: `${guest.firstName} ${guest.lastName}`,
        guest_email: guest.email,
        guest_phone: guest.phone,
        adults: guests.adults,
        children: guests.children ?? 0,
        infants: guests.infants ?? 0,
        total_price: pricing.total,
        source: 'direct',
      });
      hospReservationId = reservation.id;
    } catch (err) {
      // Log but don't fail — booking is confirmed, Hospitable sync can be retried
      console.error('Hospitable reservation write failed:', err.message);
    }

    // Confirm booking in DynamoDB
    const now = new Date().toISOString();
    await db.update({
      Key: { PK: `BOOKING#${bookingId}`, SK: `BOOKING#${bookingId}` },
      UpdateExpression: 'SET #status = :status, stripe.chargeId = :chargeId, hospitable.reservationId = :hospId, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'CONFIRMED',
        ':chargeId': paymentIntent.latest_charge,
        ':hospId': hospReservationId,
        ':now': now,
      },
    });

    console.log(`Booking ${bookingId} confirmed. Hospitable reservation: ${hospReservationId}`);
    return ok({ received: true, action: 'confirmed', bookingId });
  } catch (err) {
    return serverError(err);
  }
};
