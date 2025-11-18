import axios from "axios";
import ExcelJS from "exceljs";
import { dataStore } from "../../../data/answer_key.js";
import {
  parseRecognitionText,
  getAccessToken,
  submitRecognition,
  fetchResult,
  compareWithOfficial,
} from "../../services/omrServises.js";

// Utility functions
const bufferToBase64 = (buffer) => buffer.toString("base64");
const decodeBase64ToText = (b64) => Buffer.from(b64, "base64").toString("utf8");

// Main Controller
export const omrProcessController = async (req, res) => {
  const imageFile = req.files?.image?.[0];
  const omrFile = req.files?.omr?.[0];

  if (!imageFile || !omrFile)
    return res.status(400).json({
      error: "Missing file uploads.",
      details: 'Upload "image" and "omr" fields as multipart/form-data.',
    });

  try {
    const accessToken = await getAccessToken();

    const recognizeId = await submitRecognition(
      accessToken,
      bufferToBase64(imageFile.buffer),
      bufferToBase64(omrFile.buffer)
    );

    const returnedData = await fetchResult(accessToken, recognizeId);

    let text;
    const maybeBase64 = String(returnedData).trim();

    if (
      /^[A-Za-z0-9+/=\s]+$/.test(maybeBase64) &&
      maybeBase64.length % 4 === 0
    ) {
      try {
        text = decodeBase64ToText(maybeBase64);
      } catch {
        text = String(returnedData);
      }
    } else {
      text = String(returnedData);
    }

    const { studentAnswers, studentName } = parseRecognitionText(text);

    const officialKey = dataStore.lastGenerated?.answer_key || {};
    if (!Object.keys(officialKey).length)
      return res
        .status(400)
        .json({ error: "No answer key found in dataStore." });

    const finalStudentName = studentName || "Unknown Student";

    const { reportData, totalMarks, totalQuestions } = compareWithOfficial(
      officialKey,
      studentAnswers
    );

    // 🔹 Create Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("OMR Report");

    // Title Row
    sheet.addRow(["OMR Evaluation Report"]);
    sheet.mergeCells("A1:E1");
    sheet.getCell("A1").font = { bold: true, size: 14 };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    sheet.addRow([]);

    // Print Student Name to Excel
    sheet.addRow(["Student Name:", finalStudentName]);

    sheet.addRow(["Total Marks:", `${totalMarks}/${totalQuestions}`]);
    sheet.addRow([]);
    sheet.addRow([
      "Sr.No",
      "Question No.",
      "Student Answer",
      "Correct Answer",
      "Result",
    ]);

    sheet.getRow(6).font = { bold: true };

    reportData.forEach((r) =>
      sheet.addRow([
        r.sr,
        r.question_no,
        r.student_answer,
        r.correct_answer,
        r.result,
      ])
    );

    sheet.columns = [
      { width: 10 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 15 },
    ];

    sheet.eachRow((row) => {
      row.alignment = { vertical: "middle", horizontal: "center" };
      row.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=OMR_Report.xlsx"
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader("Content-Length", buffer.length);

    res.end(buffer);
  } catch (err) {
    console.error("OMR Processing Error:", err);
    if (axios.isAxiosError(err) && err.response)
      return res.status(err.response.status || 500).json({
        error: "Aspose API Call Failed",
        details: err.response.data || "Unknown API Error",
      });
    res.status(500).json({ error: err.message ?? String(err) });
  }
};
