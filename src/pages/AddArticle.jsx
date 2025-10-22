import { useMemo, useState } from 'react';
import { uploadArticleCover } from '../lib/uploadArticleCover';
import { apiFetch } from '../lib/api';

const REMOTE_API_BASE = 'https://cms-dualangka.vercel.app/api';

const MAX_MB = 2;
const TYPES = ['image/jpeg','image/png','image/webp','image/gif'];

export default function AddArticle() {
  const [slug, setSlug] = useState('');
  const [activeLang, setActiveLang] = useState('en');
  const [title, setTitle] = useState(() => ({ en: '', id: '' }));
  const [description, setDescription] = useState(() => ({ en: '', id: '' }));
  const [body, setBody] = useState(() => ({ en: '', id: '' }));
  const [tags, setTags] = useState(() => ({ en: [], id: [] }));
  const [tagInput, setTagInput] = useState(() => ({ en: '', id: '' }));
  const [isPublished, setIsPublished] = useState(false);

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(
      slug.trim() &&
      title.en.trim() &&
      body.en.trim() &&
      !saving
    );
  }, [slug, title, body, saving]);

  const fallbackNotice = 'Indonesian empty → will fallback to English.';

  const handleTitleChange = (lang, value) => {
    setTitle(prev => ({ ...prev, [lang]: value }));
  };
  const handleDescriptionChange = (lang, value) => {
    setDescription(prev => ({ ...prev, [lang]: value }));
  };
  const handleBodyChange = (lang, value) => {
    setBody(prev => ({ ...prev, [lang]: value }));
  };

  const addTag = () => {
    const lang = activeLang;
    const value = tagInput[lang].trim();
    if (!value) return;
    setTags(prev => {
      if (prev[lang].includes(value)) return prev;
      return {
        ...prev,
        [lang]: [...prev[lang], value],
      };
    });
    setTagInput(prev => ({ ...prev, [lang]: '' }));
  };

  const removeTag = (lang, idx) => {
    setTags(prev => ({
      ...prev,
      [lang]: prev[lang].filter((_, i) => i !== idx),
    }));
  };

  const shouldShowFallback = (value) => {
    if (activeLang !== 'id') return false;
    if (Array.isArray(value)) return value.length === 0;
    return !value.trim();
  };

  function onCoverChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!TYPES.includes(f.type)) return alert('Cover must be JPG/PNG/WEBP/GIF');
    if (f.size / (1024*1024) > MAX_MB) return alert(`Maximum size ${MAX_MB}MB`);
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    if (!title.en.trim()) {
      alert('English title is required.');
      return;
    }
    if (!body.en.trim()) {
      alert('English body is required.');
      return;
    }

    setSaving(true);
    try {
      let coverUrl = '';
      if (coverFile) {
        coverUrl = await uploadArticleCover(slug, coverFile);
      }

      const normalizedTitle = {
        en: title.en.trim(),
        id: title.id.trim(),
      };
      const normalizedDescription = {
        en: description.en.trim(),
        id: description.id.trim(),
      };
      const normalizedBody = {
        en: body.en.trim(),
        id: body.id.trim(),
      };
      const normalizedTags = {
        en: tags.en.map(t => t.trim()).filter(Boolean),
        id: tags.id.map(t => t.trim()).filter(Boolean),
      };

      const payload = {
        slug: slug.trim(),
        title: normalizedTitle,
        description: normalizedDescription,
        body: normalizedBody,
        tags: normalizedTags,
        status: isPublished ? 'published' : 'draft',
        coverUrl,
      };
      const created = await apiFetch(`${REMOTE_API_BASE}/articles`, {
        method: 'POST',
        body: payload,
      });

      alert(`Article created: ${created?.title?.en || payload.slug}`);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 text-black">
      <h1 className="text-xl font-semibold mb-6 text-black">Create Article</h1>

      <label className="block text-sm mb-1 text-black">Slug</label>
      <input
        className="w-full border rounded p-2 mb-4"
        value={slug}
        onChange={(e)=>setSlug(e.target.value)}
        placeholder="e.g. my-first-article"
        required
      />

      <div className="mb-4">
        <span className="block text-sm font-medium text-black mb-2">Content language</span>
        <div className="inline-flex rounded border overflow-hidden">
          {['en', 'id'].map(lang => (
            <button
              type="button"
              key={lang}
              onClick={()=>setActiveLang(lang)}
              className={`px-4 py-2 text-sm font-semibold ${activeLang === lang ? 'bg-blue-600 text-white' : 'bg-white text-black'}`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm mb-1 text-black">Title ({activeLang.toUpperCase()})</label>
      <input
        className="w-full border rounded p-2 mb-2"
        value={title[activeLang]}
        onChange={(e)=>handleTitleChange(activeLang, e.target.value)}
        placeholder={activeLang === 'en' ? 'Article title in English' : 'Judul artikel dalam Bahasa Indonesia'}
        required={activeLang === 'en'}
      />
      {shouldShowFallback(title[activeLang]) && (
        <p className="text-xs text-gray-500 mb-4">{fallbackNotice}</p>
      )}

      <label className="block text-sm mb-1 text-black">Description ({activeLang.toUpperCase()})</label>
      <textarea
        className="w-full border rounded p-2 mb-2"
        rows={4}
        value={description[activeLang]}
        onChange={(e)=>handleDescriptionChange(activeLang, e.target.value)}
        placeholder={activeLang === 'en' ? 'Optional summary in English' : 'Ringkasan opsional dalam Bahasa Indonesia'}
      />
      {shouldShowFallback(description[activeLang]) && (
        <p className="text-xs text-gray-500 mb-4">{fallbackNotice}</p>
      )}

      <label className="block text-sm mb-1 text-black">Body ({activeLang.toUpperCase()})</label>
      <textarea
        className="w-full border rounded p-2 mb-2"
        rows={10}
        value={body[activeLang]}
        onChange={(e)=>handleBodyChange(activeLang, e.target.value)}
        placeholder={activeLang === 'en' ? 'Main content in English (plain text/Markdown/HTML)' : 'Konten utama dalam Bahasa Indonesia'}
        required={activeLang === 'en'}
      />
      {shouldShowFallback(body[activeLang]) && (
        <p className="text-xs text-gray-500 mb-4">{fallbackNotice}</p>
      )}

      <label className="block text-sm mb-1 text-black">Tags ({activeLang.toUpperCase()})</label>
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 border rounded p-2"
          value={tagInput[activeLang]}
          onChange={(e)=>setTagInput(prev => ({ ...prev, [activeLang]: e.target.value }))}
          onKeyDown={(e)=>{ if (e.key==='Enter'){ e.preventDefault(); addTag(); }}}
          placeholder={activeLang === 'en' ? 'Type a tag and press Enter' : 'Tulis tag dan tekan Enter'}
        />
        <button type="button" onClick={addTag} className="px-3 py-2 border rounded">Add</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags[activeLang].map((t,i)=>(
          <span key={`${t}-${i}`} className="px-3 py-1 text-sm rounded-full bg-blue-100 text-black">
            {t}
            <button type="button" className="ml-2 font-bold" onClick={()=>removeTag(activeLang, i)}>×</button>
          </span>
        ))}
      </div>
      {shouldShowFallback(tags[activeLang]) && (
        <p className="text-xs text-gray-500 mb-4">{fallbackNotice}</p>
      )}

      <label className="block text-sm mb-1 text-black">Status</label>
      <label className="inline-flex items-center gap-2 mb-4">
        <input type="checkbox" checked={isPublished} onChange={(e)=>setIsPublished(e.target.checked)} />
        <span className="text-black">Publish immediately</span>
      </label>

      <label className="block text-sm mb-1 text-black">Cover (optional)</label>
      {coverPreview && <img src={coverPreview} alt="" className="w-full h-48 object-cover rounded mb-2" />}
      <input type="file" accept={TYPES.join(',')} onChange={onCoverChange} className="mb-6" />

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
