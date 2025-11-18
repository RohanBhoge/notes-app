// server.js
import express from "express";
import { createNewPaper, getPaperById } from "../../config/dbConfig.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// --- 1. POST API: Store New Paper ---
// app.post("/api/paper",
const NewPaper = async (req, res) => {
  try {
    const paperData = req.body;
    // Basic validation for required fields
    if (!paperData.paper_id || !paperData.paper_questions) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (paper_id, paper_questions).",
      });
    }

    const newId = await createNewPaper(paperData);

    res.status(201).json({
      success: true,
      message: "Paper stored successfully.",
      id: newId,
      paper_id: paperData.paper_id,
    });
  } catch (error) {
    console.error("API POST Error:", error.message);

    // Handle unique constraint error if paper_id is duplicated
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: `Paper ID '${req.body.paper_id}' already exists.`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error during data storage.",
    });
  }
};

// app.get("/api/paper/:id",
const getPaper = async (req, res) => {
  const paperId = req.params.id;

  try {
    const paper = await getPaperById(paperId);

    if (paper) {
      // Full paper data is returned, including questions and answers
      res.status(200).json({ success: true, data: paper });
    } else {
      res.status(404).json({
        success: false,
        message: `Paper with ID '${paperId}' not found.`,
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

export { NewPaper, getPaper };
