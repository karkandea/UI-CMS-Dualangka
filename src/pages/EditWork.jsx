// src/pages/EditWork.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, getDoc, setDoc, collection, getDocs, serverTimestamp, deleteDoc
} from "firebase/firestore";
import { db } from "../../firebase";
import { Icon } from "@iconify/react";

const MAX_IMAGE_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Util: ambil ekstensi dari File
 */
const fileExt = (f) => (f?.name?.split(".").pop() || "jpg").toLowerCase();

/**
 * Upload helper
 */
const uploadFile = async (path, file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "dualangka_preset");
  
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dow7nf1no/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );
  
  const data = await res.json();
  if (!data.secure_url) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }
  return data.secure_url;
};

/**
 * Delete by https:// URL yang sudah disimpan di Firestore
 * Disable deletion for now on Cloudinary (requires API Secret from backend)
 */
const deleteByUrl = async (url) => {
  if (!url) return;
  console.warn("Delete skipped: Cloudinary deletion from frontend is disabled for security");
};

const EditWork = () => {
  const [deleting, setDeleting] = useState(false)
  const { slug } = useParams();
  const initialSlugRef= useRef(slug);
  const navigate = useNavigate();

  // ====== BASIC FORM STATE (mirror AddNewWork) ======
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [slugState, setSlugState] = useState(""); // biar bisa lihat/ubah slug (opsional)
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  // TAGS (keep field name: "tag")
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // COVER
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [existingCoverUrl, setExistingCoverUrl] = useState("");
  const fileInputRef = useRef(null);

  // CONTENT BLOCKS: bentuk sama seperti AddNewWork,
  // tapi tiap slot gambar boleh berisi:
  // - { preview: existingUrl, existingUrl }
  // - { file, preview } untuk file baru
  // - null untuk slot kosong
  const [blocks, setBlocks] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);


  const deleteFolderRecursive = async () => {
    console.warn("Folder deletion skipped: Cloudinary deletion from frontend is disabled for security");
  };

