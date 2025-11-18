// db_service.js
import mysql from "mysql2/promise";

// --- Configuration ---
export const pool = mysql.createPool({
  host: "localhost",
  user: "Rohan",
  password: "Rohan@2003",
  database: "papergeneration",
  connectionLimit: 10,
  waitForConnections: true,
});

export async function createNewPaper(data) {
  let connection;
  try {
    connection = await pool.getConnection();

    const insertQuery = `
            INSERT INTO exam_papers (
                paper_id, exam_name, class, subject, exam_date, marks, 
                paper_questions, paper_answers
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const values = [
      data.paper_id,
      data.exam_name,
      data.class,
      data.subject,
      data.exam_date,
      data.marks,
      data.paper_questions,
      data.paper_answers,
    ];

    const [result] = await connection.execute(insertQuery, values);
    return result.insertId;
  } catch (error) {
    console.error("DB INSERT Error:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function getPaperById(paperId) {
  let connection;
  try {
    connection = await pool.getConnection();

    const selectQuery = `
            SELECT id, paper_id, exam_name, class, subject, exam_date, marks, paper_questions, paper_answers
            FROM exam_papers 
            WHERE paper_id = ?
        `;

    const [rows] = await connection.execute(selectQuery, [paperId]);

    // Return the first row, or null if the array is empty
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("DB SELECT Error:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Ensure pool closes cleanly on process exit (optional, but good practice)
process.on("SIGINT", async () => {
  console.log("\nClosing MySQL pool...");
  await pool.end();
  process.exit();
});
