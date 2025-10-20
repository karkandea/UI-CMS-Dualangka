import { useState, useEffect, useMemo, useRef } from "react";
import { doc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import {ref as sref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "../../firebase";
import { Icon } from "@iconify/react";


const MAX_IMAGE_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];


const AddNewWork = () => {
  const [saving, setSaving] = useState(false);



  // === List Image Porto ===
  const [overId, setOverId] = useState(null);

  const [blocks, setBlocks] = useState([]);          // [{ id, type: 'single'|'pair', images: [null]|[null,null] }]
  const [dragId, setDragId] = useState(null);
  const [imagesUsed, setImagesUsed] = useState(0);

  // imagesUsed DIHITUNG OTOMATIS dari blocks (cover nggak dihitung di sini)
  useEffect(() => {
    const used = blocks.reduce((acc, b) => acc + b.images.filter(Boolean).length, 0);
    setImagesUsed(used);
  }, [blocks]);

  // Tambah blok (batasi sesuai sisa kuota gambar)
  const addBlock = (type) => {
    const need = type === "pair" ? 2 : 1;
    const remaining = 10 - imagesUsed;
    if (remaining < need) {
      alert(`Butuh ${need} slot kosong. Sisa: ${remaining}`);
      return;
    }
    setBlocks(prev => [
      ...prev,
      { id: Date.now() + Math.random(), type, images: type === "pair" ? [null, null] : [null] }
    ]);
  };

  // Hapus blok (cancel add). Counter update otomatis via useEffect di atas.
  const removeBlock = (blockId) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  // Upload ke slot (JANGAN update imagesUsed manual—otomatis via useEffect)
  const handleImageUpload = (e, blockId, imgIdx) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setBlocks(prev =>
        prev.map(block =>
          block.id === blockId
            ? {
                ...block,
                images: block.images.map((img, i) =>
                  i === imgIdx ? { file, preview: reader.result } : img
                )
              }
            : block
        )
      );
    };
    reader.readAsDataURL(file);
  };

  // Hapus gambar dari slot (JANGAN update imagesUsed manual—otomatis via useEffect)
  const removeImage = (blockId, imgIdx) => {
    setBlocks(prev =>
      prev.map(block =>
        block.id === blockId
          ? { ...block, images: block.images.map((img, i) => (i === imgIdx ? null : img)) }
          : block
      )
    );
  };

  // Hover-swap: begitu masuk ke kartu lain, langsung tukeran posisi
