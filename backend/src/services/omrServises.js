import axios from "axios";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeStudentValue(raw) {
  if (!raw) return "notAnswered";
  const v = String(raw).trim().toUpperCase();
  if (!v) return "notAnswered";
  if (v.includes(",") || v.includes(";") || v.includes("/")) return "multiple";
  if (["A", "B", "C", "D"].includes(v)) return v;
  if (v.startsWith("ERROR")) return "notAnswered";
  return "multiple";
}

function parseRecognitionText(text) {
  let studentAnswers = {};
  let studentName = "";

  function extractFromArray(arr) {
    if (!Array.isArray(arr)) return;

    for (const el of arr) {
      const key = (el.ElementName ?? el.Name ?? el.Key ?? "").toString().trim();
      const value = el.Value ?? el.ValueText ?? el.Text ?? "";

      if (key) {
        if (/mainquestions?/i.test(key)) {
          studentAnswers[key] = normalizeStudentValue(value);
        }

        if (/candidate|student|full name/i.test(key) && !studentName) {
          const cleaned = cleanName(value);
          if (cleaned) {
            studentName = cleaned;
          }
        }
      }

      if (
        Array.isArray(el.RecognitionResults) &&
        el.RecognitionResults.length > 0
      ) {
        extractFromArray(el.RecognitionResults);
      }
    }
  }

  let returned = null;
  try {
    returned = JSON.parse(text);
  } catch {
    // Return empty results if text isn't valid JSON
    return { studentAnswers: {}, studentName: "Unknown" };
  }

  // Look for the RecognitionResults array in various common Aspose locations
  const resultsToParse =
    returned?.RecognitionResults ??
    returned?.results?.[0]?.data?.RecognitionResults ??
    null;

  if (resultsToParse) {
    extractFromArray(resultsToParse);
  }

  return { studentAnswers, studentName: studentName || "Unknown" };
}

function cleanName(value) {
  if (!value) return "";
  const cleaned = String(value).trim();
  if (cleaned.length < 2) return "";
  return cleaned;
}

// Access token
async function getAccessToken() {
  const { CLIENT_ID, CLIENT_SECRET } = process.env;
  if (!CLIENT_ID || !CLIENT_SECRET)
    throw new Error("Missing Aspose credentials.");

  const res = await axios.post(
    "https://api.aspose.cloud/connect/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return res.data.access_token;
}

// Submit recognition
async function submitRecognition(accessToken, imageBase64, omrBase64) {
  const url =
    "https://api.aspose.cloud/v5.0/omr/RecognizeTemplate/PostRecognizeTemplate";
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const body = {
    Images: [imageBase64],
    omrFile: omrBase64,
    outputFormat: "json",
    recognitionThreshold: 32,
  };

  const res = await axios.post(url, body, { headers });
  return res.data;
}

// Fetch recognition result
async function fetchResult(accessToken, recognizeId) {
  const url = `https://api.aspose.cloud/v5.1/omr/RecognizeTemplate/GetRecognizeTemplate?id=${recognizeId}`;
  const headers = { Authorization: `Bearer ${accessToken}` };

  for (let i = 0; i < 10; i++) {
    const res = await axios.get(url, { headers });
    if (res.data?.results?.length) return res.data.results[0].data;
    await delay(3000);
  }

  throw new Error("Recognition result not available after retries.");
}

function compareWithOfficial(officialKey, studentAnswers) {
  const reportData = [];
  let totalMarks = 0;

  Object.entries(officialKey).forEach(([qKey, correct], i) => {
    const student = studentAnswers[qKey] ?? "notAnswered";
    let result = "Wrong";
    let marks = 0;

    if (student === correct) {
      result = "Correct";
      marks = 1;
    } else if (student === "notAnswered") {
      result = "Unanswered";
    } else if (student === "multiple") {
      result = "Invalid/Multiple";
    }

    totalMarks += marks;

    reportData.push({
      sr: i + 1,
      question_no: qKey,
      student_answer: student,
      correct_answer: correct,
      result,
    });
  });

  return {
    reportData,
    totalMarks,
    totalQuestions: Object.keys(officialKey).length,
  };
}

export {
  parseRecognitionText,
  getAccessToken,
  submitRecognition,
  fetchResult,
  compareWithOfficial,
};
