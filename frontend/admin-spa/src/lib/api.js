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
  listProperties: ()                     => request('GET',  '/admin/properties'),
  createProperty: (data)                 => request('POST', '/admin/properties', data),
  updateProperty: (id, data)             => request('PUT',  `/admin/properties/${id}`, data),

  // Guidebook
  listSections:   (propertyId)           => request('GET',  `/admin/properties/${propertyId}/guidebook`),
  upsertSection:  (propertyId, id, data) => request('PUT',  `/admin/properties/${propertyId}/guidebook/${id}`, data),
  deleteSection:  (propertyId, id)       => request('DELETE',`/admin/properties/${propertyId}/guidebook/${id}`),
};
