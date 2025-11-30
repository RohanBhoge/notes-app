  import React, { useMemo, useState, useEffect, useContext } from "react";
  import axios from "axios";
  import AuthContext from "../context/auth/AuthContext";

  // MODIFIED Helper to split array for row-wise interleaving
  const splitIntoTwo = (arr) => {
    const left = [];
    const right = [];

    arr.forEach((item, index) => {
      if ((index + 1) % 2 === 0) {
        right.push(item);
      } else {
        left.push(item);
      }
    });
    return [left, right];
  };

  const formatDateDDMMYYYY = (isoDate) => {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const REPLACEMENT_API_URL = "http://localhost:5000/api/v1/paper/replacements";

  const GeneratedTemplate = ({
    className: localClassName,
    examName: localExamName,
    subjectName,
    examDate,
    examDuration,
    totalMarks,
    onBack,
    generatedPaper, // The full JSON response (response.data)
  }) => {
    const [replaceMode, setReplaceMode] = useState(false);
    const [selectedReplaceQuestions, setSelectedReplaceQuestions] = useState([]);
    const [replacementPool, setReplacementPool] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState(null);
    const { adminAuthToken } = useContext(AuthContext);

    const paperData = generatedPaper?.data || {};
    const originalQuestions = paperData?.metadata?.original_questions_array || [];

    // 💡 NEW STATE: Manages the live list of questions currently displayed (allows replacement)
    const [displayedQuestions, setDisplayedQuestions] =
      useState(originalQuestions); // Sync original questions when the paper data changes (e.g., first load)

    useEffect(() => {
      // Deep copy the original array so replacements don't overwrite context data
      setDisplayedQuestions(JSON.parse(JSON.stringify(originalQuestions)));
      setSelectedReplaceQuestions([]);
      setReplacementPool([]);
    }, [JSON.stringify(originalQuestions)]); // Dependency on stringified array for deep equality // Derived values from props/state

    const finalMarks = paperData.marks || totalMarks;
    const finalExamName = paperData.exam_name || localExamName;
    const finalClassName = paperData.class || localClassName;
    const questionCount = displayedQuestions.length; // Use the length of the mutable array

    const [leftContent, rightContent] = useMemo(
      () => splitIntoTwo(displayedQuestions),
      [displayedQuestions]
    ); // --- Replacement Logic --- // Function to calculate the Composite Key (ChapterName::ID)

    const getCompositeKey = (q) => {
      const qId = String(q.id || q.qno || q.paper_id || "unknown");
      const qChapter = String(q.chapter || q.chapter_name || "unknown");
      return `${qChapter}::${qId}`;
    }; // Handler for selecting a question to be replaced

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
    }; // 💡 EFFECT HOOK: Triggers when replacementPool is filled

    useEffect(() => {
      if (replacementPool.length > 0) {
        // Since the backend returns one replacement question for each selected question:

        console.log("replacement quations", replacementPool);
        console.log("selected replacement quations", selectedReplaceQuestions);

        setDisplayedQuestions((prevQuestions) => {
          let nextQuestions = [...prevQuestions];
          let replacementIndex = 0; // Index for the fetched replacements

          // Iterate over the questions marked for replacement (selectedReplaceQuestions)
          // and perform the swap using the new question from the replacementPool

          // NOTE: We rely on the order of selectedReplaceQuestions being the same as the order
          // in which the backend processed the requests, but the safest way is to replace
          // the question with the lowest original index.

          selectedReplaceQuestions.forEach((selectedQ) => {
            const selectedKey = getCompositeKey(selectedQ);

            // Find the index of the question to replace in the main displayed array
            const indexToReplace = nextQuestions.findIndex(
              (q) => getCompositeKey(q) === selectedKey
            );

            if (
              indexToReplace !== -1 &&
              replacementIndex < replacementPool.length
            ) {
              const newQuestion = replacementPool[replacementIndex];

              // CRITICAL: Preserve the original index (qno) from the replaced question
              // This is essential for frontend rendering and data mapping
              newQuestion.qno = selectedQ.qno;

              nextQuestions[indexToReplace] = newQuestion;
              replacementIndex++;
            }
          });

          return nextQuestions;
        });

        // 4. Reset states after successful replacement
        setSelectedReplaceQuestions([]);
        setReplacementPool([]);
        setReplaceMode(false);
        alert("Replacement successful!");
      }
    }, [replacementPool]); // Runs when the API successfully updates replacementPool // Handler to initiate API call and fetch replacement pool

    const fetchReplacementPool = async () => {
      if (selectedReplaceQuestions.length === 0) {
        alert("Please select at least one question to replace.");
        return;
      }

      setIsFetching(true);
      setError(null); // 1. Prepare Request Body

      const overallUsedKeys = displayedQuestions.map(getCompositeKey); // Use displayedQuestions for the exclusion list // Group selected questions by chapter to build replacementRequests payload

      const chapterRequestsMap = selectedReplaceQuestions.reduce((map, q) => {
        const chapterName = q.chapter;
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

      try {
        console.log(
          "replacement Data",
          overallUsedKeys,
          "replqcement request",
          replacementRequests
        );

        const response = await axios.post(
          "http://localhost:5000/api/v1/paper/replacements",
          {
            exam: paperData.exam,
            standards: paperData.standard ? paperData.standard.split(",") : [],
            subjects: paperData.subject ? paperData.subject.split(",") : [],
            overallUsedKeys: overallUsedKeys, // Full exclusion list
            replacementRequests: replacementRequests, // List of {chapter, count}
          },
          { headers: { Authorization: `Bearer ${adminAuthToken}` } }
        );

        if (response.data.success) {
          // Trigger useEffect to perform the swap
          setReplacementPool(response.data.replacementQuestions);
        } else {
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
        setError("Could not connect to replacement service.");
      } finally {
        setIsFetching(false);
      }
    }; // --- UI Rendering Logic --- // Renders a single question block

    const renderQuestion = (q, idx, offset = 0) => {
      let qno;
      if (offset === 0) {
        qno = idx * 2 + 1;
      } else {
        qno = idx * 2 + 2;
      }

      if (qno > questionCount) return null;

      const text = q.question || "Question text not available.";
      const marks = q.marks || 1;
      const key = getCompositeKey(q);
      const isSelected = selectedReplaceQuestions.some(
        (sq) => getCompositeKey(sq) === key
      );

      let optsHtml = null;
      if (Array.isArray(q.options) && q.options.length) {
        optsHtml = (
          <ol className="ml-5 list-[lower-alpha] mt-1 text-[16px]">
                     {" "}
            {q.options.map((opt, i) => (
              <li key={i}>{opt}</li>
            ))}
                   {" "}
          </ol>
        );
      }

      return (
        <div
          key={key}
          className={`mb-4 question-item p-2 rounded-lg ${
            isSelected ? "bg-red-100 border border-red-400" : ""
          } ${replaceMode ? "cursor-pointer hover:bg-red-50" : ""}`}
          onClick={() => replaceMode && handleQuestionSelection(q)} // Only allow selection in replace mode
        >
                  {/* Checkbox Icon overlay when in replacement mode */}       {" "}
          {replaceMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleQuestionSelection(q)}
              className="mr-2 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
          )}
                  {/* Question Number and Text */}       {" "}
          <div className={`flex ${replaceMode ? "ml-6" : ""}`}>
                      <strong className="mr-2">{qno}.</strong>         {" "}
            <p className="flex-1">{text}</p>         {" "}
            <span className="ml-auto font-normal text-gray-600 whitespace-nowrap">
                          ({marks} marks)          {" "}
            </span>
                   {" "}
          </div>
                  {optsHtml}     {" "}
        </div>
      );
    };

    return (
      <div className="bg-slate-50 p-6 rounded-lg font-[Poppins]">
             {" "}
        {/* 1. Print Styles (Omitted for brevity, assume they are correct) */}   
          {/* 2. Buttons (No Print) */}     {" "}
        <div className="flex justify-between items-center mb-6 no-print">
                 {" "}
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
                      Back        {" "}
          </button>
                 {" "}
          <div className="flex gap-2">
                     {" "}
            <button
              onClick={() => setReplaceMode((prev) => !prev)}
              className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors duration-300 ${
                replaceMode ? "bg-red-600" : "bg-gray-600 hover:bg-gray-700"
              }`}
              disabled={isFetching}
            >
                          {replaceMode ? "Cancel Selection" : "Select Questions"} 
                     {" "}
            </button>
                     {" "}
            {replaceMode && (
              <button
                onClick={fetchReplacementPool}
                disabled={selectedReplaceQuestions.length === 0 || isFetching}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                             {" "}
                {isFetching
                  ? "Searching..."
                  : `Replace ${selectedReplaceQuestions.length}`}
                           {" "}
              </button>
            )}
                     {" "}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                          Print          {" "}
            </button>
                   {" "}
          </div>
               {" "}
        </div>
             {" "}
        {/* 3. Replacement Pool UI (Omitted for brevity, but should appear here when replacementPool is not empty) */}
             {" "}
        {/* 4. Printable Content (The main Question Paper/Selected Questions) */} 
           {" "}
        <div
          id="print-area"
          className="bg-white p-8 rounded-xl max-w-4xl mx-auto relative"
        >
                  {/* Header and Watermark sections omitted for brevity */}       {" "}
          {/* Questions - Two Columns */}       {" "}
          <div className="mt-8 min-h-[600px] text-[17px] leading-8 font-[EB Garamond]">
                      {/* Display Error/Loading */}         {" "}
            {error && <div className="text-red-500 text-center">{error}</div>}   
                 {" "}
            {questionCount === 0 ? (
              <div className="text-center text-gray-500 py-20">
                              No questions were generated.            {" "}
              </div>
            ) : (
              <div className="columns-q">
                              {/* Left Column (Q1, Q3, Q5, ...) */}             {" "}
                <div className="col-q left">
                                 {" "}
                  {leftContent.map((q, idx) => renderQuestion(q, idx, 0))}       
                       {" "}
                </div>
                              {/* Right Column (Q2, Q4, Q6, ...) */}             {" "}
                <div className="col-q right">
                                 {" "}
                  {rightContent.map((q, idx) => renderQuestion(q, idx, 1))}   {" "}
                </div>
                           {" "}
              </div>
            )}
                   {" "}
          </div>
               {" "}
        </div>
           {" "}
      </div>
    );
  };

  export default GeneratedTemplate;
