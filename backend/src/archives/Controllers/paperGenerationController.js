// src/controllers/textJson.controller.js
import {
  loadAllQuestions,
  normalizeQuestionArray,
  parseChapters,
  norm,
  seededShuffle,
  xmur3,
  mulberry32,
} from "../../services/quationGenerationServices.js";

const getQuestionsHtml = (req, res) => {
  const { limit = "200", chapter = "" } = req.query;

  // 1. Filter and Shuffle questions
  const { result, seed } = QuestionService.filterAndShuffle(req.query);

  // Apply limit
  const finalResult = result.slice(0, Math.min(parseInt(limit) || 200, 1000));

  // 2. Generate and Store Answer Key (Critical side effect for OMR)
  QuestionService.generateAndStoreAnswerKey(finalResult, req.query);

  // 3. Generate HTML Content (Presentation Logic)
  const chapterName = chapter || (finalResult[0]?.chapter ?? "All Chapters");

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

  finalResult.forEach((q, i) => {
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
  finalResult.forEach((q, i) => {
    html += `<li><strong>Ans${i + 1}.</strong> ${q.answer || "—"}</li>`;
  });
  html += `</ol>
</body>
</html>`;

  // 4. Send Response
  res.setHeader("X-Shuffle-Seed", seed);
  res.type("html").send(html);
};

export { getQuestionsHtml };
