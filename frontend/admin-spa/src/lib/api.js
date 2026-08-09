import { getIdToken } from './cognito';

const BASE = import.meta.env.VITE_API_BASE;

async function request(method, path, body) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${method} ${path} failed: ${res.status}`);
  return data;
}

export const adminApi = {
  // Properties
  listProperties:  ()           => request('GET',  '/admin/properties'),
  getProperty:     (id)         => request('GET',  `/admin/properties/${id}`),
  createProperty:  (data)       => request('POST', '/admin/properties', data),
  updateProperty:  (id, data)   => request('PUT',  `/admin/properties/${id}`, data),

  // Sync
  syncProperty: (id) => request('POST', `/admin/properties/${id}/sync`, {}),

  // Bookings
  getBookings: (propertyId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/admin/properties/${propertyId}/bookings${qs ? '?' + qs : ''}`);
  },

  // Waitlist
  getWaitlist: (source) => {
    const qs = source ? `?source=${encodeURIComponent(source)}` : '';
    return request('GET', `/admin/waitlist${qs}`);
  },

  // Guidebook
  listSections:   (propertyId)           => request('GET',    `/admin/properties/${propertyId}/guidebook`),
  upsertSection:  (propertyId, id, data) => request('PUT',    `/admin/properties/${propertyId}/guidebook/${id}`, data),
  deleteSection:  (propertyId, id)       => request('DELETE', `/admin/properties/${propertyId}/guidebook/${id}`),

  // Places (Google Maps lookup for local recommendations)
  lookupPlace: (propertyId, googleUrl)   => request('POST',   `/admin/properties/${propertyId}/places/lookup`, { googleUrl }),

  // Hub site
  getHub:    ()     => request('GET', '/admin/hub'),
  updateHub: (data) => request('PUT', '/admin/hub', data),

  // Media — presigned upload
  signUpload: (propertyId, filename, contentType) =>
    request('POST', '/admin/media/sign', { propertyId, filename, contentType }),

  // Actually upload the file to S3 using the presigned URL
  async uploadFile(uploadUrl, file) {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  },
};
