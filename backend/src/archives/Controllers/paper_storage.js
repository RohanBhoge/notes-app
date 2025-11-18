import pool from "../../config/dbConfig.js";

async function storePaperData(paperData) {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log(`Attempting to insert paper: ${paperData.paperUniqueId}`);

    // SQL INSERT statement with placeholders (?)
    const insertQuery = `
            INSERT INTO exam_papers (
                paper_unique_id, exam_name, exam_date, 
                standard, subject, exam_time_minutes, max_marks,
                question_paper, answer_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    // Array of values corresponding to the placeholders above
    const values = [
      paperData.paperUniqueId,
      paperData.examName,
      paperData.dateOfExam,
      paperData.standard,
      paperData.subject,
      paperData.examTime,
      paperData.paperMarks,
      paperData.questionPaper,
      paperData.answerKey,
    ];

    // Execute the query using prepared statements for security
    const [result] = await connection.execute(insertQuery, values);

    console.log("Insertion successful!");
    return {
      success: true,
      insertId: result.insertId,
      message: `Paper data saved with ID: ${result.insertId}`,
    };
  } catch (error) {
    console.error("Database INSERT failed:", error.message);
    return { success: false, message: error.message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// --- Example Usage ---

const samplePaper = {
  paperUniqueId: "M-2025-Q1-T001",
  examName: "Quarterly Math Exam",
  dateOfExam: "2025-10-15", // MySQL DATE format YYYY-MM-DD
  standard: "10th Grade",
  subject: "Mathematics",
  examTime: 90, // In minutes
  paperMarks: 50,
  questionPaper: `
        1. (10 marks) Prove the Pythagorean theorem using the concept of similar triangles. 
        2. (5 marks) Calculate the derivative of $f(x) = x^3 - 4x + 2$.
        3. (10 marks) Explain the difference between primary and secondary storage.
        ... [Full question paper content here] ...
    `,
  answerKey: `
        Q1. Proof requires drawing altitude to hypotenuse, showing $\Delta ABC \sim \Delta CBD$ and $\Delta ABC \sim \Delta ACD$.
        Q2. $f'(x) = 3x^2 - 4$.
        Q3. Primary storage (RAM) is volatile and fast. Secondary storage (SSD/HDD) is non-volatile and slower.
        ... [Full answer key content here] ...
    `,
};

// Execute the storage function
storePaperData(samplePaper)
  .then((response) => {
    console.log("\nFinal Operation Result:");
    console.log(response);
  })
  .catch((err) => {
    console.error("\nApplication Error:", err);
  });
