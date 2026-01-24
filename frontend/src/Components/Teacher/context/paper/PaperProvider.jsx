import PaperContext from "./PaperContext.jsx";
import { useState, useEffect } from "react";

const PaperProvider = (props) => {
  const [form, setForm] = useState({
    paperId: "",
    examName: "",
    className: "",
    subjectName: "",
    examDate: "",
    totalMarks: "",
  });

  const [paperData, setPaperData] = useState({
    exam: "",
    class: "",
    subject: "",
    chapters: [],
    count: 10,
  });

  const [exam, setExam] = useState("");
  const [standards, setStandards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [backendPaperData, setBackendPaperData] = useState(null);
  const [showGenerateOptions, setShowGenerateOptions] = useState(false);
  const [marks, setMarks] = useState(null);
  const [examDate, setExamDate] = useState("");
  const [examDuration, setExamDuration] = useState("");


  // 🔄 Sync effect: Log paperData changes for debugging
  useEffect(() => {
    console.log("[PaperProvider] paperData updated:");
  }, [paperData]);

  // 🔄 Sync effect: Log exam, standards, subjects changes
  useEffect(() => {
    console.log("[PaperProvider] Exam/Standards/Subjects updated:");
  }, [exam, standards, subjects]);

  // 🔄 Sync effect: Log backendPaperData changes
  useEffect(() => {
    if (backendPaperData) {
      console.log("[PaperProvider] backendPaperData updated:");
    }
  }, [backendPaperData]);

  // 🔄 Sync effect: Log showGenerateOptions changes
  useEffect(() => {
    console.log("[PaperProvider] showGenerateOptions:");
  }, [showGenerateOptions]);

  // 🔄 Sync effect: Log examDate and examDuration changes
  useEffect(() => {
    console.log("[PaperProvider] Exam Date/Duration updated:");
  }, [examDate, examDuration]);

  // 🔄 Sync effect: Log marks changes
  useEffect(() => {
    if (marks !== null) {
      console.log("[PaperProvider] Marks updated:");
    }
  }, [marks]);

  return (
    <PaperContext.Provider
      value={{
        form,
        setForm,
        paperData,
        setPaperData,
        exam,
        setExam,
        standards,
        setStandards,
        subjects,
        setSubjects,
        backendPaperData,
        setBackendPaperData,
        showGenerateOptions,
        setShowGenerateOptions,
        marks,
        setMarks,
        examDate,
        setExamDate,
        examDuration,
        setExamDuration,
      }}
    >
      {props.children}
    </PaperContext.Provider>
  );
};

export default PaperProvider;
