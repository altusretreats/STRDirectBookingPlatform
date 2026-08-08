const { getSecret } = require('./secrets');

const BASE_URL = 'https://api.hospitable.com';

async function getHospitableClient(propertyId) {
  const secrets = await getSecret(
    `altus-retreats/${process.env.ENVIRONMENT}/hospitable`
  );
  const pat = secrets[propertyId] || secrets['default'];
  if (!pat || pat === 'REPLACE_ME') {
    throw new Error(`Hospitable PAT not configured for property: ${propertyId}`);
  }

  async function request(method, path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Hospitable API ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.json();
  }

  return {
    getListing: (listingId) => request('GET', `/v1/listings/${listingId}`),
    getCalendar: (listingId, startDate, endDate) =>
      request('GET', `/v1/listings/${listingId}/calendar?start_date=${startDate}&end_date=${endDate}`),
    createReservation: (listingId, data) =>
      request('POST', `/v1/listings/${listingId}/reservations`, data),
  };
}

module.exports = { getHospitableClient };
