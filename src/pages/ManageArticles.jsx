import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const REMOTE_API_BASE = 'https://cms-dualangka.vercel.app/api';

export default function ManageArticles() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try {
        const res = await apiFetch(`${REMOTE_API_BASE}/articles?limit=100`);
        const list = Array.isArray(res)
          ? res
          : res?.items || res?.data || res?.rows || [];
        setRows(list);
      } catch (e) {
        console.error(e);
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { day:'2-digit', month:'short', year:'numeric' }) : '-';

  const resolveTitle = (article) => {
    const raw = article?.title;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') {
      return raw.en || raw.id || article?.slug || '';
    }
    return article?.slug || '';
  };

  const resolveTags = (article) => {
    const raw = article?.tags;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.en) && raw.en.length) return raw.en;
      if (Array.isArray(raw.id)) return raw.id;
    }
    return [];
  };

  const resolveStatus = (status) => {
    if (!status) return '-';
    const lower = String(status).toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  if (loading) return <p className="text-sm text-black">Loading…</p>;

  return (
    <>
      <h1 className="text-black mb-8 text-4xl">Manage Articles</h1>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-50">
            <tr>
              <th className="text-black px-6 py-3">Thumbnail</th>
              <th className="text-black px-6 py-3">Title</th>
              <th className="text-black px-6 py-3">Slug</th>
              <th className="text-black px-6 py-3">Tags</th>
              <th className="text-black px-6 py-3">Date Posted</th>
              <th className="text-black px-6 py-3">Status</th>
              <th className="text-black px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="text-black">
            {rows.map(a=>(
              <tr key={a._id} className="odd:bg-white even:bg-gray-50 border-b">
                <td className="px-6 py-4 align-middle">
                  <div className="w-44 aspect-[16/9] overflow-hidden rounded-lg bg-gray-100">
                    <img src={a.coverUrl || '/fallback.jpg'} alt={resolveTitle(a) || a.slug} className="w-full h-full object-cover" />
                  </div>
                </td>
                <td className="px-6 py-4">{resolveTitle(a)}</td>
                <td className="px-6 py-4">{a.slug}</td>
                <td className="px-6 py-4">{resolveTags(a).join(', ')}</td>
                <td className="px-6 py-4">{fmt(a.publishedAt || a.createdAt)}</td>
                <td className="px-6 py-4">{resolveStatus(a.status)}</td>
                <td className="px-6 py-4">
                  <Link to={`/articles/edit/${a.slug}`} className="font-medium text-blue-600 hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-black">No articles yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
