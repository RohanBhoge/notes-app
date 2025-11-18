import {
  handleError,
  generatePaperId,
  formatPaperContent,
  selectQuestions,
} from "../utils/generatePaperHelper.js";

import {
  getPapersByUserId,
  createNewPaperForUser,
  getPaperByIdForUser,
  deletePapersForUser,
} from "../utils/helperFunctions.js";

const getPaper = async (req, res) => {
  const paperId = req.params.id;
  const userId = req.user?.id;

  if (!userId)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const paper = await getPaperByIdForUser(userId, paperId);

    if (paper) {
      res.status(200).json({ success: true, data: paper });
    } else {
      res.status(404).json({
        success: false,
        message: `Paper with ID '${paperId}' not found for this user.`,
      });
    }
  } catch (error) {
    console.error("API GET Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching data.",
    });
  }
};

const deletePapers = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const incoming =
      req.body?.paper_ids || req.body?.paperIds || req.body?.papers;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide an array of paper IDs in 'paper_ids'",
      });
    }

    const paperIds = incoming.map((p) => String(p)).slice(0, 200);

    const result = await deletePapersForUser(userId, paperIds);

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      deletedIds: result.deletedIds,
    });
  } catch (error) {
    console.error(
      "API DELETE Error:",
      error && error.message ? error.message : error
    );
    res.status(500).json({
      success: false,
      message: "Internal server error during deletion.",
    });
  }
};

const getAllPaperSummaries = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const papers = await getPapersByUserId(userId);

    const summaries = papers.map((p) => ({
      paper_id: p.paper_id,
      exam_name: p.exam_name,
      class: p.class,
      subject: p.subject,
      exam_date: p.exam_date,
      totalMarks: p.marks || 0,
      status: "checked",
      created_at: p.created_at,
    }));

    res.json({ success: true, papers: summaries });
  } catch (error) {
    console.error("DB Fetch User Papers Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve paper history.",
      error: error.message,
    });
  }
};

async function generateBackendPaper(req, res) {
  try {
    const params = { ...req.body, count: req.body.count || 10 };
    const result = await selectQuestions(params);
    const selected = result.selected;
    let totalMarks = 0;
    for (const q of selected) {
      totalMarks += Number(q.marks ?? q.mark ?? 1) || 0;
    }

    const { paper_questions, paper_answers, question_list } =
      formatPaperContent(selected);

    const paperData = {
      paper_id: generatePaperId(params.exam, params.standard),
      exam_name: String(params.exam || "").trim(),
      class: String(params.standard || "").trim() + " Grade",
      subject: String(params.subject || params.chapters?.[0] || "").trim(),
      exam_date: new Date().toISOString().split("T")[0],
      marks: totalMarks,
      paper_questions: paper_questions,
      paper_answers: paper_answers,
      metadata: {
        seed: result.seed,
        question_count: selected.length,
        zip_path: result.zipPath || "N/A",
        original_questions_array: question_list,
      },
    };

    try {
      const userId = req.user?.id;

      if (!userId)
        throw new Error("Authenticated user id not found on request");

      const dbInsertId = await createNewPaperForUser(userId, paperData);

      paperData.db_id = dbInsertId;
      paperData.user_id = userId;
    } catch (dbError) {
      if (dbError.code === "ER_DUP_ENTRY") {
        console.warn(
          `Attempted duplicate paper_id: ${paperData.paper_id}. Retrying with new ID...`
        );

        paperData.paper_id = generatePaperId(params.exam, params.standard);
        const dbInsertId = await createNewPaperForUser(req.user?.id, paperData);
        paperData.db_id = dbInsertId;
      } else {
        const err = new Error("Database insertion failed.");
        err.stack = dbError.stack;
        throw err;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Paper generated and stored successfully.",
      data: paperData,
    });
  } catch (err) {
    return handleError(err, err.status || 500, res);
  }
}

export { getPaper, deletePapers, getAllPaperSummaries, generateBackendPaper };
