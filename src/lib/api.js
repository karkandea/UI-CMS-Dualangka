// src/lib/api.js
// NOTE: path import-nya. Kalo file ini ada di: src/lib/api.js
// maka import firebase seharusnya "../firebase" (BUKAN "../../firebase")
import { auth } from '../../firebase';

// BASE: ambil dari VITE_API_URL (contoh: http://localhost:4000/api atau https://cms-dualangka.vercel.app/api)
// gunakan fallback production bila env kosong, dan hapus trailing slash supaya gabungannya bersih
const RAW_BASE = (import.meta.env.VITE_API_URL || 'https://cms-dualangka.vercel.app/api').trim();
const BASE = RAW_BASE.replace(/\/+$/, '');
if (!BASE) throw new Error('VITE_API_URL is required');
const BASE_HAS_API_SEGMENT = BASE.endsWith('/api');

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
    : buildUrl(path);

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

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!BASE_HAS_API_SEGMENT) return `${BASE}${normalizedPath}`;
  if (normalizedPath === '/api') return BASE;
  if (normalizedPath.startsWith('/api/')) {
    return `${BASE}${normalizedPath.slice(4)}`;
  }
  return `${BASE}${normalizedPath}`;
}