const onDragEnterBlock = (targetId) => {
  if (!dragId || dragId === targetId) return;
  setBlocks(prev => {
    const srcIdx = prev.findIndex(b => b.id === dragId);
    const dstIdx = prev.findIndex(b => b.id === targetId);
    if (srcIdx === -1 || dstIdx === -1) return prev;
    const next = [...prev];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(dstIdx, 0, moved);
    return next;
  });
  setOverId(targetId);
};


  // Drag & drop antar blok
  const onDragStartBlock = (e, id) => {
  setDragId(id);

  // cari kartu terdekat
  const card = e.currentTarget.closest(".block-card");
  if (!card) return;

  // clone jadi ghost
  const ghost = card.cloneNode(true);
  ghost.style.position = "fixed";
  ghost.style.top = "-1000px";
  ghost.style.left = "-1000px";
  ghost.style.width = `${card.offsetWidth}px`;
  ghost.style.pointerEvents = "none";
  ghost.classList.add("opacity-90","scale-95","shadow-2xl","rounded-lg","overflow-hidden");
  document.body.appendChild(ghost);

  // drag image + data
  e.dataTransfer.setDragImage(ghost, card.offsetWidth / 2, card.offsetHeight / 2);
  e.dataTransfer.setData("text/plain", String(id));

  // cleanup
  requestAnimationFrame(() => {
    document.body.removeChild(ghost);
  });
};



  // Sisa slot global
  const remaining = 10 - imagesUsed;

  // === BASIC FORM ===
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState(""); // slug manual (as you prefer)
  const [description, setDescription] = useState("");

  // === Cover Upload ===
  const fileInputRef = useRef(null);
  const clearCover = () => {
    // kosongin state + input file
    setCoverFile(null);
    setCoverPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // === Publish switch (controlled) ===
  const [isPublished, setIsPublished] = useState(false);

  // === Cover upload (state + preview + validation) ===
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");

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

  // === Images counter (content blocks not implemented yet; counter placeholder) ===
  // Cover TIDAK dihitung sesuai keputusan kamu.
  

  // === TAGS (KEEP your source: d.data().tag) ===
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);        // selected tags
  const [allTags, setAllTags] = useState([]);  // history from DB
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "works"));
      // IMPORTANT: keep "tag" (not "tags") to match your current DB
      const arr = snap.docs.flatMap((d) => d.data().tag || []);
      const unique = [...new Set(arr.map((t) => (t || "").trim()))]
        .filter(Boolean)
        .sort();
      setAllTags(unique);
    })();
  }, []);

  const suggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    return allTags
      .filter((t) => !tags.includes(t))
      .filter((t) => !q || t.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allTags, tags, tagInput]);

  const addTag = (t) => {
    const v = (t || "").trim();
    if (!v) return;
    if (!tags.includes(v)) setTags((prev) => [...prev, v]);
    // keep optional enrichment of local suggestions (doesn't affect Firestore)
    if (!allTags.includes(v)) setAllTags((prev) => [...prev, v].sort());
    setTagInput("");
  };

  const removeTag = (i) => setTags((prev) => prev.filter((_, idx) => idx !== i));

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Escape") setOpen(false);
  };

  // close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // single submit; status derived from switch
const onSubmit = async (e) => {
  e.preventDefault();
  if (saving) return;         // cegah double click
  if (!title || !slug) {
    alert("Title & slug wajib diisi");
    return;
  }
  if (imagesUsed > 10) {
    alert("Maksimal 10 gambar di content blocks.");
    return;
  }

  setSaving(true);
  try {
    const status = isPublished ? "Published" : "Draft";
    const postedAt = isPublished ? serverTimestamp() : null;

    // 1) cover
    let coverUrl = "";
    if (coverFile) {
      coverUrl = await uploadFile(`works/${slug}/cover.${fileExt(coverFile)}`, coverFile);
    }

    // 2) blocks
    const blocksPayload = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const urls = [];
      for (let j = 0; j < b.images.length; j++) {
        const img = b.images[j];
        if (img?.file) {
          const path = `works/${slug}/blocks/b${i}-s${j}-${Date.now()}.${fileExt(img.file)}`;
          const url = await uploadFile(path, img.file);
          urls.push(url);
        }
      }
      if (urls.length > 0) blocksPayload.push({ type: b.type, images: urls });
    }

    // 3) save
    const payload = {
      title,
      slug,
      description,
      tag: tags,
      status,
      postedAt,
      coverUrl,
      blocks: blocksPayload,
    };
    await setDoc(doc(db, "works", slug), payload, { merge: true });

    alert(`Saved as ${status}`);
    // opsional: reset form / navigate
  } catch (err) {
    console.error(err);
    alert("Gagal menyimpan. Cek console.");
  } finally {
    setSaving(false);
  }
};




  const fileExt = (f) => (f?.name?.split(".").pop() || "jpg").toLowerCase();

