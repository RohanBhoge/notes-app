import { Router } from "express";
import Question from "../../models/Question.js";

const router = Router();

const doShuffle = truthy(req.query.shuffle);
const seedParam = req.query.seed;

let result = filtered.slice();
if (doShuffle) {
  const seed = seedParam ?? `${Date.now()}`;
  seededShuffle(result, seed);
  res.setHeader("X-Shuffle-Seed", seed);
}

// optional limit still applies (your existing slice is fine)
result = result.slice(0, Math.min(parseInt(limit) || 200, 1000));

// build plain text from `result` (keep your existing rendering code)
let out = "";
result.forEach((q, i) => {
  out += `#${i + 1} [${q.chapter}]${q.difficulty ? ` [${q.difficulty}]` : ""}${
    q.marks ? ` [${q.marks} mark${q.marks > 1 ? "s" : ""}]` : ""
  }\n`;
  out += `Q: ${q.question}\n`;
  if (Array.isArray(q.options) && q.options.length) {
    q.options.forEach(
      (opt, idx) => (out += `   ${String.fromCharCode(65 + idx)}. ${opt}\n`)
    );
  }
  if (q.answer) out += `Ans: ${q.answer}\n`;
  out += `\n`;
});

res
  .type("text/plain")
  .send(out || "No questions found for the given filters.\n");

router.get("/", async (req, res) => {
  try {
    const {
      exam,
      standard,
      subject,
      chapter,
      difficulty,
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    const q = {};
    if (exam) q.exam = exam;
    if (standard) q.standard = standard;
    if (subject) q.subject = subject;
    if (chapter) q.chapter = chapter;
    if (difficulty) q.difficulty = difficulty;

    const numericLimit = Math.min(Number(limit) || 20, 100);
    const numericPage = Math.max(Number(page) || 1, 1);

    let mongoQuery = Question.find(q);

    if (search.trim()) {
      mongoQuery = Question.find({
        ...q,
        $text: { $search: search.trim() },
      });
    }

    const [items, total] = await Promise.all([
      mongoQuery
        .sort({ chapter: 1, _id: 1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit),
      Question.countDocuments(
        search.trim() ? { ...q, $text: { $search: search.trim() } } : q
      ),
    ]);

    res.json({
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit),
      items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

router.get("/chapters", async (req, res) => {
  try {
    const { exam, standard, subject } = req.query;
    const q = {};
    if (exam) q.exam = exam;
    if (standard) q.standard = standard;
    if (subject) q.subject = subject;

    const chapters = await Question.distinct("chapter", q);
    chapters.sort();
    res.json({ chapters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load chapters" });
  }
});

export default router;
