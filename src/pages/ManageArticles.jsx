import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Icon } from '@iconify/react';

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
    if (!status) return 'Draft';
    const lower = String(status).toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Icon icon="eos-icons:loading" className="text-4xl mb-4 text-blue-600" />
        <p>Memuat artikel...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manage Articles</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola dan lihat semua artikel yang terpublikasi atau draf.</p>
        </div>
        <Link 
          to="/articles/add" 
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-blue-600/20"
        >
          <Icon icon="material-symbols:add-rounded" className="text-xl" />
          Add Article
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Article</th>
                <th className="px-6 py-4 font-semibold w-64">Tags</th>
                <th className="px-6 py-4 font-semibold w-40">Status</th>
                <th className="px-6 py-4 font-semibold w-40">Date</th>
                <th className="px-6 py-4 font-semibold text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {rows.map(a => {
                const statusStr = resolveStatus(a.status);
                const isPublished = statusStr.toLowerCase() === 'published';
                return (
                  <tr key={a._id || a.slug} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-24 aspect-[16/9] flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200 shadow-sm relative">
                          <img 
                            src={a.coverUrl || '/fallback.jpg'} 
                            alt={resolveTitle(a) || a.slug} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            onError={(e) => (e.currentTarget.src = "/fallback.jpg")}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 truncate pr-4 text-base">{resolveTitle(a)}</span>
                          <span className="text-slate-400 text-xs mt-0.5 mt-1 font-mono">{a.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top pt-5">
                      <div className="flex flex-wrap gap-1.5">
                        {resolveTags(a).slice(0, 3).map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {tag}
                          </span>
                        ))}
                        {resolveTags(a).length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-500">
                            +{resolveTags(a).length - 3}
                          </span>
                        )}
                        {resolveTags(a).length === 0 && <span className="text-slate-300 italic">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top pt-5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        isPublished 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isPublished && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>}
                        {!isPublished && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>}
                        {statusStr}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top pt-5 whitespace-nowrap text-slate-500">
                      {fmt(a.publishedAt || a.createdAt)}
                    </td>
                    <td className="px-6 py-4 align-top pt-5 text-right">
                      <Link 
                        to={`/articles/edit/${a.slug}`} 
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Article"
                      >
                        <Icon icon="solar:pen-new-square-linear" className="text-xl" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Icon icon="solar:document-text-broken" className="text-3xl text-slate-400" />
                      </div>
                      <p className="text-slate-900 font-medium mb-1">No articles found</p>
                      <p className="text-slate-500 text-sm mb-4">Get started by creating your first article.</p>
                      <Link 
                        to="/articles/add" 
                        className="text-sm text-blue-600 font-medium hover:text-blue-700"
                      >
                        + Create Article
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
