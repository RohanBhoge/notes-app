// src/services/question.service.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// Assuming this path is correct for your data store
import { dataStore } from "../../data/answer_key.js";

// --- Configuration and Initialization ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIRS = [
  path.join(BACKEND_ROOT, "data"),
  path.join(BACKEND_ROOT, "src", "seed", "data"),
];
let questionCache = null;
const optionLetters = ["A", "B", "C", "D"];

// --- Internal Utilities (from old math.utils.js and route file) ---

/** Normalizes a string for comparison/search. */
const norm = (s = "") =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Parses a comma-separated string of chapters into a normalized array. */
const parseChapters = (v) =>
  norm(v || "")
    .split(" ")
    .map((c) => c.trim())
    .filter(Boolean);

/** Resolves the data directory path. */
function resolveDataDir() {
  for (const dir of DATA_DIRS) if (fs.existsSync(dir)) return dir;
  return null;
}

/**
 * Convert ONLY LaTeX commands (starting with backslash) to symbols/words.
 * (This replaces the complex convertMathTokens)
 */
function convertSpecialTokens(input = "") {
  if (input == null) return "";
  let s = String(input);

  if (!/\\/.test(s)) return s;

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

  const replaceCmd = (text, cmd, repl) =>
    text.replace(new RegExp(`${cmd}(?![A-Za-z])`, "g"), repl);

  // Functions, operators/relations, Greek letters
  const CMDS = {
    "\\sin": "sin",
    "\\cos": "cos",
    "\\tan": "tan",
    "\\cot": "cot",
    "\\sec": "sec",
    "\\csc": "csc",
    "\\log": "log",
    "\\ln": "ln",
    "\\sqrt": "√",
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
    s = replaceCmd(s, cmd, val);
  }
  return s;
}

// --- Question Loading and Normalization ---

function normalizeQuestionArray(raw, sourceFile) {
  const arr = Array.isArray(raw) ? raw : raw?.questions || [];

  return arr.map((q, idx) => {
    const questionText = convertSpecialTokens(q.question || q.text || "");

    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const options = rawOptions
      .map((o) =>
        typeof o === "string"
          ? convertSpecialTokens(o)
          : convertSpecialTokens(o?.latex || o?.text || "")
      )
      .filter(Boolean);

    const answer = convertSpecialTokens(
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

/**
 * Loads all questions from JSON files in the data directory. Uses caching.
 * @returns {Array<Object>} All loaded and normalized questions.
 */
function loadAllQuestions() {
  if (questionCache) return questionCache;

  const base = resolveDataDir();
  if (!base) return [];

  const files = fs
    .readdirSync(base)
    .filter((f) => f.toLowerCase().endsWith(".json"));

  const all = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(base, f), "utf-8"));
      all.push(...normalizeQuestionArray(raw, f));
    } catch (e) {
      console.warn(`[question-service] Skipping ${f}: ${e.message}`);
    }
  }
  questionCache = all;
  return all;
}

// --- Filtering and Shuffling ---

// PRNG implementations (xmur3, mulberry32)
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

/** Shuffles an array deterministically based on a seed string. */
function seededShuffle(arr, seedStr) {
  const seed = xmur3(String(seedStr))();
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Applies filtering and shuffling to the questions.
 * @param {Object} queries - Filter criteria (chapter, difficulty, search, seed).
 * @returns {{result: Array<Object>, seed: string}} The filtered, shuffled array and the seed used.
 */
export function filterAndShuffle(queries) {
  const {
    chapter = "",
    difficulty = "",
    search = "",
    seed: querySeed,
  } = queries;

  const chapters = parseChapters(chapter);
  const df = norm(difficulty);
  const term = norm(search);

  const all = loadAllQuestions();

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

  const seed = querySeed ?? `${Date.now()}-${Math.random()}`;
  const result = seededShuffle(filtered.slice(), seed);

  return { result, seed };
}

// --- Answer Key Generation (The Critical Side Effect) ---

/**
 * Generates and stores the OMR answer key based on the final question list.
 * @param {Array<Object>} result - The final list of questions.
 * @param {Object} queries - The filter/limit queries used to generate the set.
 */
export function generateAndStoreAnswerKey(result, queries) {
  const answer_key = {};

  result.forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length === 0 || !q.answer) {
      return;
    }

    const index = q.options.findIndex((opt) => norm(opt) === norm(q.answer));

    if (index !== -1 && index < optionLetters.length) {
      const questionKey = `MainQuestions${i + 1}`;
      answer_key[questionKey] = optionLetters[index];
    }
  });

  dataStore.lastGenerated = {
    timestamp: new Date(),
    chapter: queries.chapter || "",
    difficulty: queries.difficulty || "",
    search: queries.search || "",
    limit: queries.limit || "",
    answer_key,
  };
  console.log("Generated and stored new OMR Answer Key.");
  // console.log(dataStore); // Removed logging the whole dataStore for cleaner output
}

export {
  loadAllQuestions,
  normalizeQuestionArray,
  parseChapters,
  norm,
  seededShuffle,
  xmur3,
  mulberry32,
};
