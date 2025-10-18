import { Router } from 'express';
import Article from '../models/Article.js';
import { verifyFirebaseIdToken } from '../middleware/auth.js';

const router = Router();

// CREATE
router.post('/', verifyFirebaseIdToken, async (req, res) => {
  try {
    const { slug, title, description = "", coverUrl = "", tags = [], status = "Draft" } = req.body;

    if (!slug || !title) return res.status(400).json({ message: 'slug & title required' });

    const exist = await Article.findOne({ slug });
    if (exist) return res.status(409).json({ message: 'Slug sudah dipakai' });

    const publishedAt = (status === "Published") ? new Date() : null;

    const doc = await Article.create({ slug, title, description, coverUrl, tags, status, publishedAt });
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
  const rows = await Article.find(filter).sort({ publishedAt: -1, createdAt: -1 });
  res.json(rows);
});

// DETAIL (by slug)
router.get('/:slug', async (req, res) => {
  const doc = await Article.findOne({ slug: req.params.slug });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
});

// UPDATE (slug tidak boleh diubah)
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
      slug: incomingSlug, // kalau dikirim, abaikan (tidak boleh ubah)
    } = req.body;

    // publishedAt: set ONLY on first transition Draft->Published
    let publishedAt = current.publishedAt;
    const toPublished = current.status !== "Published" && status === "Published";
    if (toPublished && !publishedAt) publishedAt = new Date();

    current.title = title;
    current.description = description;
    current.coverUrl = coverUrl;
    current.tags = tags;
    current.status = status;
    current.publishedAt = publishedAt;

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
