// src/pages/EditWork.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, getDoc, setDoc, collection, getDocs, serverTimestamp, deleteDoc
} from "firebase/firestore";
import {
  ref as sref, uploadBytes, getDownloadURL, deleteObject, ref, listAll
} from "firebase/storage";
import { db, storage } from "../../firebase";
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
  const r = sref(storage, path);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
};

/**
 * Delete by https:// URL yang sudah disimpan di Firestore
 * Firebase v9 modular mendukung `ref(storage, url)` untuk https:// dan gs://
 */
const deleteByUrl = async (url) => {
  if (!url) return;
  try {
    const r = ref(storage, url);
    await deleteObject(r);
  } catch (e) {
    // Kalau file sudah tidak ada, biarkan lewat
    if (import.meta.env.DEV) console.warn("Delete skipped:", e?.code || e?.message);
  }
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


  const deleteFolderRecursive = async (folderPath) => {
  const dirRef = sref(storage, folderPath);
  const { items, prefixes } = await listAll(dirRef);
  // hapus file
  await Promise.all(items.map((itemRef) => deleteObject(itemRef).catch(() => {})));
  // rekursif ke subfolder
  for (const p of prefixes) {
    await deleteFolderRecursive(p.fullPath);
  }
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
  const removeImage = (blockId, imgIdx) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, images: block.images.map((img, i) => (i === imgIdx ? null : img)) }
          : block
      )
    );
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
      <div className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-gray-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"/>
          </svg>
          Loading data…
        </div>
      </div>
    );
  }

  return (
    <>
      <form className="max-w-sm mx-auto" onSubmit={onSubmitWithDeletes}>
        <h1 className="text-xl font-semibold text-black mb-4">Edit Work</h1>
        {err && <p className="text-red-600 text-sm mb-3">{err}</p>}

        {/* Title */}
        <div className="mb-5">
          <label htmlFor="title" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500
                       focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600
                       dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Masukan Judul Project"
            required
          />
        </div>

        {/* Slug */}
        <div className="mb-5">
          <label htmlFor="slug" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Slug
          </label>
          <input
            id="slug"
            value={slugState}
            onChange={(e) => setSlugState(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500
                       focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600
                       dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="contoh: project-website"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Dokumen akan disimpan sebagai <code>works/{slugState}</code>.</p>
        </div>

        {/* Deskripsi */}
        <div className="mb-5">
          <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Deskripsi
          </label>
          <input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500
                       focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600
                       dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Masukan Deskripsi Project"
            required
          />
        </div>

        {/* TAGS */}
        <div ref={boxRef} className="mb-5 relative">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tags</label>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Ketik lalu Enter…"
            className="w-full rounded-lg border p-2.5 text-black"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <span key={`${t}-${i}`} className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 flex items-center gap-2">
                {t}
                <button type="button" onClick={() => removeTag(i)} className="font-bold">×</button>
              </span>
            ))}
          </div>
          {open && suggestions.length > 0 && (
            <ul className="absolute mt-2 max-h-56 overflow-auto text-black rounded-md border bg-white shadow z-10 w-full">
              {suggestions.map((s) => (
                <li key={s} onMouseDown={() => addTag(s)} className="px-3 py-2 cursor-pointer hover:bg-gray-100">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Publish switch */}
        <label className="inline-flex items-center cursor-pointer mb-6">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <div
            className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300
                       dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700
                       peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                       peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px]
                       after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                       dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"
          />
          <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Publish</span>
        </label>

        {/* Cover upload */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cover</label>

          {coverPreview && (
            <div className="mb-3 relative group">
              <img src={coverPreview} alt="Cover preview" className="w-full h-64 object-cover rounded-lg border" />
              <div className="absolute inset-0 rounded-lg bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10" />
              <button
                type="button"
                onClick={clearCover}
                className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
                title="Remove cover image"
              >
                <Icon className="text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" icon="material-symbols:delete" />
              </button>
            </div>
          )}

          <label
            htmlFor="dropzone-file"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed
                       rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100
                       dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" viewBox="0 0 20 16" fill="none">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
              </svg>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                JPG, PNG, WEBP, GIF (Max {MAX_IMAGE_SIZE_MB}MB)
              </p>
            </div>
            <input
              id="dropzone-file"
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              onChange={onCoverChange}
              className="hidden"
              ref={fileInputRef}
            />
          </label>
        </div>

        {/* Content Blocks */}
        <div className="flex-row items-center justify-center w-full mt-8">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Content Blocks — max 10 images
          </label>

          <button
            type="button"
            onClick={() => addBlock("single")}
            disabled={remaining < 1}
            className="flex w-full items-center justify-center gap-1.5 py-2.5 px-5 me-2 mb-2 text-sm font-medium
                       text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100
                       hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
                       dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
          >
            <Icon icon="material-symbols:exposure-plus-1" />
            Single (16:9)
          </button>

          <button
            type="button"
            onClick={() => addBlock("pair")}
            disabled={remaining < 2}
            className="flex w-full items-center justify-center gap-1.5 py-2.5 px-5 me-2 mb-2 text-sm font-medium
                       text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100
                       hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
                       dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
          >
            <Icon icon="material-symbols:exposure-plus-1" />
            Pair (2-column)
          </button>

          <div className="mt-2 text-xs text-gray-500">Images used: {imagesUsed} / 10</div>

          <div className="space-y-6 mt-6">
            {blocks.map((block) => (
              <div
                key={block.id}
                className={`block-card relative border rounded-lg p-4 bg-white dark:bg-gray-800 transition
                  ${dragId === block.id ? "opacity-60 ring-2 ring-blue-500 scale-[.98]" : ""}
                  ${overId === block.id ? "ring-2 ring-dashed ring-gray-400" : ""}`}
                draggable
                onDragStart={(e) => onDragStartBlock(e, block.id)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => onDragEnterBlock(block.id)}
                onDragLeave={() => setOverId(null)}
                onDrop={() => setOverId(null)}
              >
                <div
                  className="absolute left-2 top-2 z-30 text-gray-500 cursor-grab select-none
                            bg-white/70 backdrop-blur px-2 rounded"
                  title="Drag to reorder"
                  draggable
                  onDragStart={(e) => onDragStartBlock(e, block.id)}
                >⋮⋮</div>

                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="absolute right-3 top-3 z-30 text-gray-400 hover:text-red-500"
                  title="Remove this block"
                >
                  Cancel
                </button>

                <div className={`grid ${block.type === "pair" ? "grid-cols-2 gap-4" : ""}`}>
                  {block.images.map((img, imgIdx) => (
                    <label
                      key={imgIdx}
                      draggable={false}
                      className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      {img ? (
                        <>
                          <img
                            src={img.preview}
                            alt=""
                            className="absolute inset-0 object-cover w-full h-full rounded-lg pointer-events-none"
                          />
                          <div className="absolute inset-0 rounded-lg bg-black/45 opacity-0 hover:opacity-100 transition-opacity duration-200 z-10" />
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImageUI(block.id, imgIdx); }}
                            className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
                            title="Remove image"
                          >
                            <Icon icon="material-symbols:delete" className="text-white text-3xl" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <Icon icon="material-symbols:add-photo-alternate-outline" className="text-3xl mb-2" />
                          <p className="text-sm">Upload Image</p>
                        </div>
                      )}

                      <input
                        type="file"
                        className="hidden"
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

        {/* Actions */}
        <div className="flex flex-row gap-3 mt-8">
          <button
            type="submit"
            disabled={saving}
            aria-busy={saving}
            className={`inline-flex items-center justify-center gap-2
                        text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300
                        font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center
                        dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800
                        disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"/>
              </svg>
            )}
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          <button
          type="button"
          command="show-modal"
          commandfor="del-dialog"
          disabled={saving || deleting}
          className="inline-flex items-center justify-center gap-2 text-red-700 bg-white border-red-300 hover:bg-red-50 focus:ring-4 focus:outline-none focus:ring-red-100 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 disabled:cursor-not-allowed"
          >Hapus</button>
        </div>
        {/* Modal konfirmasi hapus */}
        <el-dialog>
        <dialog id="del-dialog" aria-labelledby="del-dialog-title"
            className="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent">
            <el-dialog-backdrop className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"></el-dialog-backdrop>

        <div tabIndex={0} className="flex min-h-full items-end justify-center p-4 text-center focus:outline-none sm:items-center sm:p-0">
        <el-dialog-panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
        <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-6 text-red-600">
        <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
        <h3 id="del-dialog-title" className="text-base font-semibold text-gray-900">Hapus proyek ini?</h3>
        <div className="mt-2">
        <p className="text-sm text-gray-600">
        Tindakan ini akan menghapus data proyek, cover, dan seluruh gambar konten dari server.
        Proses ini <span className="font-semibold">tidak bisa dibatalkan</span>.
        </p>
        </div>
        </div>
        </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
        {/* Konfirmasi hapus */}
        <button
        type="button"
        onClick={handleDelete}
        command="close" commandfor="del-dialog"
        disabled={deleting}
        className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 disabled:opacity-60 sm:ml-3 sm:w-auto"
        >
        {deleting ? "Menghapus..." : "Hapus"}
        </button>
        {/* Batal */}
        <button
        type="button"
        command="close" commandfor="del-dialog"
        disabled={deleting}
        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
        >
        Batal
        </button>
        </div>
        </el-dialog-panel>
        </div>
        </dialog>
        </el-dialog>
      </form>
    </>
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
