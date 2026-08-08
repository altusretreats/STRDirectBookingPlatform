'use strict';
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { logger } = require('/opt/nodejs/lib/logger');
const { preArrivalEmail } = require('./templates');

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const FROM_ADDRESS = process.env.FROM_EMAIL || 'Altus Retreats <support@altusretreats.net>';

/**
 * Invoked by EventBridge Scheduler 48hrs before check-in.
 * Event shape from EventBridge:
 * {
 *   bookingId, propertyId, propertyName,
 *   guest: { firstName, lastName, email },
 *   checkIn, checkOut,
 *   guidebookUrl, checkInCode
 * }
 */
const handler = async (event) => {
  const { guest, checkIn, checkOut, propertyName, guidebookUrl, checkInCode, bookingId } = event;

  logger.info('Sending pre-arrival email', { bookingId, email: guest.email });

  const { subject, html, text } = preArrivalEmail({ guest, checkIn, checkOut, propertyName, guidebookUrl, checkInCode });

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
  logger.info('Pre-arrival email sent', { bookingId, email: guest.email });
  return { success: true };
};

module.exports = { handler };
