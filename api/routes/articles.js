// server/routes/articles.js
import { Router } from 'express';
import Article from '../models/Article.js';
import { verifyFirebaseIdToken } from '../middleware/auth.js';

const router = Router();

// CREATE
router.post('/', verifyFirebaseIdToken, async (req, res) => {
  try {
    const { slug, title, description = "", coverUrl = "", tags = [], status = "Draft", content = "" } = req.body;

    if (!slug || !title) return res.status(400).json({ message: 'slug & title required' });

    const exist = await Article.findOne({ slug });
    if (exist) return res.status(409).json({ message: 'Slug sudah dipakai' });

    const publishedAt = (status === "Published") ? new Date() : null;

    const doc = await Article.create({ slug, title, description, coverUrl, tags, status, publishedAt, content });
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// LIST (client: pakai ?status=Published)
router.get('/', async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const rows = await Article.find(filter)
    .select('slug title description coverUrl tags status publishedAt createdAt')
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
      content = current.content,
      slug: incomingSlug, // abaikan
    } = req.body;

    let publishedAt = current.publishedAt;
    const toPublished = current.status !== "Published" && status === "Published";
    if (toPublished && !publishedAt) publishedAt = new Date();

    current.title = title;
    current.description = description;
    current.coverUrl = coverUrl;
    current.tags = tags;
    current.status = status;
    current.publishedAt = publishedAt;
    current.content = content;

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
