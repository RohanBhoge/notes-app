import {
  handleError,
  generatePaperId,
  formatPaperContent,
  selectQuestions,
} from "../utils/generatePaperHelper.js";

import {
  getPapersByUserId,
  createNewPaperForUser,
  deletePapersForUser,
  getPaperByIdForUser,
} from "../utils/helperFunctions.js";

import {
  makeSeed,
  seededShuffle,
  loadQuestionsFromZip,
  matchesFiltersObj,
} from "../utils/zipLoader.js";

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

const generatePaper = async (req, res) => {
  try {
    const params = { ...req.body, count: req.body.count || 10 };
    const result = await selectQuestions(params);
    const selected = result.selected;
    if (selected.length === 0) {
      return handleError("No questions found matching criteria.", 404, res);
    }

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

    return res.status(200).json({
      success: true,
      message: "Paper generated successfully, ready for client review/storage.",
      data: paperData,
    });
  } catch (err) {
    return handleError(err, err.status || 500, res);
  }
};

const storePaper = async (req, res) => {
  const paperData = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return handleError("Authenticated user id not found on request", 401, res);
  }
  if (!paperData.paper_id || !paperData.paper_questions) {
    return handleError(
      "Missing required paper data fields (paper_id, paper_questions).",
      400,
      res
    );
  }

  try {
    const dbInsertId = await createNewPaperForUser(userId, paperData);

    return res.status(201).json({
      success: true,
      message: "Paper stored successfully.",
      db_id: dbInsertId,
      paper_id: paperData.paper_id,
    });
  } catch (dbError) {
    if (dbError.code === "ER_DUP_ENTRY") {
      return handleError(
        `Paper ID '${paperData.paper_id}' already exists.`,
        409,
        res
      );
    }

    console.error("DB Erro  r in storePaper:", dbError);
    return handleError("Database insertion failed.", 500, res);
  }
};

// paperController.js (Corrected getReplaceableQuestions)

// ... (imports remain the same) ...

const getReplaceableQuestions = async (req, res) => {
  try {
    // 1. Authorization & Input Validation
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 💡 FIX 1: Safely handle empty strings or non-array inputs for context filters
    const {
      exam,
      standards, // May be a string like "11th" or an array ["11th", "12th"]
      subjects, // May be a string or array
      overallUsedKeys = [],
      replacementRequests = [],
    } = req.body;

    // Normalize string inputs (if any) into arrays for helper function consistency
    const standardArr = Array.isArray(standards)
      ? standards
      : String(standards || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    const subjectArr = Array.isArray(subjects)
      ? subjects
      : String(subjects || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    if (replacementRequests.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Replacement request list is required.",
      });
    } // 2. Setup Global Exclusion Set (Composite Key: Chapter::ID)

    const globalExclusionSet = new Set(overallUsedKeys.map(String)); // 3. Data Retrieval

    const zipRes = await loadQuestionsFromZip();

    // 💡 FIX 2: If zip loading failed, throw the specific error message provided by zipLoader.js
    if (!zipRes.ok) {
      const loadError = new Error(
        zipRes.error || "ZIP file could not be loaded."
      );
      loadError.status = 500;
      throw loadError; // Throw the error to the outer catch block
    }
    const allQ = zipRes.questions || [];

    const finalReplacements = [];
    let totalNeeded = 0; // 4. Fulfillment Loop: Iterate through each requested chapter batch

    for (const request of replacementRequests) {
      const { chapter, count } = request;
      const replacementCount = Number(count) > 0 ? Number(count) : 1;
      totalNeeded += replacementCount; // Ensure chapter name is not empty

      if (!chapter) continue;

      const chaptersArr = [chapter]; // Target this single chapter for inclusion // Find all potential candidates for this specific chapter, using the full filter set

      const validPool = allQ.filter((q) => {
        // A. Global Context & Relevance Check (Uses the robust utility)
        const isContextMatch = matchesFiltersObj(q, {
          exam,
          standardArr,
          subjectArr,
          chaptersArr, // Now includes the specific chapter filter
        });

        // B. Exclusion Check (Only check questions that passed the relevance filter)
        if (isContextMatch) {
          const qId = String(q.id || q.qno || "N/A");
          const qChapter = String(q.chapter || q.chapter_name || "N/A");
          const compositeKey = `${qChapter}::${qId}`;

          if (globalExclusionSet.has(compositeKey)) {
            return false; // Exclude questions ALREADY used
          }
          return true; // Include unused, matching question
        }
        return false;
      });

      // ... (Rest of selection and aggregation logic remains the same)
      const shuffledCandidates = seededShuffle(validPool, makeSeed());
      const selectedBatch = shuffledCandidates.slice(0, replacementCount);

      selectedBatch.forEach((q) => {
        finalReplacements.push({
          id: String(q.id || q.qno || "N/A"),
          chapter: q.chapter || q.chapter_name || "N/A",
          question: q.question ?? q.text ?? "N/A",
          options: q.options || [],
          answer: q.answer ?? q.correctAnswer ?? "N/A",
          difficulty: q.difficulty,
          marks: q.marks || q.mark || 1,
        });
        globalExclusionSet.add(`${q.chapter || "N/A"}::${q.id || "N/A"}`);
      });
    } // 6. Final Response

    if (finalReplacements.length > 0) {
      return res.status(200).json({
        success: true,
        message: `Successfully found ${finalReplacements.length} replacement question(s).`,
        totalRequested: totalNeeded,
        replacementQuestions: finalReplacements,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: `No unique replacement questions were found. Check chapter spelling, filters, and question availability.`,
        totalRequested: totalNeeded,
        replacementQuestions: [],
      });
    }
  } catch (err) {
    // This handler will catch the explicit error thrown if zipRes.ok fails
    // or any internal processing error.
    return handleError(err, err.status || 500, res);
  }
};

export {
  getPaper,
  deletePapers,
  getAllPaperSummaries,
  generatePaper,
  storePaper,
  getReplaceableQuestions,
};
