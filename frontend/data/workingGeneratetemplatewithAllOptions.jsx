import React, {
  useMemo,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
// 💡 MOCK IMPORTS - REPLACE WITH ACTUAL IMPLEMENTATION IN YOUR PROJECT
import axios from "axios";
import AuthContext from "../context/auth/AuthContext.jsx";
import PaperContext from "../context/paper/PaperContext";
// END MOCK IMPORTS

// --- Helper Functions ---

// Split questions into two columns (odd indices left, even indices right)
const splitIntoTwo = (arr) => {
  const left = [];
  const right = [];
  arr.forEach((item, index) => {
    // Q1, Q3, ... (index 0, 2, ...) go to left
    index % 2 === 0 ? left.push(item) : right.push(item);
  });
  return [left, right];
};

// Format ISO date to DD/MM/YYYY
const formatDateDDMMYYYY = (isoDate) => {
  if (!isoDate) return "";

  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const d = new Date(isoDate);
  if (isNaN(d)) return isoDate;

  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

// Function to calculate the Composite Key (ChapterName::ID) for replacement tracking
const getCompositeKey = (q) => {
  // Rely on the most stable identifiers available in the question object
  const qId = String(q.id || q.qno || q.paper_id || "unknown");
  const qChapter = String(q.chapter || q.chapter_name || "unknown");
  return `${qChapter}::${qId}`;
};

const REPLACEMENT_API_URL = "http://localhost:5000/api/v1/paper/replacements";

// --- Main Component ---

// CORRECTED: Destructure props properly
const GeneratedTemplate = ({
  className,
  examName,
  subjectName,
  examDate,
  examDuration,
  totalMarks,
  onBack,
  generatedPaper, // This is the API response (backendPaperData) passed from ChaptersPage
}) => {
  const { adminAuthToken } = useContext(AuthContext);
  const { exam, standards, subjects, backendPaperData } =
    useContext(PaperContext);

  // 💡 Extract data from the generatedPaper prop. Use 'data' field or fallback to the whole object.
  const apiData = generatedPaper?.data || generatedPaper || {};
  const originalQuestions = apiData?.metadata?.original_questions_array || [];

  // --- UI/View States ---
  const [useColumns, setUseColumns] = useState(true);
  const [showGenerateOptions, setShowGenerateOptions] = useState(false);
  const [viewMode, setViewMode] = useState("questions_only"); // 'questions_only', 'with_answers', 'with_solutions'

  // --- Replacement States ---
  const [replaceMode, setReplaceMode] = useState(false);
  const [selectedReplaceQuestions, setSelectedReplaceQuestions] = useState([]);
  const [replacementPool, setReplacementPool] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  const [displayedQuestions, setDisplayedQuestions] =
    useState(originalQuestions);

  // Derived view states
  const showAnswers =
    viewMode === "with_answers" || viewMode === "with_solutions";
  const showSolutions = viewMode === "with_solutions";

  // Sync original questions when the paper data changes (e.g., first load)
  useEffect(() => {
    // Deep copy the original array for mutability in replacements
    setDisplayedQuestions(JSON.parse(JSON.stringify(originalQuestions)));
    setSelectedReplaceQuestions([]);
    setReplacementPool([]);
  }, [JSON.stringify(originalQuestions)]);

  // Derived values from PROPS and API DATA
  const formattedDate = formatDateDDMMYYYY(examDate);
  const questionCount = displayedQuestions.length;

  const finalExamName = apiData.exam_name || examName;
  const finalClassName = apiData.class || className;
  const finalMarks = apiData.marks || totalMarks;
  const finalSubject = apiData.subject || subjectName;

  const [leftContent, rightContent] = useMemo(
    () => splitIntoTwo(displayedQuestions),
    [displayedQuestions]
  );

  // Handler for selecting a question to be replaced
  const handleQuestionSelection = (questionObject) => {
    const key = getCompositeKey(questionObject);

    setSelectedReplaceQuestions((prevSelected) => {
      const isSelected = prevSelected.some((q) => getCompositeKey(q) === key);

      if (isSelected) {
        return prevSelected.filter((q) => getCompositeKey(q) !== key);
      } else {
        return [...prevSelected, questionObject];
      }
    });
  };

  // 💡 EFFECT HOOK: Triggers when replacementPool is filled to perform the swap
  useEffect(() => {
    if (replacementPool.length > 0) {
      setDisplayedQuestions((prevQuestions) => {
        let nextQuestions = [...prevQuestions];
        let replacementIndex = 0;

        selectedReplaceQuestions.forEach((selectedQ) => {
          const selectedKey = getCompositeKey(selectedQ);

          const indexToReplace = nextQuestions.findIndex(
            (q) => getCompositeKey(q) === selectedKey
          );

          if (
            indexToReplace !== -1 &&
            replacementIndex < replacementPool.length
          ) {
            const newQuestion = replacementPool[replacementIndex];

            // CRITICAL: Preserve the original index (qno) from the replaced question
            newQuestion.qno = selectedQ.qno;

            nextQuestions[indexToReplace] = newQuestion;
            replacementIndex++;
          }
        });

        return nextQuestions;
      });

      // Reset states after successful replacement
      setSelectedReplaceQuestions([]);
      setReplacementPool([]);
      setReplaceMode(false);
      alert(`Successfully replaced ${replacementPool.length} question(s)!`);
    }
  }, [replacementPool]);

  // Handler to initiate API call and fetch replacement pool
  const fetchReplacementPool = async () => {
    if (selectedReplaceQuestions.length === 0) {
      alert("Please select at least one question to replace.");
      return;
    }

    setIsFetching(true);
    setError(null);

    // 1. Prepare Request Body
    const overallUsedKeys = displayedQuestions.map(getCompositeKey);

    const chapterRequestsMap = selectedReplaceQuestions.reduce((map, q) => {
      const chapterName = q.chapter || "unknown_chapter";
      map.set(chapterName, (map.get(chapterName) || 0) + 1);
      return map;
    }, new Map());

    const replacementRequests = Array.from(
      chapterRequestsMap,
      ([chapter, count]) => ({
        chapter,
        count,
      })
    );

    // 💡 CRITICAL FIX: Use the data derived from PROPS/API RESPONSE for the replacement payload
    console.log(
      "api data and replcemnt quations ",
      apiData,
      "replacement",
      replacementRequests,
      "overallUsedKeys",
      overallUsedKeys
    );

    const apiExam = apiData.exam_name || apiData.exam || examName;
    const apiStandards = apiData.class || className;
    const apiSubjects = apiData.subject || subjectName;

    console.log(apiData, apiStandards, apiSubjects);
    try {
      const response = await axios.post(
        REPLACEMENT_API_URL, // Use the globally defined constant REPLACEMENT_API_URL
        {
          exam: exam,
          standards: standards,
          subjects: subjects,
          overallUsedKeys: overallUsedKeys,
          replacementRequests: replacementRequests,
        },
        { headers: { Authorization: `Bearer ${adminAuthToken}` } }
      );

      if (response.data.success) {
        setReplacementPool(response.data.replacementQuestions || []);
      } else {
        // Log the exact error message from the backend
        console.error("Replacement API Error:", response.data);
        setError(
          response.data.message || "Failed to fetch replacement options."
        );
        setReplacementPool([]);
      }
    } catch (err) {
      console.error(
        "Replacement API Error:",
        err.response?.data || err.message
      );
      // NOTE: 404/Network errors are handled here
      setError(
        "Could not connect to replacement service or server issue (404/500)."
      );
    } finally {
      setIsFetching(false);
    }
  };

  // Dummy solution function
  const getDummySolution = (q) => {
    return `Solution ${
      q.qno || q.id
    }: To solve this, we first analyze the key variables. Since the question relates to the chapter '${
      q.chapter || "Default"
    }' and its type is typically objective, the derivation involves simplifying the given equation or applying the core concept. The final answer, ${
      q.answer || "Option A"
    }, is reached by satisfying all boundary conditions.`;
  };

  // Handler for printing with a specific view mode
  const handleGeneratePrint = useCallback((mode) => {
    // 1. Set the desired view mode
    setViewMode(mode);

    // 2. Wait for the state update
    setTimeout(() => {
      window.print();
    }, 100);
  }, []);

  // Handler for back button
  const handleBack = () => {
    setShowGenerateOptions(false);
    setViewMode("questions_only"); // Reset view mode to default
    if (onBack) {
      onBack();
    }
  };

  // Renders a single question block
  const renderQuestion = (q, idx, col) => {
    // Determine the correct question number based on layout
    const qno =
      q.qno || (useColumns ? (col === 0 ? idx * 2 + 1 : idx * 2 + 2) : idx + 1);
    const key = getCompositeKey(q);
    const isSelected = selectedReplaceQuestions.some(
      (sq) => getCompositeKey(sq) === key
    );

    let optsHtml = null;
    if (Array.isArray(q.options) && q.options.length) {
      optsHtml = (
        <ol className="ml-5 list-[lower-alpha] mt-1 text-[15px]">
          {q.options.map((opt, i) => (
            <li key={i}>{opt}</li>
          ))}
        </ol>
      );
    }

    return (
      <div
        key={key} // Use the composite key for stability
        className={`mb-4 question-item p-2 rounded-lg transition-colors duration-200 ${
          isSelected ? "bg-red-100 border border-red-400" : ""
        } ${replaceMode ? "cursor-pointer hover:bg-red-50" : ""}`}
        onClick={() => replaceMode && handleQuestionSelection(q)} // Only allow selection in replace mode
      >
        {/* Checkbox for Selection in Replace Mode */}
        {replaceMode && (
          <input
            type="checkbox"
            checked={isSelected}
            // Use the same selection handler for the input
            onChange={(e) => {
              e.stopPropagation(); // Prevent the parent div's onClick from firing twice
              handleQuestionSelection(q);
            }}
            className="float-left mr-2 mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
          />
        )}

        {/* Question Number and Text */}
        <div className={`flex ${replaceMode ? "ml-6" : ""}`}>
          <strong className="mr-2">{qno}.</strong>
          <p className="flex-1">{q.question}</p>
          <span className="ml-auto font-normal text-gray-700 whitespace-nowrap">
            ({q.marks || 1} M)
          </span>
        </div>

        {optsHtml}

        {/* Show Answer if enabled */}
        {showAnswers && q.answer && (
          <div className="ml-5 mt-2 text-green-700 font-semibold text-[16px]">
            ✓ Answer: {q.answer}
          </div>
        )}

        {/* Show Solution if enabled */}
        {showSolutions && (
          <div className="ml-5 mt-3 pt-3 border-t border-dashed border-gray-300">
            <h4 className="font-bold text-base text-indigo-700">Solution:</h4>
            {/* Pass the full question object to getDummySolution for context */}
            <p className="text-gray-800 text-[15px] italic">
              {getDummySolution(q)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 p-6 rounded-lg font-[Poppins]">
      <style>
        {/* ... (Your existing styles here, including print and toggle styles) ... */}
        {`
          @page { margin: 10mm; }
          .columns-q { display: flex; gap: 20px; }
          .col-q { flex: 1; }
          .col-q.left { border-right: 1px solid #e2e2e2; padding-right: 10px; }
          .watermark-print { display: none; }
          /* Toggle Switch Styles */
          .toggle-switch { position: relative; display: inline-block; width: 60px; height: 28px; }
          .toggle-switch input { opacity: 0; width: 0; height: 0; }
          .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: 0.3s; border-radius: 28px; }
          .toggle-slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: 0.3s; border-radius: 50%; }
          input:checked + .toggle-slider { background-color: #3b82f6; }
          input:checked + .toggle-slider:before { transform: translateX(32px); }
          @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area { position: absolute; top: 0; left: 0; width: 100%; }
            .no-print { display: none !important; }
            .watermark-print {
              display: block !important; visibility: visible !important;
              position: fixed; top: 50%; left: 50%;
              transform: translate(-50%, -50%) rotate(-28deg);
              font-size: 80px; font-weight: bold; opacity: 0.15; color: #666;
              z-index: 1; pointer-events: none; white-space: nowrap;
            }
          }
        `}
      </style>

      {/* Control Panel (Replacement, Toggles, Print) */}
      <div className="no-print flex justify-between items-center mb-4 gap-4">
        {/* Left Side - Toggles */}
        <div className="flex items-center gap-6">
          {/* Column Layout Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium">
              {useColumns ? "Column Layout" : "Single Layout"}
            </span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={useColumns}
                onChange={(e) => setUseColumns(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Right Side - Replacement and Generation Buttons */}
        <div className="flex gap-2">
          {/* SECTION 1: Select and Generate (Default View) */}
          {!showGenerateOptions && (
            <>
              {/* Select Questions Button & Replace Button */}
              <button
                onClick={() => setReplaceMode((prev) => !prev)}
                className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors duration-300 ${
                  replaceMode ? "bg-red-600" : "bg-gray-600 hover:bg-gray-700"
                }`}
                disabled={isFetching}
              >
                {replaceMode ? "Cancel Selection" : "Select Questions"}
              </button>

              {replaceMode && (
                <button
                  onClick={fetchReplacementPool}
                  disabled={selectedReplaceQuestions.length === 0 || isFetching}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isFetching
                    ? "Searching..."
                    : `Replace ${selectedReplaceQuestions.length}`}
                </button>
              )}

              {/* Initial Generate Button */}
              <button
                onClick={() => setShowGenerateOptions(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                Generate
              </button>
            </>
          )}

          {/* SECTION 2: Back and Print Options (After clicking Generate) */}
          {showGenerateOptions && (
            <>
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 font-semibold"
              >
                Back
              </button>

              {/* Print Options */}
              <button
                onClick={() => handleGeneratePrint("questions_only")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Questions Only
              </button>
              <button
                onClick={() => handleGeneratePrint("with_answers")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                With Answers
              </button>
              <button
                onClick={() => handleGeneratePrint("with_solutions")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                With Answers & Solution
              </button>
            </>
          )}
        </div>
      </div>

      {/* Display Error/Loading */}
      {error && (
        <div className="no-print text-red-500 text-center mb-4">{error}</div>
      )}

      {/* Watermark for Print */}
      <div className="watermark-print">Bisugen Pvt. Ltd.</div>

      {/* Printable Question Paper */}
      <div id="print-area" className="bg-white p-8 rounded-xl border relative">
        {/* Header Section */}
        <div className="border border-black p-4">
          <div className="flex justify-between font-semibold text-[16px]">
            <span>Class: {finalClassName}</span>

            <span className="flex-1 text-center text-[19px] font-bold">
              {finalExamName}
            </span>

            <div className="text-right">
              <div>Date: {formattedDate}</div>
              <div>Marks: {finalMarks}</div>
            </div>
          </div>

          <div className="text-[17px] font-semibold">
            Subject: {finalSubject}
          </div>
        </div>

        {/* Questions - Conditional Layout */}
        <div className="mt-6 text-[17px] leading-8 font-serif">
          {questionCount === 0 ? (
            <div className="text-center text-gray-500 py-20">
              No questions were generated.
            </div>
          ) : useColumns ? (
            // Two Column Layout
            <div className="columns-q">
              <div className="col-q left">
                {leftContent.map((q, i) => renderQuestion(q, i, 0))}
              </div>

              <div className="col-q">
                {rightContent.map((q, i) => renderQuestion(q, i, 1))}
              </div>
            </div>
          ) : (
            // Single Column Layout
            <div>
              {displayedQuestions.map((q, i) => renderQuestion(q, i, 0))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-6">
          --- End of Paper ---
        </div>
      </div>
    </div>
  );
};

export default GeneratedTemplate;