const handleDelete = async () => {
  if (deleting) return;
  setDeleting(true);
  try {
    // 1) hapus semua file di Storage dalam works/{slugState}
    await deleteFolderRecursive(`works/${slugState}`);

    // 2) hapus dokumen Firestore
    await deleteDoc(doc(db, "works", slugState));

    alert("Project sudah dihapus ✅");
    navigate("/work/manage");
  } catch (e) {
    console.error(e);
    alert("Gagal menghapus. Cek console.");
  } finally {
    setDeleting(false);
  }
};


  // hitung total gambar (existing + baru) utk limit 10
  const imagesUsed = useMemo(
    () => blocks.reduce((acc, b) => acc + b.images.filter(Boolean).length, 0),
    [blocks]
  );
  const remaining = 10 - imagesUsed;

  // ====== Fetch suggestions (riwayat tag) ======
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "works"));
      const arr = snap.docs.flatMap((d) => d.data().tag || []);
      const unique = [...new Set(arr.map((t) => (t || "").trim()))]
        .filter(Boolean)
        .sort();
      setAllTags(unique);
    })();
  }, []);

  // ====== Load current doc by slug ======
  useEffect(() => {
    (async () => {
      try {
        const refDoc = doc(db, "works", slug);
        const snap = await getDoc(refDoc);
        if (!snap.exists()) {
          setErr("Data tidak ditemukan.");
          setLoading(false);
          return;
        }
        const data = snap.data();

        setTitle(data.title || "");
        setSlugState(data.slug || slug); // pakai field slug, fallback dari param
        setDescription(data.description || "");
        setTags(data.tag || []);
        setIsPublished((data.status || "") === "Published");

        // cover
        setExistingCoverUrl(data.coverUrl || "");
        setCoverPreview(data.coverUrl || "");

        // blocks -> ke bentuk editor
        const initBlocks = (data.blocks || []).map((b) => ({
          id: cryptoRandomId(),
          type: b.type === "pair" ? "pair" : "single",
          images: (b.images || []).map((u) =>
            u ? { preview: u, existingUrl: u } : null
          ),
        }));
        setBlocks(initBlocks.length ? initBlocks : []);

      } catch (e) {
        setErr(e?.message || "Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // ====== Tag dropdown helpers ======
  const suggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    return allTags
      .filter((t) => !tags.includes(t))
      .filter((t) => !q || t.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allTags, tags, tagInput]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const addTag = (t) => {
    const v = (t || "").trim();
    if (!v) return;
    if (!tags.includes(v)) setTags((prev) => [...prev, v]);
    if (!allTags.includes(v)) setAllTags((prev) => [...prev, v].sort());
    setTagInput("");
  };
  const removeTag = (i) => setTags((prev) => prev.filter((_, idx) => idx !== i));
  const onKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
    if (e.key === "Escape") setOpen(false);
  };

  // ====== Cover handlers ======
  const clearCover = () => {
    setCoverFile(null);
    setCoverPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const onCoverChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      alert("File harus JPG/PNG/WEBP/GIF");
      return;
    }
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      alert(`Ukuran cover max ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  // ====== Blocks UI handlers (sama seperti AddNewWork) ======
  const addBlock = (type) => {
    const need = type === "pair" ? 2 : 1;
    if (remaining < need) {
      alert(`Butuh ${need} slot kosong. Sisa: ${remaining}`);
      return;
    }
    setBlocks((prev) => [
      ...prev,
      { id: cryptoRandomId(), type, images: type === "pair" ? [null, null] : [null] },
    ]);
  };
  const removeBlock = (blockId) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };
  const handleImageUpload = (e, blockId, imgIdx) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("File harus JPG/PNG/WEBP/GIF");
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      alert(`Ukuran gambar max ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId
            ? {
                ...block,
                images: block.images.map((img, i) => {
                  // kalau slot sebelumnya punya existingUrl, gantinya nanti akan menghapus existing-nya saat save
                  if (i !== imgIdx) return img;
                  return { file, preview: reader.result };
                }),
              }
            : block
        )
      );
    };
    reader.readAsDataURL(file);
  };


  // drag & drop reorder (mirip kode lo)
  const onDragStartBlock = (e, id) => {
    setDragId(id);
    const card = e.currentTarget.closest(".block-card");
    if (!card) return;
    const ghost = card.cloneNode(true);
    ghost.style.position = "fixed";
    ghost.style.top = "-1000px";
    ghost.style.left = "-1000px";
    ghost.style.width = `${card.offsetWidth}px`;
    ghost.style.pointerEvents = "none";
    ghost.classList.add("opacity-90","scale-95","shadow-2xl","rounded-lg","overflow-hidden");
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, card.offsetWidth / 2, card.offsetHeight / 2);
    e.dataTransfer.setData("text/plain", String(id));
    requestAnimationFrame(() => document.body.removeChild(ghost));
  };
  const onDragEnterBlock = (targetId) => {
    if (!dragId || dragId === targetId) return;
    setBlocks((prev) => {
      const srcIdx = prev.findIndex((b) => b.id === dragId);
      const dstIdx = prev.findIndex((b) => b.id === targetId);
      if (srcIdx === -1 || dstIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(dstIdx, 0, moved);
      return next;
    });
    setOverId(targetId);
  };

  // ====== SUBMIT (update + hapus file lama yang terganti) ======
const onSubmit = async (e) => {
  e.preventDefault();
  if (saving) return;
  if (!title || !slugState) {
    alert("Title & slug wajib diisi");
    return;
  }
  if (imagesUsed > 10) {
    alert("Maksimal 10 gambar di content blocks.");
    return;
  }

  setSaving(true);
  setErr("");

  try {
    const status = isPublished ? "Published" : "Draft";
    const postedAt = isPublished ? serverTimestamp() : null;

    // COVER
    let coverUrl = existingCoverUrl || "";
    if (coverFile) {
      coverUrl = await uploadFile(`works/${slugState}/cover.${fileExt(coverFile)}`, coverFile);
      await deleteByUrl(existingCoverUrl);
    } else if (!coverPreview && existingCoverUrl) {
      await deleteByUrl(existingCoverUrl);
      coverUrl = "";
    }

    // BLOCKS → payload [ { type, images: [url] } ]
    const blocksPayload = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const out = { type: b.type, images: [] };

      for (let j = 0; j < b.images.length; j++) {
        const img = b.images[j];
        if (!img) continue;

        if (img.file) {
          const path = `works/${slugState}/blocks/b${i}-s${j}-${Date.now()}.${fileExt(img.file)}`;
          const url = await uploadFile(path, img.file);
          if (img.existingUrl) await deleteByUrl(img.existingUrl);
          out.images.push(url);
        } else if (img.existingUrl) {
          out.images.push(img.existingUrl);
        }
      }

      if (out.images.length > 0) blocksPayload.push(out);
    }

    const payload = {
      title,
      slug: slugState,
      description,
      tag: tags,
      status,
      postedAt,
      coverUrl,
      blocks: blocksPayload,
    };

    const initialSlug = initialSlugRef.current;
    const isRename = slugState !== initialSlug;

    if (isRename) {
      // 1) Cek slug baru bentrok
      const existNew = await getDoc(doc(db, "works", slugState));
      if (existNew.exists()) {
        alert("Slug baru sudah dipakai. Gunakan slug lain.");
        setSaving(false);
        return;
      }

      // 2) Tulis dokumen BARU (tanpa merge)
      await setDoc(doc(db, "works", slugState), payload, { merge: false });

      // 3) Hapus dokumen LAMA agar tidak dobel
      await deleteDoc(doc(db, "works", initialSlug));

      // 4) Update ref slug awal
      initialSlugRef.current = slugState;
    } else {
      // Update biasa
      await setDoc(doc(db, "works", slugState), payload, { merge: true });
    }

    // Hapus pending deletion (gambar yang dihapus manual)
    const pending = Array.from(toDeleteRef.current);
    for (const url of pending) await deleteByUrl(url);
    toDeleteRef.current.clear();

    alert("Updated ✅");
    navigate("/work/manage");
  } catch (err) {
    console.error(err);
    setErr(err?.message || "Gagal memperbarui data.");
    alert("Gagal memperbarui. Cek console.");
  } finally {
    setSaving(false);
  }
};

// Karena deletion sudah dipindah ke dalam onSubmit (sebelum navigate),
// onSubmitWithDeletes cukup forward ke onSubmit saja.
const onSubmitWithDeletes = async (e) => {
  await onSubmit(e);
};


  // ====== PATCH: simpan URL yang harus dihapus ketika user menghapus slot (bukan replace) ======
  // Kita bungkus removeImage supaya kalau img punya existingUrl, kita tambahkan marker ke state khusus.
  const toDeleteRef = useRef(new Set()); // simpan kumpulan url untuk dihapus saat submit
  const removeImagePatched = (blockId, imgIdx) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        const nextImgs = block.images.map((img, i) => {
          if (i !== imgIdx) return img;
          if (img?.existingUrl) toDeleteRef.current.add(img.existingUrl);
          return null;
        });
        return { ...block, images: nextImgs };
      })
    );
  };

  // ganti pemanggilan removeImage di UI pakai removeImagePatched
  const removeImageUI = (blockId, imgIdx) => removeImagePatched(blockId, imgIdx);

  // saat submit, hapus semua yang ditandai
  useEffect(() => {
    // no-op; hanya dokumentasi internal
  }, []);



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Icon icon="eos-icons:loading" className="text-4xl text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Loading work details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <button 
            type="button" 
            onClick={() => navigate('/work/manage')}
            className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm font-medium mb-2 transition-colors"
          >
            <Icon icon="mdi:arrow-left" className="text-lg" />
            Back to Works
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Work</h1>
          <p className="text-sm text-slate-500 mt-1">Update your portfolio entry.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => {
              const el = document.getElementById('del-dialog');
              if(el) el.showModal();
            }}
            disabled={saving || deleting}
            className="px-5 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            Delete
          </button>
          <button 
            type="button"
            onClick={() => navigate('/work/manage')}
            className="px-5 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors disabled:opacity-50"
            disabled={saving || deleting}
          >
            Cancel
          </button>
          <button
            onClick={onSubmitWithDeletes}
            disabled={saving || deleting}
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

      {err && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
          <Icon icon="solar:danger-triangle-bold-duotone" className="text-xl shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{err}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Icon icon="solar:document-text-bold-duotone" className="text-xl text-blue-500" />
                Work Details
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 transition-colors"
                  placeholder="Enter project title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={slugState}
                  onChange={(e) => setSlugState(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 transition-colors font-mono"
                  placeholder="e.g. project-website"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">Saved as: <code>works/{slugState}</code></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 transition-colors"
                  placeholder="Tell us about this project..."
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Icon icon="solar:gallery-wide-bold-duotone" className="text-xl text-blue-500" />
                Content Blocks (Images)
              </h2>
              <span className="text-sm font-medium text-slate-500 bg-slate-200/50 px-3 py-1 rounded-lg">
                Used: {imagesUsed} / 10
              </span>
            </div>

            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => addBlock("single")}
                  disabled={remaining < 1}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Icon icon="solar:gallery-bold" className="text-lg" />
                  Add Single Image (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => addBlock("pair")}
                  disabled={remaining < 2}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Icon icon="solar:gallery-wide-bold" className="text-lg" />
                  Add Pair (2 Columns)
                </button>
              </div>

              <div className="space-y-6">
                {blocks.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-slate-500">
                    <Icon icon="solar:gallery-add-bold-duotone" className="mx-auto text-4xl mb-3 text-slate-400" />
                    <p className="text-sm">No image content yet.</p>
                    <p className="text-xs mt-1">Add a single or paired block above.</p>
                  </div>
                )}

                {blocks.map((block) => (
                  <div 
                    key={block.id} 
                    className={`block-card relative border rounded-xl p-4 bg-white transition-all shadow-sm
                    ${dragId === block.id ? "opacity-60 ring-2 ring-blue-500 scale-[.98]" : "border-slate-200"}
                    ${overId === block.id ? "ring-2 ring-dashed ring-slate-400" : ""}`}
                    draggable
                    onDragStart={(e) => onDragStartBlock(e, block.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => onDragEnterBlock(block.id)}
                    onDragLeave={() => setOverId(null)}
                    onDrop={() => setOverId(null)}
                  >
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                       <div 
                          className="flex items-center gap-2 text-slate-500 cursor-grab select-none hover:text-slate-800 transition-colors"
                          title="Drag to reorder"
                          draggable
                          onDragStart={(e) => onDragStartBlock(e, block.id)}
                        >
                          <Icon icon="solar:hamburger-menu-linear" className="text-lg" />
                          <span className="text-xs font-semibold uppercase tracking-wider">{block.type === 'pair' ? 'Pair Block' : 'Single Block'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md transition-colors"
                          title="Remove block"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" className="text-sm" />
                        </button>
                    </div>

                    <div className={`grid gap-4 ${block.type === 'pair' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                      {block.images.map((img, imgIdx) => (
                        <label 
                          key={imgIdx}
                          draggable={false}
                          className="relative flex flex-col items-center justify-center w-full aspect-[16/9] sm:h-56 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors overflow-hidden group"
                        >
                          {img ? (
                            <>
                              <img
                                src={img.preview}
                                alt="Block Preview"
                                className="absolute inset-0 object-cover w-full h-full pointer-events-none" 
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center.z-10">
                                <span className="text-white text-sm font-medium flex items-center gap-1">
                                  <Icon icon="solar:pen-bold" /> Change Image
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeImageUI(block.id, imgIdx);
                                }}
                                className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700 z-20"
                                title="Remove image"
                              >
                                <Icon icon="solar:trash-bin-trash-bold" />
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                              <Icon icon="solar:gallery-add-linear" className="text-3xl mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                              <p className="text-sm font-medium">Upload Image</p>
                              <p className="text-xs text-slate-400 mt-1">Click or drag here</p>
                            </div>
                          )}
                          <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            accept={ALLOWED_TYPES.join(",")}
                            onChange={(e) => handleImageUpload(e, block.id, imgIdx)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Meta & Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Icon icon="solar:settings-bold-duotone" className="text-lg text-slate-400" />
              Publishing
            </h3>
            
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
                <span className="block text-sm font-medium text-slate-900">Publish Work</span>
                <span className="block text-xs text-slate-500">Make it visible online</span>
              </div>
            </label>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Icon icon="solar:gallery-bold-duotone" className="text-lg text-slate-400" />
              Cover Image
            </h3>
            
            {coverPreview ? (
              <div className="relative rounded-xl overflow-hidden group border border-slate-200 mb-4 aspect-[4/3]">
                <img 
                  src={coverPreview} 
                  alt="Cover Preview" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); clearCover(); }}
                      className="bg-red-600/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-red-700 transition-colors"
                    >
                      <Icon icon="solar:trash-bin-trash-bold" /> Remove Image
                    </button>
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center w-full aspect-[4/3] border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors mb-4 group">
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
                  <Icon icon="solar:cloud-upload-linear" className="w-10 h-10 text-slate-400 mb-3 group-hover:text-blue-500 transition-colors" />
                  <p className="text-sm font-medium text-slate-600">Click or drag cover here</p>
                  <p className="text-xs text-slate-400 mt-2">JPG, PNG, WEBP (Max {MAX_IMAGE_SIZE_MB}MB)</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept={ALLOWED_TYPES.join(',')} 
                  onChange={onCoverChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Icon icon="solar:tag-bold-duotone" className="text-lg text-slate-400" />
              Tags
            </h3>
            
            <div className="relative mb-4" ref={boxRef}>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <Icon icon="solar:hashtag-bold" className="text-slate-400" />
                </div>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onFocus={() => setOpen(true)}
                  onKeyDown={onKeyDown}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block ps-9 p-3 transition-colors"
                  placeholder="Ketik lalu Enter..."
                />
              </div>

              {open && suggestions.length > 0 && (
                <ul className="absolute mt-2 max-h-56 overflow-auto text-sm text-slate-700 bg-white rounded-xl border border-slate-200 shadow-lg z-50 w-full py-1">
                  {suggestions.map((s) => (
                    <li
                      key={s}
                      onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                      className="px-4 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {tags.map((t, i) => (
                <span key={`${t}-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                  {t}
                  <button 
                    type="button" 
                    onClick={() => removeTag(i)}
                    className="text-blue-400 hover:text-blue-800 focus:outline-none"
                  >
                    <Icon icon="solar:close-circle-bold" />
                  </button>
                </span>
              ))}
              {tags.length === 0 && (
                <p className="text-sm text-slate-400 italic">No tags added yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Native Dialog) */}
      <dialog id="del-dialog" className="backdrop:bg-slate-900/50 open:animate-in open:fade-in open:zoom-in-95 rounded-2xl shadow-xl border border-slate-200 p-0 m-auto">
        <div className="bg-white w-full max-w-md">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="solar:danger-triangle-bold" className="text-3xl text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Project?</h3>
            <p className="text-slate-500 text-sm mb-6">
              This action cannot be undone. All data, images, and content for this project will be permanently removed.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                onClick={() => document.getElementById('del-dialog').close()}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                onClick={async () => {
                  await handleDelete();
                  const el = document.getElementById('del-dialog');
                  if (el) el.close();
                }}
                disabled={deleting}
              >
                {deleting && <Icon icon="eos-icons:loading" className="animate-spin" />}
                {deleting ? 'Deleting...' : 'Yes, Delete Project'}
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
};

// ID random buat block
function cryptoRandomId() {
  if (window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return Date.now() + "-" + arr[0];
  }
  return Date.now() + "-" + Math.random().toString(36).slice(2);
}

export default EditWork;
