import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function ManageArticles() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try {
        const res = await apiFetch('/api/articles?limit=100');
        const list = Array.isArray(res) ? res : (res?.data || []);
        setRows(list);
      } catch (e) {
        console.error(e);
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';

  if (loading) return <p className="text-sm text-black">Loading…</p>;

  return (
    <>
      <h1 className="text-black mb-8 text-4xl">Manage Articles</h1>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3">Thumbnail</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Slug</th>
              <th className="px-6 py-3">Tags</th>
              <th className="px-6 py-3">Date Posted</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="text-black">
            {rows.map(a=>(
              <tr key={a._id} className="odd:bg-white even:bg-gray-50 border-b">
                <td className="px-6 py-4 align-middle">
                  <div className="w-44 aspect-[16/9] overflow-hidden rounded-lg bg-gray-100">
                    <img src={a.coverUrl || '/fallback.jpg'} alt={a.title} className="w-full h-full object-cover" />
                  </div>
                </td>
                <td className="px-6 py-4">{a.title}</td>
                <td className="px-6 py-4">{a.slug}</td>
                <td className="px-6 py-4">{(a.tags||[]).join(', ')}</td>
                <td className="px-6 py-4">{fmt(a.publishedAt || a.createdAt)}</td>
                <td className="px-6 py-4">{a.status}</td>
                <td className="px-6 py-4">
                  <Link to={`/articles/edit/${a.slug}`} className="font-medium text-blue-600 hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-black">Belum ada artikel.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
