import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema({
  slug:        { type: String, required: true, unique: true, index: true },
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  coverUrl:    { type: String, default: "" },
  tags:        { type: [String], default: [] },
  status:      { type: String, enum: ["Draft", "Published"], default: "Draft" },
  publishedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Article', ArticleSchema);
