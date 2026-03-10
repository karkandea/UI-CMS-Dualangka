import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { uploadArticleCover } from '../lib/uploadArticleCover';
import { Icon } from '@iconify/react';

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
      !saving &&
      !deleting
    );
  }, [slugState, title, body, saving, deleting]);

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

      navigate('/articles/manage', { replace: true });
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to save article');
      setSaving(false);
    }
  }

  async function onDelete() {
    const ok = confirm('Delete this article? This cannot be undone.');
    if (!ok) return;
    setDeleting(true);
    try {
      await apiFetch(`${REMOTE_API_BASE}/articles/${slug}`, { method: 'DELETE' });
      navigate('/articles/manage', { replace: true });
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to delete article');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Icon icon="eos-icons:loading" className="text-4xl mb-4 text-blue-600" />
        <p>Memuat artikel...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <button 
            type="button" 
            onClick={() => navigate('/articles/manage')}
            className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm font-medium mb-2 transition-colors"
          >
            <Icon icon="mdi:arrow-left" className="text-lg" />
            Back to Articles
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Article</h1>
          <p className="text-sm text-slate-500 mt-1">Update your article content and configurations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {deleting ? (
              <Icon icon="eos-icons:loading" className="text-xl animate-spin" />
            ) : (
              <Icon icon="solar:trash-bin-trash-bold" className="text-xl" />
            )}
            {deleting ? 'Deleting...' : 'Delete'}
          </button>

          <button
            onClick={onSave}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Icon icon="eos-icons:loading" className="text-xl animate-spin" />
            ) : (
             <Icon icon="solar:diskette-bold" className="text-xl" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Icon icon="solar:document-text-bold-duotone" className="text-xl text-blue-500" />
                Article Content
              </h2>
              <div className="inline-flex bg-slate-200/50 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveLang('en')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeLang === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLang('id')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeLang === 'id' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Indonesia
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 transition-colors"
                  value={title[activeLang]}
                  onChange={(e) => handleTitleChange(activeLang, e.target.value)}
                  placeholder={activeLang === 'en' ? 'Enter an engaging title...' : 'Masukkan judul artikel yang menarik...'}
                />
                {shouldShowFallback(title[activeLang]) && (
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <Icon icon="solar:info-circle-bold" /> {FALLBACK_NOTICE}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Summary / Description
                </label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 transition-colors"
                  rows={3}
                  value={description[activeLang]}
                  onChange={(e) => handleDescriptionChange(activeLang, e.target.value)}
                  placeholder={activeLang === 'en' ? 'A short teaser about this article...' : 'Ringkasan singkat tentang artikel ini...'}
                />
                {shouldShowFallback(description[activeLang]) && (
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <Icon icon="solar:info-circle-bold" /> {FALLBACK_NOTICE}
                  </p>
                )}
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Body Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 transition-colors font-mono"
                  rows={15}
                  value={body[activeLang]}
                  onChange={(e) => handleBodyChange(activeLang, e.target.value)}
                  placeholder={activeLang === 'en' ? 'Write the main content here (HTML / Markdown supported)...' : 'Tulis konten utama di sini...'}
                />
                {shouldShowFallback(body[activeLang]) && (
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <Icon icon="solar:info-circle-bold" /> {FALLBACK_NOTICE}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">Supports basic formatting if processed on the frontend.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Meta & Settings */}
        <div className="space-y-6">
          
          {/* Publishing */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Icon icon="solar:settings-bold-duotone" className="text-lg text-slate-400" />
              Publishing
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-xl block p-2.5 font-mono cursor-not-allowed"
                value={slugState}
                disabled
              />
              <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
                <Icon icon="solar:locked-bold" className="text-slate-400" /> Cannot edit slug
              </p>
            </div>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={isPublished} 
                  onChange={(e) => setIsPublished(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
              <div>
                <span className="block text-sm font-medium text-slate-900">Publish Article</span>
                <span className="block text-xs text-slate-500">Make it visible to the public</span>
              </div>
            </label>
          </div>

          {/* Media */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Icon icon="solar:gallery-bold-duotone" className="text-lg text-slate-400" />
              Cover Image
            </h3>
            
            {(coverPreview || coverUrl) ? (
              <div className="relative rounded-xl overflow-hidden group border border-slate-200 mb-4 aspect-[16/9]">
                <img 
                  src={coverPreview || coverUrl} 
                  alt="Cover Preview" 
                  className="w-full h-full object-cover" 
                  onError={(e)=>{ e.currentTarget.src = '/fallback.jpg'; }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium flex items-center gap-1">
                    <Icon icon="solar:pen-bold" /> Change Image
                  </span>
                </div>
                <input 
                  type="file" 
                  accept={TYPES.join(',')} 
                  onChange={onCoverChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  title="Change cover"
                />
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors mb-4">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Icon icon="solar:cloud-upload-linear" className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Click to upload cover</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG or WEBP (Max {MAX_MB}MB)</p>
                </div>
                <input 
                  type="file" 
                  accept={TYPES.join(',')} 
                  onChange={onCoverChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
              </div>
            )}
            
            {coverFile && (
              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="truncate pr-2">{coverFile.name}</span>
                <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); }} className="text-red-500 hover:text-red-700 flex-shrink-0">
                  <Icon icon="solar:trash-bin-trash-bold" className="text-sm" />
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Icon icon="solar:tag-bold-duotone" className="text-lg text-slate-400" />
              Tags <span className="text-xs normal-case text-slate-400 font-normal">({activeLang.toUpperCase()})</span>
            </h3>
            
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <Icon icon="solar:hashtag-bold" className="text-slate-400" />
                </div>
                <input
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block ps-9 p-2.5 transition-colors"
                  value={tagInput[activeLang]}
                  onChange={(e) => setTagInput(prev => ({ ...prev, [activeLang]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag..."
                />
              </div>
              <button 
                type="button" 
                onClick={addTag}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-200"
              >
                Add
              </button>
            </div>
            
            {tags[activeLang].length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags[activeLang].map((t, i) => (
                  <span key={`${t}-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                    {t}
                    <button 
                      type="button" 
                      onClick={() => removeTag(activeLang, i)}
                      className="text-blue-400 hover:text-blue-800 focus:outline-none"
                    >
                      <Icon icon="solar:close-circle-bold" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No tags added yet.</p>
            )}
            
            {shouldShowFallback(tags[activeLang]) && (
              <p className="mt-3 text-xs text-amber-600 flex items-center gap-1">
                <Icon icon="solar:info-circle-bold" /> {FALLBACK_NOTICE}
              </p>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
