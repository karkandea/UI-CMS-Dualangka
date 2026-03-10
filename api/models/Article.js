import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema({
  slug:        { type: String, required: true, unique: true, index: true },
  title:       { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: mongoose.Schema.Types.Mixed, default: "" },
  coverUrl:    { type: String, default: "" },
  tags:        { type: mongoose.Schema.Types.Mixed, default: [] },
  status:      { type: String, enum: ["Draft", "Published"], default: "Draft" },
  publishedAt: { type: Date, default: null },
  body:        { type: mongoose.Schema.Types.Mixed, default: "" },
  content:     { type: mongoose.Schema.Types.Mixed, default: "" },
}, { timestamps: true });

export default mongoose.model('Article', ArticleSchema);