const uploadFile = async (path, file) => {
  const r = sref(storage, path);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
};





  return (
    <>
      <form className="max-w-sm mx-auto" onSubmit={onSubmit}>
        {/* Title */}
        <div className="mb-5">
          <label
            htmlFor="title"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Title
          </label>
          <input
            type="text"
            id="title" // unique
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500
                       focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600
                       dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Masukan Judul Project"
            required
          />
        </div>

        {/* Slug (manual) */}
        <div className="mb-5">
          <label
            htmlFor="slug"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Slug
          </label>
          <input
            type="text"
            id="slug" // unique
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500
                       focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600
                       dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="contoh: project-website"
            required
          />
        </div>

        {/* Deskripsi */}
        <div className="mb-5">
          <label
            htmlFor="description"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Deskripsi
          </label>
          <input
            type="text"
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

        {/* TAGS (history from Firestore .tag as requested) */}
        <div ref={boxRef} className="mb-5 relative">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Tags
          </label>

          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Ketik lalu Enter…"
            className="w-full rounded-lg border p-2.5 text-black"
          />

          {/* chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <span
                key={t}
                className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 flex items-center gap-2"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  className="font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* dropdown suggestions (absolute) */}
          {open && suggestions.length > 0 && (
            <ul className="absolute mt-2 max-h-56 overflow-auto text-black rounded-md border bg-white shadow z-10 w-full">
              {suggestions.map((s) => (
                <li
                  key={s}
                  onMouseDown={() => addTag(s)} // keep onMouseDown trick
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Publish switch (controlled) */}
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
          ></div>
          <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Publish</span>
        </label>

        {/* Cover upload (preview) */}
        <div className="mb-5">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Cover
          </label>

          {coverPreview && (
            <div className="mb-3 relative group">
              {/* gambar */}
              <img
                src={coverPreview}
                alt="Cover preview"
                className="w-full h-64 object-cover rounded-lg border"
              />

              {/* blanket gelap saat hover */}
              <div className="absolute inset-0 rounded-lg bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10" />

              {/* tombol delete di tengah */}
              <button
                type="button"
                onClick={clearCover}
                className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
                aria-label="Remove cover image"
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
              <svg
                className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
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

        {/* Content Blocks header + toolbar (text fixes only) */}
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

<div className="mt-2 text-xs text-gray-500">
  Images used: {imagesUsed} / 10
</div>

            <div className="space-y-6 mt-6">
              {blocks.map((block, blockIdx) => (
                <div 
                key={block.id} 
                className={`block-card relative border rounded-lg p-4 bg-white dark:bg-gray-800 transition
              ${dragId === block.id ? "opacity-60 ring-2 ring-blue-500 scale-[.98]" : ""}
              ${overId === block.id ? "ring-2 ring-dashed ring-gray-400" : ""}`}
                  draggable
                  onDragStart={(e) => onDragStartBlock(e, block.id)}
                  onDragOver={(e) => e.preventDefault()}      // wajib biar bisa terima drag
                  onDragEnter={() => onDragEnterBlock(block.id)}
                  onDragLeave={() => setOverId(null)}
                  onDrop={() => setOverId(null)}
                >
                  <div 
                  className="absolute left-2 top-2 z-30 text-gray-500 cursor-grab select-none
                            bg-white/70 backdrop-blur px-2 rounded"
                  title="Drag to reorder"
                  draggable
                  onDragStart={() => onDragStartBlock(block.id)}
                  >⋮⋮</div>
                    {/* tombol Cancel block */}
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="absolute right-3 top-3 z-30 text-gray-400 hover:text-red-500"
                    title="Remove this block"
                  >
                    Cancel
                  </button>

                  {/*grid slot upload*/}
                  <div className={`grid ${block.type === 'pair' ? 'grid-cols-2 gap-4' : ''}`}>
                    {block.images.map((img, imgIdx) => (
                      <label 
                        key={imgIdx}
                        draggable={false}
                        className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                {img ? (
          <>
            <img
              src={img.preview}
              alt=""
              className="absolute inset-0 object-cover w-full h-full rounded-lg pointer-events-none" // label yg nerima click
            />
            <div className="absolute inset-0 rounded-lg bg-black/45 opacity-0 hover:opacity-100 transition-opacity duration-200 z-10" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeImage(block.id, imgIdx);
              }}
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

        {/* Actions: single submit (status from switch) */}
        <div className="flex flex-row gap-4 mt-8">
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
            {saving ? "Menyimpan..." : "Simpan"}
          </button>

        </div>
      </form>
    </>
  );
};

export default AddNewWork;
