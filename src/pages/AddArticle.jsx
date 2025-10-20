import { useState, useMemo } from 'react';
import { uploadArticleCover } from '../lib/uploadArticleCover';
import { apiFetch } from '../lib/api';

const MAX_MB = 2;
const TYPES = ['image/jpeg','image/png','image/webp','image/gif'];

export default function AddArticle() {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');            // NEW: content
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [isPublished, setIsPublished] = useState(false);

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!tags.includes(v)) setTags(prev => [...prev, v]);
    setTagInput('');
  };
  const removeTag = (idx) => setTags(prev => prev.filter((_, i) => i !== idx));

  const canSubmit = useMemo(() => title && slug && !saving, [title, slug, saving]);

  function onCoverChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!TYPES.includes(f.type)) return alert('Cover harus JPG/PNG/WEBP/GIF');
    if (f.size / (1024*1024) > MAX_MB) return alert(`Ukuran max ${MAX_MB}MB`);
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      let coverUrl = '';
      if (coverFile) {
        coverUrl = await uploadArticleCover(slug, coverFile);
      }

      const payload = {
        slug,
        title,
        description,
        content,                         // NEW: kirim content
        tags,
        status: isPublished ? 'Published' : 'Draft',
        coverUrl,
      };
      const created = await apiFetch('/api/articles', {
        method: 'POST',
        body: payload
      });

      alert(`Artikel dibuat: ${created.title}`);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg mx-auto p-4 text-black">
      <h1 className="text-xl font-semibold mb-4 text-black">Tambah Artikel</h1>

      <label className="block text-sm mb-1 text-black">Title</label>
      <input
        className="w-full border rounded p-2 mb-4"
        value={title} onChange={(e)=>setTitle(e.target.value)}
        placeholder="Judul artikel" required
      />

      <label className="block text-sm mb-1 text-black">Slug</label>
      <input
        className="w-full border rounded p-2 mb-4"
        value={slug} onChange={(e)=>setSlug(e.target.value)}
        placeholder="contoh: hello-world" required
      />

      <label className="block text-sm mb-1 text-black">Deskripsi</label>
      <textarea
        className="w-full border rounded p-2 mb-4"
        rows={4}
        value={description} onChange={(e)=>setDescription(e.target.value)}
        placeholder="Ringkasan artikel"
      />

      {/* NEW: Content */}
      <label className="block text-sm mb-1 text-black">Isi Artikel</label>
      <textarea
        className="w-full border rounded p-2 mb-4"
        rows={10}
        value={content} onChange={(e)=>setContent(e.target.value)}
        placeholder="Tulis isi artikel di sini (teks biasa/markdown/HTML sesuai kebutuhan)"
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

      <label className="block text-sm mb-1 text-black">Cover (opsional)</label>
      {coverPreview && <img src={coverPreview} alt="" className="w-full h-48 object-cover rounded mb-2" />}
      <input type="file" accept={TYPES.join(',')} onChange={onCoverChange} className="mb-6" />

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-60"
      >
        {saving ? 'Menyimpan…' : 'Simpan'}
      </button>
    </form>
  );
}
