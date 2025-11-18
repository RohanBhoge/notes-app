// D:\QPG\backend\src\routes\textJson.routes.js
import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dataStore } from "../../../data/answer_key.js";

const router = Router();

// --- locate data folder (supports either /data or /src/seed/data) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIRS = [
  path.join(BACKEND_ROOT, "data"),
  path.join(BACKEND_ROOT, "src", "seed", "data"),
];
/** Convert ONLY math-y tokens; never touch plain English.
 * Triggers only if the string contains '\' or '$'.
 * Handles glued commands (\cos\theta), \frac, ^, _ and the \thη OCR glitch.
 */
function convertMathTokens(input = "") {
  if (input == null) return "";
  const original = String(input);

  // Fast path: not math-like? return as-is.
  if (!/[\\$]/.test(original)) return original;

  let s = original;

  // strip math wrappers + zero-width chars
  s = s.replace(/\\\(|\\\)|\\\[|\\\]|^\$|\$$/g, "");
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // OCR repairs for theta (\thη, \th eta, etc.)
  s = s.replace(/\\th[\s\u200B-\u200D\uFEFF]*η/gi, "\\theta");
  s = s.replace(/\\th[\s\u200B-\u200D\uFEFF]*eta/gi, "\\theta");
  s = s.replace(/\\thet[\s\u200B-\u200D\uFEFF]*a/gi, "\\theta");
  s = s.replace(
    /\\th[\s\u200B-\u200D\uFEFF]*e[\s\u200B-\u200D\uFEFF]*t[\s\u200B-\u200D\uFEFF]*a/gi,
    "\\theta"
  );

  // \frac{a}{b} -> (a)/(b)
  s = s.replace(/\\frac\s*{([^}]*)}\s*{([^}]*)}/g, "($1)/($2)");

  // superscripts/subscripts (minimal, math-only)
  s = s.replace(
    /([A-Za-z0-9])\^\{([^}]+)\}/g,
    (_, a, b) => a + b.split("").map(superscript).join("")
  );
  s = s.replace(
    /([A-Za-z0-9])\^([A-Za-z0-9])/g,
    (_, a, b) => a + superscript(b)
  );
  s = s.replace(
    /([A-Za-z])_\{([^}]+)\}/g,
    (_, a, b) => a + b.split("").map(subscript).join("")
  );
  s = s.replace(/([A-Za-z])_([A-Za-z0-9])/g, (_, a, b) => a + subscript(b));

  // functions/operators/greek — replace regardless of adjacency (\cos\theta)
  const CMDS = {
    // functions
    "\\sin": "sin",
    "\\cos": "cos",
    "\\tan": "tan",
    "\\cot": "cot",
    "\\sec": "sec",
    "\\csc": "csc",
    "\\log": "log",
    "\\ln": "ln",
    "\\sqrt": "√",
    // operators/relations
    "\\times": "×",
    "\\cdot": "·",
    "\\div": "÷",
    "\\pm": "±",
    "\\mp": "∓",
    "\\leq": "≤",
    "\\geq": "≥",
    "\\neq": "≠",
    "\\approx": "≈",
    "\\propto": "∝",
    "\\infty": "∞",
    "\\degree": "°",
    "\\deg": "°",
    "\\%": "%",
    // greek lowercase
    "\\alpha": "α",
    "\\beta": "β",
    "\\gamma": "γ",
    "\\delta": "δ",
    "\\epsilon": "ε",
    "\\zeta": "ζ",
    "\\eta": "η",
    "\\theta": "θ",
    "\\iota": "ι",
    "\\kappa": "κ",
    "\\lambda": "λ",
    "\\mu": "μ",
    "\\nu": "ν",
    "\\xi": "ξ",
    "\\pi": "π",
    "\\rho": "ρ",
    "\\sigma": "σ",
    "\\tau": "τ",
    "\\phi": "φ",
    "\\chi": "χ",
    "\\psi": "ψ",
    "\\omega": "ω",
    // greek uppercase
    "\\Gamma": "Γ",
    "\\Delta": "Δ",
    "\\Theta": "Θ",
    "\\Lambda": "Λ",
    "\\Xi": "Ξ",
    "\\Pi": "Π",
    "\\Sigma": "Σ",
    "\\Phi": "Φ",
    "\\Psi": "Ψ",
    "\\Omega": "Ω",
  };
  for (const [cmd, val] of Object.entries(CMDS)) {
    s = s.replace(new RegExp(cmd, "g"), val);
  }

  // keep spacing; just drop stray braces from math
  s = s.replace(/[{}]/g, "");
  return s;
}

