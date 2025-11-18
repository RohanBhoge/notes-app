import { pool } from "../../config/dbConfig.js";

export const getAllPaperSummaries = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const selectQuery = `
            SELECT 
                paper_id, 
                exam_name, 
                class, 
                subject, 
                exam_date, 
                marks AS totalMarks 
            FROM exam_papers
            ORDER BY exam_date DESC;
        `;

    const [rows] = await connection.execute(selectQuery);

    const papersWithStatus = rows.map((p) => ({
      ...p,
      status: "checked",
      totalMarks: p.totalMarks || 0,
      examDate: p.exam_date
        ? new Date(p.exam_date).toISOString().split("T")[0]
        : "N/A",
    }));

    res.json({
      success: true,
      papers: papersWithStatus,
    });
  } catch (error) {
    console.error("DB Fetch All Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve paper history from database.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};
