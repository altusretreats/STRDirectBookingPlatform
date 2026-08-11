/**
 * API client — wraps all calls to the backend.
 */
const api = (() => {
  const base = () => window.ALTUS_CONFIG.apiBase;
  const pid  = () => window.ALTUS_CONFIG.propertyId;

  async function request(method, path, body) {
    const res = await fetch(`${base()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
  }

  return {
    getProperty: () => request('GET', `/properties/${pid()}`),
    getAvailability: (start, end) =>
      request('GET', `/properties/${pid()}/availability?start_date=${start}&end_date=${end}`),
    getReviews: (propertyId) =>
      request('GET', `/properties/${propertyId || pid()}/reviews`),
    createBooking: (payload) =>
      request('POST', `/properties/${pid()}/bookings`, payload),
  };
})();