// tiny maps used above
function superscript(ch) {
  const map = {
    0: "⁰",
    1: "¹",
    2: "²",
    3: "³",
    4: "⁴",
    5: "⁵",
    6: "⁶",
    7: "⁷",
    8: "⁸",
    9: "⁹",
    "+": "⁺",
    "-": "⁻",
    "=": "⁼",
    n: "ⁿ",
    i: "ⁱ",
  };
  return map[ch] || "^" + ch;
}
function subscript(ch) {
  const map = {
    0: "₀",
    1: "₁",
    2: "₂",
    3: "₃",
    4: "₄",
    5: "₅",
    6: "₆",
    7: "₇",
    8: "₈",
    9: "₉",
    x: "ₓ",
    y: "ᵧ",
    r: "ᵣ",
    i: "ᵢ",
    n: "ₙ",
  };
  return map[ch] || "_" + ch;
}

/* ===========================
   MINIMAL SYMBOL CONVERTER
   =========================== */
/**
 * Convert only LaTeX SPECIAL TOKENS into symbols (and functions into plain words).
 * - Does NOT convert fractions, superscripts, subscripts, etc.
 * - Does NOT touch normal English words.
 * - Repairs OCR like \thη -> \theta, then \theta -> θ
 */
/**
 * Convert ONLY LaTeX commands (starting with backslash) to symbols/words.
 * - Never touches plain English (early return if no backslash).
 * - Handles glued commands like \cos\theta.
 * - Repairs OCR like \thη -> \theta before mapping.
 */
function convertSpecialTokens(input = "") {
  if (input == null) return "";
  let s = String(input);

  // Fast path: if there’s no backslash at all, it’s plain English — do nothing.
  if (!/\\/.test(s)) return s;

  // Remove math wrappers but keep inner text; strip zero-width chars that break patterns
  s = s.replace(/\\\(|\\\)|\\\[|\\\]|^\$|\$$/g, "");
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // OCR/spacing repairs for theta (ONLY when command starts with \th…)
  s = s.replace(/\\th[\s\u200B-\u200D\uFEFF]*η/gi, "\\theta");
  s = s.replace(/\\th[\s\u200B-\u200D\uFEFF]*eta/gi, "\\theta");
  s = s.replace(/\\thet[\s\u200B-\u200D\uFEFF]*a/gi, "\\theta");
  s = s.replace(
    /\\th[\s\u200B-\u200D\uFEFF]*e[\s\u200B-\u200D\uFEFF]*t[\s\u200B-\u200D\uFEFF]*a/gi,
    "\\theta"
  );

  // Helper: replace a command only when it’s a proper LaTeX token:
  // - Must start with backslash
  // - Next characters are the exact command name
  // - The character after the command is NOT a letter (so we don’t gobble into words)
  const replaceCmd = (text, cmd, repl) =>
    text.replace(new RegExp(`${cmd}(?![A-Za-z])`, "g"), repl);

  // Functions (to plain words/symbol), operators/relations, Greek letters.
  // NOTE: Keys include the leading backslash.
  const CMDS = {
    // functions
    "\\sin": "sin",
    "\\cos": "cos",
    "\\tan": "tan",
    "\\cot": "cot",
    "\\sec": "sec",
    "\\csc": "csc",
    "\\log": "log",
    "\\ln": "ln",
    "\\sqrt": "√",

    // operators/relations
    "\\times": "×",
    "\\cdot": "·",
    "\\div": "÷",
    "\\pm": "±",
    "\\mp": "∓",
    "\\leq": "≤",
    "\\geq": "≥",
    "\\neq": "≠",
    "\\approx": "≈",
    "\\propto": "∝",
    "\\infty": "∞",
    "\\degree": "°",
    "\\deg": "°",
    "\\%": "%",

    // greek lowercase
    "\\alpha": "α",
    "\\beta": "β",
    "\\gamma": "γ",
    "\\delta": "δ",
    "\\epsilon": "ε",
    "\\zeta": "ζ",
    "\\eta": "η",
    "\\theta": "θ",
    "\\iota": "ι",
    "\\kappa": "κ",
    "\\lambda": "λ",
    "\\mu": "μ",
    "\\nu": "ν",
    "\\xi": "ξ",
    "\\pi": "π",
    "\\rho": "ρ",
    "\\sigma": "σ",
    "\\tau": "τ",
    "\\phi": "φ",
    "\\chi": "χ",
    "\\psi": "ψ",
    "\\omega": "ω",

    // greek uppercase
    "\\Gamma": "Γ",
    "\\Delta": "Δ",
    "\\Theta": "Θ",
    "\\Lambda": "Λ",
    "\\Xi": "Ξ",
    "\\Pi": "Π",
    "\\Sigma": "Σ",
    "\\Phi": "Φ",
    "\\Psi": "Ψ",
    "\\Omega": "Ω",
  };

  // Apply replacements. This handles glued sequences like \cos\theta as two passes.
  for (const [cmd, val] of Object.entries(CMDS)) {
    s = replaceCmd(s, cmd, val);
  }

  // DO NOT remove braces or collapse spaces here — keep English untouched.
  return s;
}

