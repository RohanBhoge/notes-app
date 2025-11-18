// src/seed/seed.js

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- MongoDB Connection ----
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/qpg";

await mongoose.connect(MONGO_URI);
console.log("✅ MongoDB connected");

// ---- Schema Definition ----
const QuestionSchema = new mongoose.Schema({
  exam: { type: String, required: true },
  standard: { type: String, required: true },
  subject: { type: String, required: true },
  chapter: { type: String, required: true },
  question: { type: String, required: true },
  question_latex: String,
  options: [String],
  answer: String,
  difficulty: { type: String, default: "medium" },
  marks: { type: Number, default: 1 },
  image_url: String
});

const Question = mongoose.model("Question", QuestionSchema);

// ---- Helper Function ----
const DATA_DIR = path.join(__dirname, "data");

function normalizeItems(raw, extras) {
  const arr = Array.isArray(raw) ? raw : (raw.questions || []);
  return arr.map(q => ({
    exam: extras.exam,
    standard: extras.standard,
    subject: extras.subject,
    chapter: q.chapter || extras.chapter || "General",
    question: q.question || "",
    question_latex: q.question_latex || "",
    options: q.options || [],
    answer: q.answer || "",
    difficulty: q.difficulty || "medium",
    marks: q.marks || 1,
    image_url: q.image_url || ""
  }));
}

async function loadOne(fileName, extras) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${fileName}`);
    return 0;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const docs = normalizeItems(raw, extras);
  await Question.insertMany(docs, { ordered: false });
  console.log(`✅ Inserted ${docs.length} from ${fileName}`);
  return docs.length;
}

try {
  await Question.deleteMany({ exam: "CET", standard: "11" });
  console.log("🧹 Cleared existing CET 11 data");

  let total = 0;
  total += await loadOne("gravitation.json", { exam: "CET", standard: "11", subject: "Physics" });
  total += await loadOne("laws_of_motion.json", { exam: "CET", standard: "11", subject: "Physics" });
  total += await loadOne("motion_in_plane.json", { exam: "CET", standard: "11", subject: "Physics" });

  console.log(`🎯 Total questions inserted: ${total}`);
} catch (err) {
  console.error("❌ Error during seeding:", err);
} finally {
  await mongoose.disconnect();
  console.log("🔌 MongoDB disconnected");
}
