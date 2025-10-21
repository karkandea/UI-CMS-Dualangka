import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { uploadArticleCover } from '../lib/uploadArticleCover';

const REMOTE_API_BASE = 'https://cms-dualangka.vercel.app/api';

const MAX_MB = 5;
const TYPES = ['image/jpeg','image/png','image/webp','image/gif'];

export default function EditArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState('');
  const [slugState, setSlugState] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');           // <— NEW
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [isPublished, setIsPublished] = useState(false);

  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const data = await apiFetch(`${REMOTE_API_BASE}/articles/${slug}`);
        if (!on) return;
        setTitle(data.title || '');
        setSlugState(data.slug || '');
        setDescription(data.description || '');
        setContent(data.content || '');                 // <— NEW
        setTags(data.tags || []);
        setIsPublished(data.status === 'Published');
        setCoverUrl(data.coverUrl || '');
      } catch (e) {
        alert(e.message || 'Gagal mengambil detail artikel');
        navigate('/articles/manage', { replace: true });
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [slug, navigate]);

  const canSubmit = useMemo(() => title && slugState && !saving, [title, slugState, saving]);

  function addTag() {
    const v = tagInput.trim();
    if (!v) return;
    if (!tags.includes(v)) setTags(prev => [...prev, v]);
    setTagInput('');
  }
  function removeTag(idx) { setTags(prev => prev.filter((_, i) => i !== idx)); }

  function onCoverChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!TYPES.includes(f.type)) return alert('Cover harus JPG/PNG/WEBP/GIF');
    if (f.size / (1024*1024) > MAX_MB) return alert(`Ukuran max ${MAX_MB}MB`);
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

async function onSave(e) {
  e?.preventDefault?.();
  if (!canSubmit) return;
  setSaving(true);
  try {
    let newCoverUrl = coverUrl;
    if (coverFile) {
      newCoverUrl = await uploadArticleCover(slugState, coverFile);
    }

    const payload = {
      title,
      description,
      content,
      tags,
      status: isPublished ? 'Published' : 'Draft',
      coverUrl: newCoverUrl,
    };

    await apiFetch(`${REMOTE_API_BASE}/articles/${slug}`, {
      method: 'PUT',
      body: payload,
    });

    // --- success → balik ke Manage ---
    alert('Perubahan tersimpan');
    navigate('/articles/manage', { replace: true });
    return; // penting: hentikan eksekusi lanjutan
  } catch (e) {
    console.error(e);
    alert(e.message || 'Gagal menyimpan');
  } finally {
    setSaving(false);
  }
}


  async function onDelete() {
    const ok = confirm('Yakin hapus artikel ini? Aksi tidak bisa dibatalkan.');
    if (!ok) return;
    setDeleting(true);
    try {
      await apiFetch(`${REMOTE_API_BASE}/articles/${slug}`, { method: 'DELETE' });
      alert('Artikel dihapus');
      navigate('/articles/manage', { replace: true });
    } catch (e) {
      console.error(e);
      alert(e.message || 'Gagal menghapus');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="text-sm text-black">Loading…</p>;

  return (
    <form onSubmit={onSave} className="max-w-3xl mx-auto p-4 text-black">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-black">Edit Artikel</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-60"
          >
            {deleting ? 'Menghapus…' : 'Delete'}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          >
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>

      <label className="block text-sm mb-1 text-black">Title</label>
      <input
        className="w-full border rounded p-2 mb-4"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
        placeholder="Judul artikel"
        required
      />

      <label className="block text-sm mb-1 text-black">Slug (read-only)</label>
      <input
        className="w-full border rounded p-2 mb-4 bg-gray-100"
        value={slugState}
        onChange={(e)=>setSlugState(e.target.value)}
        disabled
      />

      <label className="block text-sm mb-1 text-black">Deskripsi</label>
      <textarea
        className="w-full border rounded p-2 mb-4"
        rows={4}
        value={description}
        onChange={(e)=>setDescription(e.target.value)}
        placeholder="Ringkasan artikel"
      />

      {/* NEW: Content */}
      <label className="block text-sm mb-1 text-black">Isi Artikel</label>
      <textarea
        className="w-full border rounded p-2 mb-4"
        rows={10}
        value={content}
        onChange={(e)=>setContent(e.target.value)}
        placeholder="Tulis isi artikel"
      />

      <label className="block text-sm mb-1 text-black">Tags</label>
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 border rounded p-2"
          value={tagInput}
          onChange={(e)=>setTagInput(e.target.value)}
          onKeyDown={(e)=>{ if (e.key==='Enter'){ e.preventDefault(); addTag(); }}}
          placeholder="Ketik lalu Enter"
        />
        <button type="button" onClick={addTag} className="px-3 py-2 border rounded">Add</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map((t,i)=>(
          <span key={t+i} className="px-3 py-1 text-sm rounded-full bg-blue-100 text-black">
            {t}
            <button type="button" className="ml-2 font-bold" onClick={()=>removeTag(i)}>×</button>
          </span>
        ))}
      </div>

      <label className="block text-sm mb-1 text-black">Status</label>
      <label className="inline-flex items-center gap-2 mb-4">
        <input type="checkbox" checked={isPublished} onChange={(e)=>setIsPublished(e.target.checked)} />
        <span className="text-black">Publish</span>
      </label>

      <div className="mb-2">
        <label className="block text-sm mb-1 text-black">Cover</label>
        {(coverPreview || coverUrl) && (
          <img
            src={coverPreview || coverUrl}
            alt=""
            className="w-full max-w-xl h-56 object-cover rounded mb-2"
            onError={(e)=>{ e.currentTarget.src='/fallback.jpg'; }}
          />
        )}
        <input type="file" accept={TYPES.join(',')} onChange={onCoverChange} />
        <p className="text-xs text-black mt-1">Maks {MAX_MB}MB. JPG/PNG/WEBP/GIF.</p>
      </div>
    </form>
  );
}