/* ===========================
   LOADING + NORMALIZATION
   =========================== */
function resolveDataDir() {
  for (const dir of DATA_DIRS) if (fs.existsSync(dir)) return dir;
  return null;
}

function normalizeArray(raw, sourceFile) {
  const arr = Array.isArray(raw) ? raw : raw?.questions || [];
  return arr.map((q, idx) => {
    const questionText = convertMathTokens(q.question || q.text || "");

    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const options = rawOptions
      .map((o) =>
        typeof o === "string"
          ? convertMathTokens(o)
          : convertMathTokens(o?.latex || o?.text || "")
      )
      .filter(Boolean);

    const answer = convertMathTokens(
      typeof q.answer === "string"
        ? q.answer
        : q?.answer?.latex || q?.answer?.text || ""
    );

    return {
      id: q.id ?? idx + 1,
      chapter: q.chapter ?? "General",
      question: questionText,
      options,
      answer,
      difficulty: (q.difficulty || "").toString().toLowerCase(),
      marks: q.marks ?? 1,
      _source: sourceFile,
    };
  });
}

function loadAll() {
  const base = resolveDataDir();
  if (!base) return [];
  const files = fs
    .readdirSync(base)
    .filter((f) => f.toLowerCase().endsWith(".json"));
  const all = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(base, f), "utf-8"));
      all.push(...normalizeArray(raw, f));
    } catch (e) {
      console.warn(`[text-questions] Skipping ${f}: ${e.message}`);
    }
  }
  return all;
}

