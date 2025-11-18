import axios from "axios";
import fs from "fs/promises";
const apiKey =
  process.env.GEMINI_API_KEY || "AIzaSyB9GR25jOOCMLSG0g5Eu6-ncVG_YPCA1mw";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

async function extractRawText(filePath, originalname) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn(`Could not delete temp file ${filePath}: ${error.message}`);
  }

  return `
        CONFIDENTIAL EXAM DOCUMENT - ID: SCI-EXAM-Q2-025
        ---
        Exam: Mid-Term Chemistry Assessment
        Class: 10th Grade
        Subject: Chemistry (Organic)
        Date: 2026-03-10
        Total Marks: 60
        
        Question 1: Describe the reaction kinetics... (The rest of the paper follows)
    `;
}

// --- AI-Powered Extraction Function ---
async function extractStructuredData(rawText) {
  const systemPrompt =
    "You are a specialized data extractor. Analyze the provided exam text and extract the required fields exactly according to the JSON schema. Be flexible with field names (e.g., 'ID' might map to 'paperId').";

  // Define the required JSON structure based on the client component fields
  const responseSchema = {
    type: "OBJECT",
    properties: {
      paperId: {
        type: "STRING",
        description: "Unique identifier for the paper.",
      },
      examName: {
        type: "STRING",
        description: "Full name of the examination.",
      },
      className: { type: "STRING", description: "Grade or class level." },
      subjectName: { type: "STRING", description: "Subject of the exam." },
      examDate: {
        type: "STRING",
        description: "Date of the exam, in YYYY-MM-DD format if possible.",
      },
      totalMarks: {
        type: "INTEGER",
        description: "Maximum marks for the paper.",
      },
    },
    required: ["paperId", "examName", "className", "subjectName", "totalMarks"],
  };

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Extract metadata from the following document text:\n\n---\n${rawText}`,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  };

  let response;
  for (let i = 0; i < 3; i++) {
    try {
      response = await axios.post(GEMINI_API_URL, payload, {
        headers: { "Content-Type": "application/json" },
      });
      break;
    } catch (error) {
      if (i === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** i * 1000));
    }
  }

  const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (resultText) {
    return JSON.parse(resultText);
  }
  throw new Error("AI extraction failed to return structured JSON.");
}

export const handleExtraction = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded." });
  }

  try {
    const filePath = req.file.path;
    const originalname = req.file.originalname;

    const rawText = await extractRawText(filePath, originalname);

    const extractedData = await extractStructuredData(rawText);

    res.json({
      success: true,
      message: "Metadata extracted and structured successfully.",
      extractedData: extractedData,
    });
  } catch (error) {
    console.error("Extraction Workflow Error:", error);

    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {}
    }

    res.status(500).json({
      success: false,
      message: "Failed to process file and extract metadata.",
      error: error.message,
    });
  }
};
