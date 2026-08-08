'use strict';
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { withMiddleware } = require('/opt/nodejs/lib/middleware');
const { logger } = require('/opt/nodejs/lib/logger');
const { confirmationEmail } = require('./templates');

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const FROM_ADDRESS = process.env.FROM_EMAIL || 'Altus Retreats <support@altusretreats.net>';

/**
 * Invoked directly (not via API Gateway) — called from stripeWebhook after payment confirmed.
 * Event shape:
 * {
 *   guest: { firstName, lastName, email },
 *   checkIn, checkOut, nights,
 *   pricing: { nightlyRate, subtotal, cleaningFee, taxes, total },
 *   bookingId, propertyName, guidebookUrl
 * }
 */
const handler = async (event) => {
  const { guest, checkIn, checkOut, nights, pricing, bookingId, propertyName, guidebookUrl } = event;

  logger.info('Sending confirmation email', { bookingId, email: guest.email });

  const { subject, html, text } = confirmationEmail({ guest, checkIn, checkOut, nights, pricing, bookingId, propertyName, guidebookUrl });

  const cmd = new SendEmailCommand({
    Source: FROM_ADDRESS,
    Destination: { ToAddresses: [guest.email] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: { Data: text, Charset: 'UTF-8' },
      },
    },
  });

  await ses.send(cmd);
  logger.info('Confirmation email sent', { bookingId, email: guest.email });
  return { success: true };
};

module.exports = { handler };
