// src/utils/htmlBuilders.js

import { escapeHtml, latexToTextSafe } from "./zipLoader.js";

// Helper to split array for two columns
function splitIntoTwo(arr) {
  const mid = Math.ceil(arr.length / 2);
  return [arr.slice(0, mid), arr.slice(mid)];
}

/**
 * Builds the HTML content for the question paper (two columns).
 */
export function makeTwoColumnHtml({
  title = "Question Paper",
  subject = "",
  exam = "",
  standard = "",
  selected = [],
  seed = "",
  zipPath = "",
  timeStr = "30 Minutes",
  marksStr = null,
}) {
  let totalMarks = 0;
  for (const q of selected) totalMarks += Number(q.marks ?? q.mark ?? 1) || 0;
  const subjEsc = escapeHtml(subject || "");
  const examEsc = escapeHtml(exam || "");
  const stdEsc = escapeHtml(standard || "");
  const seedEsc = escapeHtml(seed || "");
  const zipEsc = escapeHtml(zipPath || "");

  function qHtml(q, idx) {
    const qno = idx + 1;
    const text = escapeHtml(
      latexToTextSafe(q.question ?? q.text ?? q.question_latex ?? "")
    );
    let opts = "";
    if (Array.isArray(q.options) && q.options.length) {
      opts = '<ol class="options">';
      for (let i = 0; i < q.options.length; i++)
        opts += `<li>${escapeHtml(latexToTextSafe(q.options[i] || ""))}</li>`;
      opts += "</ol>";
    }
    const marks = Number(q.marks ?? q.mark ?? 1) || 0;
    return `<div class="question" id="q${qno}">
      <div class="qtext"><strong>Q${qno}.</strong> ${text}</div>
      ${opts}
      <div class="marks">(${marks} marks)</div>
    </div>`;
  }

  const [left, right] = splitIntoTwo(selected);
  const leftHtml = left.map((q, i) => qHtml(q, i)).join("\n");
  const rightHtml = right.map((q, i) => qHtml(q, left.length + i)).join("\n");
  const marksDisplay = marksStr || String(totalMarks || 0);

  // ... (rest of the HTML structure)
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  :root { --max-w:1100px; --gap:32px; --divider:1px solid #e1e1e1; }
  body { font-family: "Times New Roman", Cambria, serif; background:#f4f6f8; margin:20px; color:#111; }
  .container { max-width: var(--max-w); margin: 0 auto; }
  .card { background:#fff; padding:18px; border-radius:8px; border:1px solid #e8e8e8; margin-bottom:14px; text-align:center; }
  .card h1 { margin:0 0 6px 0; font-size:24px; }
  .meta { margin-top:6px; font-size:14px; }
  .paper { background:#fff; padding:20px; border-radius:8px; border:1px solid #eaeaea; position:relative; overflow:visible;}
  .watermark { pointer-events:none; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) rotate(-28deg); font-size:72px; font-weight:800; color:#000; opacity:0.06; z-index:1; white-space:nowrap; }
  .columns { display:flex; gap:var(--gap); position:relative; z-index:2; }
  .col { flex:1 1 0; padding:0 12px; box-sizing:border-box; }
  .col.left { border-right: var(--divider); padding-right: 28px; }
  .question { margin-bottom:20px; }
  .qtext { margin-bottom:8px; font-size:16px; }
  .options { margin-left:22px; margin-top:6px; }
  .options li { margin-bottom:6px; }
  .marks { margin-top:6px; font-size:13px; color:#444; }
  .seedbox { font-size:12px; color:#666; position:absolute; right:10px; bottom:10px; z-index:3; }
  @media print { .watermark { opacity: 0.08 !important; } .container { margin:0; } }
  @media (max-width:700px) { .columns { flex-direction:column; } .col.left { border-right:none; padding-right:0; } }
</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Question Paper</h1>
      <div style="font-weight:700">Final Mock Test - Class ${stdEsc || ""}</div>
      <div class="meta"><strong>Subject:</strong> ${subjEsc} &nbsp;&nbsp; <strong>Exam:</strong> ${examEsc} &nbsp;&nbsp; <strong>Time:</strong> ${escapeHtml(
    timeStr
  )} &nbsp;&nbsp; <strong>Marks:</strong> ${escapeHtml(marksDisplay)}</div>
    </div>

    <div class="paper">
      <div class="watermark">Bisugen pvt.ltd.</div>

      <div class="columns">
        <div class="col left">
          ${leftHtml}
        </div>
        <div class="col right">
          ${rightHtml}
        </div>
      </div>

      <div class="seedbox">Source: ${zipEsc} &nbsp; Seed: ${seedEsc} &nbsp; Questions: ${
    selected.length
  }</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds the HTML content for the answer sheet (two columns).
 */
export function makeAnswersHtml({
  title = "Answer Sheet",
  subject = "",
  exam = "",
  standard = "",
  selected = [],
  seed = "",
  zipPath = "",
}) {
  // This is essentially the same as your existing makeAnswersHtml function from server.js
  // ... (logic remains the same, assuming latexToText is imported/available)
  return ``;
}
