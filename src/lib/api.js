// src/lib/api.js
// NOTE: path import-nya. Kalo file ini ada di: src/lib/api.js
// maka import firebase seharusnya "../firebase" (BUKAN "../../firebase")
import { auth } from '../../firebase';

// BASE: ambil dari VITE_API_URL (contoh: http://localhost:4000 atau https://cms-dualangka.vercel.app)
// hapus trailing slash supaya gabungannya bersih
const RAW_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const BASE = RAW_BASE.replace(/\/+$/, '');
console.log('[CMS API BASE]', BASE); // debug

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

  // rakit URL (boleh full atau relative). Pastikan ada 1 slash di tengah.
  const url = path.startsWith('http')
    ? path
    : `${BASE}${path.startsWith('/') ? path : `/${path}`}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(`Network error: ${e.message}`);
  }

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = (data && data.message) || data || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }

  return data;
}
