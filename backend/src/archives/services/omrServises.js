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

  // Helper: try to derive a name from structured elements (arrays of option/letter bubbles)
  function deriveNameFromStructuredElement(el) {
    const parts = [];

    // If the element directly contains an array of children
    const candidates =
      el.Value ??
      el.ValueText ??
      el.RecognitionResults ??
      el.Elements ??
      el.Items ??
      el.Options ??
      [];
    if (!Array.isArray(candidates)) return "";

    for (const child of candidates) {
      // 1) If child has an explicit text/value, use it
      const raw =
        child.Value ??
        child.ValueText ??
        child.Text ??
        child.Label ??
        child.Name ??
        child.ElementName ??
        "";
      if (raw && typeof raw === "string" && raw.trim()) {
        // If this looks like a single-character option (e.g. "A","B"), use it directly
        const token = String(raw).trim();
        if (token.length === 1) {
          parts.push(token);
          continue;
        }
      }

      // 2) If child has options/choices, pick the marked one
      const choices =
        child.Options ??
        child.Choices ??
        child.Items ??
        child.Elements ??
        child.RecognitionResults ??
        [];
      if (Array.isArray(choices) && choices.length) {
        const marked = choices.find(
          (c) =>
            c.IsSelected ||
            c.Selected ||
            c.Marked ||
            c.IsMarked ||
            c.Value === true ||
            c.Checked === true
        );
        const any =
          marked ?? choices.find((c) => c.Value || c.Text || c.Label || c.Name);
        if (any) {
          const val = any.Value ?? any.Text ?? any.Label ?? any.Name ?? "";
          const vstr = String(val).trim();
          if (vstr) {
            // If the selected option is like 'A'..'Z' or '0'..'9', use it as a letter/char
            if (vstr.length === 1) parts.push(vstr);
            else {
              // Sometimes label could be full letter name, take first char
              parts.push(vstr[0]);
            }
            continue;
          }
        }
      }

      // 3) Fallback: if child itself has a boolean marker use index->letter mapping
      if (child.IsSelected || child.Selected || child.Marked || child.Checked) {
        // Try to use child index symbol if present
        const label = child.Label ?? child.Name ?? child.ElementName ?? "";
        if (label && typeof label === "string") {
          parts.push(String(label).trim().charAt(0));
          continue;
        }
      }
    }

    // Join parts heuristically: group into words when uppercase letters and spaces absent
    if (parts.length === 0) return "";
    const joined = parts.join("");
    // If looks like initials without spaces, try to insert spaces every few letters? For now return joined
    return joined.replace(/_/g, " ").trim();
  }
  function extractFromArray(arr) {
    if (!Array.isArray(arr)) return;

    for (const el of arr) {
      const key = (el.ElementName ?? el.Name ?? el.Key ?? "").toString().trim();
      const value = el.Value ?? el.ValueText ?? el.Text ?? "";

      if (key) {
        if (/mainquestions?/i.test(key)) {
          studentAnswers[key] = normalizeStudentValue(value);
        }

        // Try plain extraction first
        if (
          /candidate|student|full name|name_of_candidate|studentname/i.test(
            key
          ) &&
          !studentName
        ) {
          const cleaned = cleanName(value);
          if (cleaned) {
            studentName = cleaned;
          } else {
            // If value doesn't yield a plain name, try to derive from structured element (bubbled letters)
            const derived = deriveNameFromStructuredElement(el);
            if (derived) studentName = derived;
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
