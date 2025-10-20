// src/lib/api.js
// NOTE: path import-nya. Kalo file ini ada di: src/lib/api.js
// maka import firebase seharusnya "../firebase" (BUKAN "../../firebase")
import { auth } from '../../firebase'


const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
console.log('[CMS API BASE]', BASE); // debug sementara

export async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  // siapkan headers dasar
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // inject Firebase ID token kalau ada user yang login
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  // rakit URL (boleh full atau relative)
  const url = path.startsWith('http') ? path : `${BASE}${path}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // network error, CORS, dll.
    throw new Error(`Network error: ${e.message}`);
  }

  // coba parse JSON; kalau gagal, fallback ke text
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = (data && data.message) || data || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }

  return data;
}
