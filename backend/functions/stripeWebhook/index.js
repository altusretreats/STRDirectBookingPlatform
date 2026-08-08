const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const db = require('/opt/nodejs/lib/db');
const { getSecret } = require('/opt/nodejs/lib/secrets');
const { getHospitableClient } = require('/opt/nodejs/lib/hospitable');
const { ok, badRequest, serverError } = require('/opt/nodejs/lib/response');

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

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

    const HANDLED_EVENTS = ['payment_intent.succeeded', 'payment_intent.payment_failed'];
    if (!HANDLED_EVENTS.includes(stripeEvent.type)) {
      return ok({ received: true, action: 'ignored', type: stripeEvent.type });
    }

    const paymentIntent = stripeEvent.data.object;

    // ── Handle payment failure ─────────────────────────────────────────
    if (stripeEvent.type === 'payment_intent.payment_failed') {
      const { Items: failedItems } = await db.query({
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: { ':pk': `STRIPE#${paymentIntent.id}` },
      });

      if (failedItems?.length) {
        const failedBooking = failedItems[0];
        const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30-day auto-expire
        await db.update({
          Key: { PK: `BOOKING#${failedBooking.bookingId}`, SK: `BOOKING#${failedBooking.bookingId}` },
          UpdateExpression: 'SET #status = :status, #ttl = :ttl, updatedAt = :now',
          ExpressionAttributeNames: { '#status': 'status', '#ttl': 'ttl' },
          ExpressionAttributeValues: {
            ':status': 'FAILED',
            ':ttl': ttl,
            ':now': new Date().toISOString(),
          },
        });
        console.log(`Booking ${failedBooking.bookingId} marked FAILED with 30-day TTL`);
      }
      return ok({ received: true, action: 'failed', paymentIntentId: paymentIntent.id });
    }

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

    // Fire confirmation email (async invoke — don't block webhook response)
    const guidebookUrl = property.domain
      ? `https://${property.domain}/guidebook`
      : null;

    try {
      await lambda.send(new InvokeCommand({
        FunctionName: process.env.SEND_CONFIRMATION_EMAIL_FUNCTION,
        InvocationType: 'Event', // async
        Payload: JSON.stringify({
          guest,
          checkIn,
          checkOut,
          nights,
          pricing,
          bookingId,
          propertyName: property.name,
          guidebookUrl,
        }),
      }));
    } catch (err) {
      // Non-fatal — guest already paid, email failure shouldn't 500 the webhook
      console.error('Failed to invoke confirmation email Lambda:', err.message);
    }

    // Schedule pre-arrival email via EventBridge Scheduler (48hrs before check-in)
    try {
      const { SchedulerClient, CreateScheduleCommand } = require('@aws-sdk/client-scheduler');
      const scheduler = new SchedulerClient({ region: process.env.AWS_REGION || 'us-east-1' });

      const checkInMs = new Date(checkIn).getTime();
      const triggerAt = new Date(checkInMs - 48 * 60 * 60 * 1000);
      // Only schedule if check-in is more than 48hrs away
      if (triggerAt > new Date()) {
        const scheduleAt = triggerAt.toISOString().replace(/\.\d{3}Z$/, '');
        await scheduler.send(new CreateScheduleCommand({
          Name: `pre-arrival-${bookingId}`,
          ScheduleExpression: `at(${scheduleAt})`,
          FlexibleTimeWindow: { Mode: 'FLEXIBLE', MaximumWindowInMinutes: 30 },
          Target: {
            Arn: process.env.SEND_PRE_ARRIVAL_EMAIL_FUNCTION_ARN,
            RoleArn: process.env.SCHEDULER_ROLE_ARN,
            Input: JSON.stringify({
              bookingId,
              propertyId,
              propertyName: property.name,
              guest,
              checkIn,
              checkOut,
              guidebookUrl,
              checkInCode: property.checkInCode || null,
            }),
          },
          ActionAfterCompletion: 'DELETE',
        }));
      }
    } catch (err) {
      console.error('Failed to schedule pre-arrival email:', err.message);
    }

    console.log(`Booking ${bookingId} confirmed. Hospitable reservation: ${hospReservationId}`);
    return ok({ received: true, action: 'confirmed', bookingId });
  } catch (err) {
    return serverError(err);
  }
};
