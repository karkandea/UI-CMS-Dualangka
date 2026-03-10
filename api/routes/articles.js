// server/routes/articles.js
import { Router } from 'express';
import Article from '../models/Article.js';
import { verifyFirebaseIdToken } from '../middleware/auth.js';

const router = Router();

function normalizeStatus(status, fallback = "Draft") {
  const value = String(status || "").toLowerCase();
  if (value === "published") return "Published";
  if (value === "draft") return "Draft";
  return fallback;
}

function normalizeLocalizedText(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      en: typeof value.en === "string" ? value.en.trim() : "",
      id: typeof value.id === "string" ? value.id.trim() : "",
    };
  }
  return fallback;
}

function normalizeTags(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((tag) => typeof tag === "string" && tag.trim() !== "");
  }

  if (value && typeof value === "object") {
    return {
      en: Array.isArray(value.en)
        ? value.en.filter((tag) => typeof tag === "string" && tag.trim() !== "")
        : [],
      id: Array.isArray(value.id)
        ? value.id.filter((tag) => typeof tag === "string" && tag.trim() !== "")
        : [],
    };
  }

  return fallback;
}

// CREATE
router.post('/', verifyFirebaseIdToken, async (req, res) => {
  try {
    const {
      slug,
      title,
      description = "",
      coverUrl = "",
      tags = [],
      status = "Draft",
      body,
      content = "",
    } = req.body;

    if (!slug || !title) return res.status(400).json({ message: 'slug & title required' });

    const exist = await Article.findOne({ slug });
    if (exist) return res.status(409).json({ message: 'Slug sudah dipakai' });

    const normalizedTitle = normalizeLocalizedText(title);
    const normalizedDescription = normalizeLocalizedText(description);
    const normalizedBody = normalizeLocalizedText(body ?? content);
    const normalizedTags = normalizeTags(tags);
    const normalizedStatus = normalizeStatus(status);
    const publishedAt = normalizedStatus === "Published" ? new Date() : null;

    const doc = await Article.create({
      slug,
      title: normalizedTitle,
      description: normalizedDescription,
      coverUrl,
      tags: normalizedTags,
      status: normalizedStatus,
      publishedAt,
      body: normalizedBody,
      content: normalizedBody,
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// LIST (client: pakai ?status=Published)
router.get('/', async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = normalizeStatus(status);
  const rows = await Article.find(filter)
    .select('slug title description coverUrl tags status publishedAt createdAt body content')
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean();
  res.json(rows);
});


// ✅ DETAIL (by slug) — WAJIB ADA INI
router.get('/:slug', async (req, res) => {
  try {
    const doc = await Article.findOne({ slug: req.params.slug }).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// UPDATE
router.put('/:slug', verifyFirebaseIdToken, async (req, res) => {
  try {
    const current = await Article.findOne({ slug: req.params.slug });
    if (!current) return res.status(404).json({ message: 'Not found' });

    const {
      title = current.title,
      description = current.description,
      coverUrl = current.coverUrl,
      tags = current.tags,
      status = current.status,
      body = current.body ?? current.content,
      content = current.content,
      slug: incomingSlug, // abaikan
    } = req.body;

    let publishedAt = current.publishedAt;
    const normalizedTitle = normalizeLocalizedText(title, current.title);
    const normalizedDescription = normalizeLocalizedText(description, current.description);
    const normalizedBody = normalizeLocalizedText(body ?? content, current.body ?? current.content);
    const normalizedTags = normalizeTags(tags, current.tags);
    const normalizedStatus = normalizeStatus(status, current.status);
    const toPublished = current.status !== "Published" && normalizedStatus === "Published";
    if (toPublished && !publishedAt) publishedAt = new Date();
    if (normalizedStatus !== "Published") publishedAt = null;

    current.title = normalizedTitle;
    current.description = normalizedDescription;
    current.coverUrl = coverUrl;
    current.tags = normalizedTags;
    current.status = normalizedStatus;
    current.publishedAt = publishedAt;
    current.body = normalizedBody;
    current.content = normalizedBody;

    await current.save();
    res.json(current);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// DELETE
router.delete('/:slug', verifyFirebaseIdToken, async (req, res) => {
  await Article.deleteOne({ slug: req.params.slug });
  res.json({ ok: true });
});

export default router;