const norm = (s = "") =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const parseChapters = (v) =>
  norm(v || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

/* ===========================
   SHUFFLE (always-on, seed optional)
   =========================== */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seedStr) {
  const seed = xmur3(String(seedStr))();
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

router.get("/api/text-questions", (req, res) => {
  const {
    chapter = "",
    difficulty = "",
    search = "",
    page = "1",
    limit = "50",
  } = req.query;

  const chapters = parseChapters(chapter);
  const df = norm(difficulty);
  const term = norm(search);

  const all = loadAll();
  const filtered = all.filter((q) => {
    const qChap = norm(q.chapter || "");
    const okCh =
      chapters.length === 0 || chapters.some((c) => qChap.includes(c));
    const okDf = !df || q.difficulty === df;

    if (!term) return okCh && okDf;

    const blob = norm(
      [q.question, ...(q.options || []), q.answer, q.chapter || ""].join(" ")
    );
    return okCh && okDf && blob.includes(term);
  });

  const seed = req.query.seed ?? `${Date.now()}-${Math.random()}`;
  let result = seededShuffle(filtered.slice(), seed);

  const p = Math.max(parseInt(page) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const start = (p - 1) * l;

  res.setHeader("X-Shuffle-Seed", seed);
  res.json({
    page: p,
    limit: l,
    total: result.length,
    totalPages: Math.max(1, Math.ceil(result.length / l)),
    items: result.slice(start, start + l),
  });
});

// Chapters list
router.get("/api/text-questions/chapters", (_req, res) => {
  const chapters = [
    ...new Set(loadAll().map((q) => q.chapter || "General")),
  ].sort();
  res.json({ chapters });
});

// Plain text
router.get("/api/text-questions.txt", (req, res) => {
  const {
    chapter = "",
    difficulty = "",
    search = "",
    limit = "200",
  } = req.query;

  const chapters = parseChapters(chapter);
  const df = norm(difficulty);
  const term = norm(search);

  const filtered = loadAll().filter((q) => {
    const qChap = norm(q.chapter || "");
    const okCh =
      chapters.length === 0 || chapters.some((c) => qChap.includes(c));
    const okDf = !df || q.difficulty === df;

    if (!term) return okCh && okDf;

    const blob = norm(
      [q.question, ...(q.options || []), q.answer, q.chapter || ""].join(" ")
    );
    return okCh && okDf && blob.includes(term);
  });

  const seed = req.query.seed ?? `${Date.now()}-${Math.random()}`;
  let result = seededShuffle(filtered.slice(), seed);

  res.setHeader("X-Shuffle-Seed", seed);

  result = result.slice(0, Math.min(parseInt(limit) || 200, 1000));

  let out = "";
  result.forEach((q, i) => {
    out += `#${i + 1} [${q.chapter}]${
      q.difficulty ? ` [${q.difficulty}]` : ""
    }${q.marks ? ` [${q.marks} mark${q.marks > 1 ? "s" : ""}]` : ""}\n`;
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
});

// HTML (Questions first, then Answers)
// router.get("/api/text-questions.html", (req, res) => {
//   const { chapter = "", difficulty = "", search = "", limit = "200" } = req.query;

//   const chapters = parseChapters(chapter);
//   const df = norm(difficulty);
//   const term = norm(search);

//   const all = loadAll().filter(q => {
//     const qChap = norm(q.chapter || "");
//     const okCh = chapters.length === 0 || chapters.some(c => qChap.includes(c));
//     const okDf = !df || q.difficulty === df;
//     if (!term) return okCh && okDf;
//     const blob = norm([q.question, ...(q.options || []), q.answer, q.chapter || ""].join(" "));
//     return okCh && okDf && blob.includes(term);
//   });

//   const seed = req.query.seed ?? `${Date.now()}-${Math.random()}`;
//   const result = seededShuffle(all.slice(), seed).slice(0, Math.min(parseInt(limit) || 200, 1000));

//   const chapterName = chapter || (result[0]?.chapter ?? "All Chapters");

//   let html = `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8"/>
// <title>${chapterName} - Questions</title>
// <style>
//   body { font-family: "Times New Roman", serif; background: #fff; color: #111; margin: 40px; line-height: 1.6; }
//   h1 { text-align: center; font-size: 26px; margin-bottom: 30px; text-transform: capitalize; }
//   h2 { font-size: 22px; margin-top: 40px; color: #003366; }
//   .question { margin-bottom: 20px; }
//   .qnumber { font-weight: bold; margin-right: 5px; }
//   .options { margin: 5px 0 8px 35px; }
// </style>
// </head>
// <body>
// <h1>Chapter: ${chapterName}</h1>
// <h2>Questions:</h2>
// `;

//   // Questions
//   result.forEach((q, i) => {
//     html += `
// <div class="question">
//   <div><span class="qnumber">Q${i + 1}.</span> ${q.question}</div>
// ${Array.isArray(q.options) && q.options.length ? `
//   <ol type="A" class="options">
//     ${q.options.map(opt => `<li>${opt}</li>`).join("")}
//   </ol>` : ""}
// </div>`;
//   });

//   // Answers
//   html += `
// <h2>Answers:</h2>
// <ol style="margin-left: 20px;">`;
//   result.forEach((q, i) => {
//     html += `<li><strong>Ans${i + 1}.</strong> ${q.answer || "—"}</li>`;
//   });
//   html += `</ol>
// </body>
// </html>`;

//   res.type("html").send(html);
// });

router.get("/api/text-questions.html", (req, res) => {
  const {
    chapter = "",
    difficulty = "",
    search = "",
    limit = "200",
  } = req.query;

  const chapters = parseChapters(chapter);
  const df = norm(difficulty);
  const term = norm(search);

  const all = loadAll().filter((q) => {
    const qChap = norm(q.chapter || "");
    const okCh =
      chapters.length === 0 || chapters.some((c) => qChap.includes(c));
    const okDf = !df || q.difficulty === df;
    if (!term) return okCh && okDf;
    const blob = norm(
      [q.question, ...(q.options || []), q.answer, q.chapter || ""].join(" ")
    );
    return okCh && okDf && blob.includes(term);
  });

  const seed = req.query.seed ?? `${Date.now()}-${Math.random()}`;
  const result = seededShuffle(all.slice(), seed).slice(
    0,
    Math.min(parseInt(limit) || 200, 1000)
  );

  const chapterName = chapter || (result[0]?.chapter ?? "All Chapters");

  // ✅ Generate the answer_key as an object
  const answer_key = {};
  const optionLetters = ["A", "B", "C", "D"];

  result.forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length === 0 || !q.answer)
      return;

    const index = q.options.findIndex((opt) => norm(opt) === norm(q.answer));

    if (index !== -1) {
      const questionKey = `MainQuestions${i + 1}`;
      answer_key[questionKey] = optionLetters[index];
    }
  });

  dataStore.lastGenerated = {
    timestamp: new Date(),
    chapter,
    difficulty,
    search,
    limit,
    answer_key,
  };
  console.log(dataStore);

  // 🔹 Generate the HTML (unchanged)
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${chapterName} - Questions</title>
<style>
  body { font-family: "Times New Roman", serif; background: #fff; color: #111; margin: 40px; line-height: 1.6; }
  h1 { text-align: center; font-size: 26px; margin-bottom: 30px; text-transform: capitalize; }
  h2 { font-size: 22px; margin-top: 40px; color: #003366; }
  .question { margin-bottom: 20px; }
  .qnumber { font-weight: bold; margin-right: 5px; }
  .options { margin: 5px 0 8px 35px; }
</style>
</head>
<body>
<h1>Chapter: ${chapterName}</h1>
<h2>Questions:</h2>
`;

  result.forEach((q, i) => {
    html += `
<div class="question">
  <div><span class="qnumber">Q${i + 1}.</span> ${q.question}</div>
${
  Array.isArray(q.options) && q.options.length
    ? `
  <ol type="A" class="options">
    ${q.options.map((opt) => `<li>${opt}</li>`).join("")}
  </ol>`
    : ""
}
</div>`;
  });

  html += `
<h2>Answers:</h2>
<ol style="margin-left: 20px;">`;
  result.forEach((q, i) => {
    html += `<li><strong>Ans${i + 1}.</strong> ${q.answer || "—"}</li>`;
  });
  html += `</ol>
</body>
</html>`;

  // ✅ Send the combined structured JSON response
  res.type("html").send(html);
});

// debug
router.get("/api/text-questions/__debug", (_req, res) => {
  const base = resolveDataDir();
  const files = base
    ? fs.readdirSync(base).filter((f) => f.toLowerCase().endsWith(".json"))
    : [];
  res.json({ dataDirectoryUsed: base || "(none)", files });
});

router.get("/api/paper-info", (req, res) => {
  if (!dataStore.lastGenerated.timestamp) {
    return res.status(404).json({ message: "No paper generated yet" });
  }

  res.json({
    message: "Latest paper details",
    ...dataStore.lastGenerated,
  });
});

export default router;
