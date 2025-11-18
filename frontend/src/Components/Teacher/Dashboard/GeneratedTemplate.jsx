import React, { useMemo } from "react";

// MODIFIED Helper to split array for row-wise interleaving
const splitIntoTwo = (arr) => {
  const left = [];
  const right = [];

  arr.forEach((item, index) => {
    // Items with odd index (1, 3, 5, etc. -> Q2, Q4, Q6) go to the right column
    if ((index + 1) % 2 === 0) {
      right.push(item);
    } else {
      // Items with even index (0, 2, 4, etc. -> Q1, Q3, Q5) go to the left column
      left.push(item);
    }
  });
  return [left, right];
};

const formatDateDDMMYYYY = (isoDate) => {
  if (!isoDate) return "";
  // Check if it's already in YYYY-MM-DD format from a date picker
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }

  // Fallback for Date object parsing (original file's logic)
  const d = new Date(isoDate);
  // Check if the date is valid before formatting
  if (isNaN(d.getTime())) return isoDate;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Simplified component based on GenerateTemplate's structure
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
  // --- 1. Data Extraction (Keep relevant parts) ---

  const paperData = generatedPaper?.data || {};
  const questions = paperData?.metadata?.original_questions_array || [];

  // Use data from generatedPaper first, then fallback to local props
  const finalMarks = paperData.marks || totalMarks;
  const finalExamName = paperData.exam_name || localExamName;
  const finalClassName = paperData.class || localClassName;
  const questionCount = questions.length;

  const formattedDate = useMemo(
    () =>
      paperData.exam_date
        ? formatDateDDMMYYYY(paperData.exam_date)
        : formatDateDDMMYYYY(examDate),
    [paperData.exam_date, examDate]
  );

  // Split content into two columns using the new interleaving logic
  const [leftContent, rightContent] = useMemo(
    () => splitIntoTwo(questions),
    [questions]
  );

  // --- 2. Content Rendering Helper (Modified to accept offset) ---

  // Renders a single question block, adapted for the simple layout
  const renderQuestion = (q, idx, offset = 0) => {
    // Determine the original question number
    let qno;
    if (offset === 0) {
      // Left column: Q1, Q3, Q5... (index * 2 + 1)
      qno = idx * 2 + 1;
    } else {
      // Right column: Q2, Q4, Q6... (index * 2 + 2)
      qno = idx * 2 + 2;
    }

    const text = q.question || "Question text not available.";
    const marks = q.marks || 1;

    let optsHtml = null;
    if (Array.isArray(q.options) && q.options.length) {
      optsHtml = (
        <ol className="ml-5 list-[lower-alpha] mt-1 text-[16px]">
          {q.options.map((opt, i) => (
            <li key={i}>{opt}</li>
          ))}
        </ol>
      );
    }

    // Only render if the calculated question number is within the total count
    if (qno > questionCount) return null;

    return (
      <div key={qno} className="mb-4 question-item">
        {/* Question Number and Text */}
        <div className="flex">
          <strong className="mr-2">{qno}.</strong>
          <p className="flex-1">{text}</p>
          <span className="ml-auto font-normal text-gray-600 whitespace-nowrap">
            ({marks} marks)
          </span>
        </div>

        {/* Options */}
        {optsHtml}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 p-6 rounded-lg font-[Poppins]">
      {/* 1. Print Styles (Includes all fixes) */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap');

          /* NEW: Define page borders */
          @page {
              margin: 0.5in;
              border: 1px solid black; /* BORDER FOR EVERY PAGE */
          }
          
          /* Two Column Styles */
          .columns-q { 
            display: flex; 
            gap: 24px; 
            padding-top: 10px; 
            /* Fix: Ensures columns stretch to min-height for middle line visibility */
            align-items: stretch; 
            min-height: inherit; 
          }
          .col-q { 
            flex: 1 1 50%; 
            padding: 0 16px; 
            height: 100%; 
          }
          .col-q.left { 
            border-right: 1px solid #e1e1e1; /* The Middle Line */
          }
          .question-item {
              padding-bottom: 10px;
          }
          
          /* Watermark Styling for Screen & Print */
          .watermark { 
            pointer-events:none; 
            position:absolute; /* Default screen position */
            left:50%; 
            top:50%; 
            transform:translate(-50%,-50%) rotate(-28deg); 
            font-size:72px; 
            font-weight:800; 
            color:#000; 
            opacity:0.06; /* Screen Transparency */
            z-index:1; 
            white-space:nowrap; 
          }

          /* Print overrides */
          @media print {
            body * { visibility: hidden !important; }
            #print-area, #print-area * { visibility: visible !important; }

            /* Reset the default border on #print-area for print to prevent double border */
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              box-shadow: none !important;
              font-family: 'EB Garamond', serif !important;
              height: 100vh !important;
              border: none !important; /* Remove border from #print-area element */
            }

            .no-print { display: none !important; }

            /* FIX: Use fixed position on the BODY during print to force repeat on every page */
            .watermark { 
                position: fixed !important; 
                opacity: 0.3 !important; /* Increased print opacity */
                /* Ensure it centers relative to the viewport/page */
                left: 50%;
                top: 50%;
                transform:translate(-50%,-50%) rotate(-28deg); 
            }

            /* Ensure two columns and page break rules */
            .columns-q {
                display: flex !important;
                align-items: stretch !important;
                min-height: inherit !important; 
            }
            .col-q {
                height: 100% !important; 
            }
            .col-q.left {
                border-right: 1px solid #e1e1e1 !important;
            }
            .question-item {
                page-break-inside: avoid;
            }
          }
        `}
      </style>

      {/* 2. Buttons (No Print) */}
      <div className="flex justify-between items-center mb-6 no-print">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Back
        </button>

        <div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg mr-2 hover:bg-blue-700"
          >
            Print
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Save as PDF
          </button>
        </div>
      </div>

      {/* 3. Printable Content */}
      <div
        id="print-area"
        className="bg-white p-8 rounded-xl max-w-4xl mx-auto relative" // Removed the Tailwind border class here
      >
        <div className="watermark">Bisugen pvt.ltd.</div>{" "}
        {/* WATERMARK ELEMENT - Now fixed in print */}
        {/* ✅ Header with Larger Font - UNCHANGED */}
        <div className="border border-black p-4">
          <div className="flex justify-between items-start font-semibold text-[17px]">
            {/* Left - Class */}
            <div>Class: {finalClassName || "N/A"}</div>

            {/* Center - Exam Name */}
            <div className="text-center flex-1 font-bold text-[20px]">
              {finalExamName || "EXAM NAME"}
            </div>

            {/* Right - Left aligned text but positioned right */}
            <div className="flex flex-col text-[16px] leading-[1.5] items-start gap-1">
              <span>Date: {formattedDate || "--/--/----"}</span>
              <span>Time: {examDuration || "--"}</span>
              <span>Marks: {finalMarks || "--"}</span>
            </div>
          </div>

          {/* Subject full width */}
          <div className="text-[17px] font-semibold">
            Subject: {subjectName || "_"}
          </div>
        </div>
        {/* Questions - Two Columns (Row-wise split) */}
        <div className="mt-8 min-h-[600px] text-[17px] leading-8 font-[EB Garamond]">
          {questionCount === 0 ? (
            <div className="text-center text-gray-500 py-20">
              No questions were generated.
            </div>
          ) : (
            <div className="columns-q">
              {/* Left Column (Q1, Q3, Q5, ...) */}
              <div className="col-q left">
                {leftContent.map((q, idx) => renderQuestion(q, idx, 0))}
              </div>

              {/* Right Column (Q2, Q4, Q6, ...) */}
              <div className="col-q right">
                {rightContent.map((q, idx) => renderQuestion(q, idx, 1))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratedTemplate;
