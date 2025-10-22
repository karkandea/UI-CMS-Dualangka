import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { uploadArticleCover } from '../lib/uploadArticleCover';

const REMOTE_API_BASE = 'https://cms-dualangka.vercel.app/api';

const MAX_MB = 5;
const TYPES = ['image/jpeg','image/png','image/webp','image/gif'];
const FALLBACK_NOTICE = 'Indonesian empty → will fallback to English.';

const createEmptyTextMap = () => ({ en: '', id: '' });
const createEmptyTagsMap = () => ({ en: [], id: [] });

function normalizeTextMap(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      en: typeof value.en === 'string' ? value.en : '',
      id: typeof value.id === 'string' ? value.id : '',
    };
  }
  if (typeof value === 'string') {
    return { en: value, id: '' };
  }
  return createEmptyTextMap();
}

function normalizeTagsMap(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      en: Array.isArray(value.en) ? value.en : [],
      id: Array.isArray(value.id) ? value.id : [],
    };
  }
  if (Array.isArray(value)) {
    return { en: value, id: [] };
  }
  return createEmptyTagsMap();
}

export default function EditArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [activeLang, setActiveLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState(createEmptyTextMap);
  const [slugState, setSlugState] = useState('');
  const [description, setDescription] = useState(createEmptyTextMap);
  const [body, setBody] = useState(createEmptyTextMap);
  const [tags, setTags] = useState(createEmptyTagsMap);
  const [tagInput, setTagInput] = useState(createEmptyTextMap);
  const [isPublished, setIsPublished] = useState(false);

  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiFetch(`${REMOTE_API_BASE}/articles/${slug}`);
        if (!mounted) return;
        setTitle(normalizeTextMap(data?.title));
        setSlugState(data?.slug || '');
        setDescription(normalizeTextMap(data?.description));
        setBody(normalizeTextMap(data?.body));
        setTags(normalizeTagsMap(data?.tags));
        setTagInput(createEmptyTextMap());
        const status = String(data?.status || '').toLowerCase();
        setIsPublished(status === 'published');
        setCoverUrl(data?.coverUrl || '');
      } catch (e) {
        alert(e.message || 'Failed to load article');
        if (mounted) navigate('/articles/manage', { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug, navigate]);

  const canSubmit = useMemo(() => {
    return Boolean(
      slugState.trim() &&
      title.en.trim() &&
      body.en.trim() &&
      !saving
    );
  }, [slugState, title, body, saving]);

  const shouldShowFallback = (value) => {
    if (activeLang !== 'id') return false;
    if (Array.isArray(value)) return value.length === 0;
    return !value.trim();
  };

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

  function onCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TYPES.includes(file.type)) return alert('Cover must be JPG/PNG/WEBP/GIF');
    if (file.size / (1024 * 1024) > MAX_MB) return alert(`Maximum size ${MAX_MB}MB`);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function onSave(e) {
    e?.preventDefault?.();
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
      let newCoverUrl = coverUrl;
      if (coverFile) {
        newCoverUrl = await uploadArticleCover(slugState, coverFile);
      }

      const payload = {
        title: {
          en: title.en.trim(),
          id: title.id.trim(),
        },
        description: {
          en: description.en.trim(),
          id: description.id.trim(),
        },
        body: {
          en: body.en.trim(),
          id: body.id.trim(),
        },
        tags: {
          en: tags.en.map(t => t.trim()).filter(Boolean),
          id: tags.id.map(t => t.trim()).filter(Boolean),
        },
        status: isPublished ? 'published' : 'draft',
        coverUrl: newCoverUrl,
      };

      await apiFetch(`${REMOTE_API_BASE}/articles/${slug}`, {
        method: 'PUT',
        body: payload,
      });

      alert('Changes saved');
      navigate('/articles/manage', { replace: true });
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    const ok = confirm('Delete this article? This cannot be undone.');
    if (!ok) return;
    setDeleting(true);
    try {
      await apiFetch(`${REMOTE_API_BASE}/articles/${slug}`, { method: 'DELETE' });
      alert('Article deleted');
      navigate('/articles/manage', { replace: true });
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to delete article');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="text-sm text-black">Loading…</p>;

  return (
    <form onSubmit={onSave} className="max-w-3xl mx-auto p-4 text-black">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-black">Edit Article</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <label className="block text-sm mb-1 text-black">Slug</label>
      <input
        className="w-full border rounded p-2 mb-4 bg-gray-100"
        value={slugState}
        onChange={(e)=>setSlugState(e.target.value)}
        disabled
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
        <p className="text-xs text-gray-500 mb-4">{FALLBACK_NOTICE}</p>
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
        <p className="text-xs text-gray-500 mb-4">{FALLBACK_NOTICE}</p>
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
        <p className="text-xs text-gray-500 mb-4">{FALLBACK_NOTICE}</p>
      )}

      <label className="block text-sm mb-1 text-black">Tags ({activeLang.toUpperCase()})</label>
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 border rounded p-2"
          value={tagInput[activeLang]}
          onChange={(e)=>setTagInput(prev => ({ ...prev, [activeLang]: e.target.value }))}
          onKeyDown={(e)=>{ if (e.key === 'Enter') { e.preventDefault(); addTag(); }}}
          placeholder={activeLang === 'en' ? 'Type a tag and press Enter' : 'Tulis tag dan tekan Enter'}
        />
        <button type="button" onClick={addTag} className="px-3 py-2 border rounded">Add</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags[activeLang].map((t, i) => (
          <span key={`${t}-${i}`} className="px-3 py-1 text-sm rounded-full bg-blue-100 text-black">
            {t}
            <button type="button" className="ml-2 font-bold" onClick={()=>removeTag(activeLang, i)}>×</button>
          </span>
        ))}
      </div>
      {shouldShowFallback(tags[activeLang]) && (
        <p className="text-xs text-gray-500 mb-4">{FALLBACK_NOTICE}</p>
      )}

      <label className="block text-sm mb-1 text-black">Status</label>
      <label className="inline-flex items-center gap-2 mb-4">
        <input type="checkbox" checked={isPublished} onChange={(e)=>setIsPublished(e.target.checked)} />
        <span className="text-black">Publish immediately</span>
      </label>

      <div className="mb-2">
        <label className="block text-sm mb-1 text-black">Cover</label>
        {(coverPreview || coverUrl) && (
          <img
            src={coverPreview || coverUrl}
            alt=""
            className="w-full max-w-xl h-56 object-cover rounded mb-2"
            onError={(event)=>{ event.currentTarget.src = '/fallback.jpg'; }}
          />
        )}
        <input type="file" accept={TYPES.join(',')} onChange={onCoverChange} />
        <p className="text-xs text-black mt-1">Maximum {MAX_MB}MB. JPG/PNG/WEBP/GIF.</p>
      </div>
    </form>
  );
}
