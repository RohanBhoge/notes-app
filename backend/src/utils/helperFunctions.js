import { pool } from "../config/mySQLConfig.js";
import dotenv from "dotenv";

dotenv.config();
const DB_NAME = process.env.DB_NAME || "papergeneration";

async function createUser(email, password_hash, full_name = null) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [cols] = await connection.execute(
      `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [DB_NAME]
    );

    const colSet = new Set(cols.map((c) => c.COLUMN_NAME));

    const insertCols = [];
    const placeholders = [];
    const values = [];

    if (colSet.has("email")) {
      insertCols.push("email");
      placeholders.push("?");
      values.push(email);
    }
    if (colSet.has("password_hash")) {
      insertCols.push("password_hash");
      placeholders.push("?");
      values.push(password_hash);
    }

    if (colSet.has("username")) {
      let username = null;
      if (full_name && String(full_name).trim())
        username = String(full_name).trim().split(" ")[0];
      else if (email && String(email).includes("@"))
        username = String(email).split("@")[0];
      else username = String(email || "user").slice(0, 50);

      insertCols.push("username");
      placeholders.push("?");
      values.push(username);
    }

    if (colSet.has("full_name")) {
      insertCols.push("full_name");
      placeholders.push("?");
      values.push(full_name);
    }

    if (insertCols.length === 0) {
      throw new Error(
        "No known user columns present in database to insert into."
      );
    }

    const sql = `INSERT INTO users (${insertCols.join(
      ","
    )}) VALUES (${placeholders.join(",")})`;
    const [result] = await connection.execute(sql, values);
    return result.insertId;
  } finally {
    if (connection) connection.release();
  }
}

async function getUserByEmail(email) {
  let connection;
  try {
    connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = ? LIMIT 1`,
        [email]
      );
      return rows.length ? rows[0] : null;
    } catch (err) {
      if (err && err.code === "ER_BAD_FIELD_ERROR") {
        const [rows2] = await connection.execute(
          `SELECT id, email, password_hash, created_at FROM users WHERE email = ? LIMIT 1`,
          [email]
        );
        if (!rows2.length) return null;
        const r = rows2[0];
        return {
          id: r.id,
          email: r.email,
          password_hash: r.password_hash,
          full_name: null,
          created_at: r.created_at,
        };
      }
      throw err;
    }
  } finally {
    if (connection) connection.release();
  }
}

async function getUserByFullName(fullName) {
  let connection;
  try {
    connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT id, email, password_hash, full_name, created_at FROM users WHERE full_name = ? LIMIT 1`,
        [fullName]
      );
      return rows.length ? rows[0] : null;
    } catch (err) {
      if (err && err.code === "ER_BAD_FIELD_ERROR") {
        const [rows2] = await connection.execute(
          `SELECT id, email, password_hash, created_at FROM users WHERE full_name = ? LIMIT 1`,
          [fullName]
        );
        if (!rows2.length) return null;
        const r = rows2[0];
        return {
          id: r.id,
          email: r.email,
          password_hash: r.password_hash,
          full_name: null,
          created_at: r.created_at,
        };
      }
      throw err;
    }
  } finally {
    if (connection) connection.release();
  }
}

async function createNewPaperForUser(userId, data) {
  let connection;
  try {
    connection = await pool.getConnection();

    const insertQuery = `
      INSERT INTO question_papers (
        user_id, paper_id, exam_name, class, subject, exam_date, marks,
        paper_questions, paper_answers, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      userId,
      data.paper_id,
      data.exam_name,
      data.class,
      data.subject,
      data.exam_date,
      data.marks,
      data.paper_questions,
      data.paper_answers,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ];

    const [result] = await connection.execute(insertQuery, values);
    return result.insertId;
  } finally {
    if (connection) connection.release();
  }
}

async function getPapersByUserId(userId) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, paper_id, exam_name, class, subject, exam_date, marks, paper_questions, paper_answers, metadata, created_at, updated_at FROM question_papers WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map((r) => ({
      ...r,
      metadata:
        r.metadata && typeof r.metadata === "string"
          ? JSON.parse(r.metadata)
          : r.metadata || null,
    }));
  } finally {
    if (connection) connection.release();
  }
}

async function getPaperByIdForUser(userId, paperId) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, paper_id, exam_name, class, subject, exam_date, marks, paper_questions, paper_answers, metadata, created_at, updated_at FROM question_papers WHERE user_id = ? AND paper_id = ? LIMIT 1`,
      [userId, paperId]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      ...r,
      metadata:
        r.metadata && typeof r.metadata === "string"
          ? JSON.parse(r.metadata)
          : r.metadata || null,
    };
  } finally {
    if (connection) connection.release();
  }
}

async function deletePapersForUser(userId, paperIds = []) {
  if (!Array.isArray(paperIds) || paperIds.length === 0)
    return { deletedCount: 0, deletedIds: [] };
  let connection;
  try {
    connection = await pool.getConnection();

    const placeholders = paperIds.map(() => "?").join(",");
    const selectSql = `SELECT paper_id FROM question_papers WHERE user_id = ? AND paper_id IN (${placeholders})`;
    const selectParams = [userId, ...paperIds];
    const [foundRows] = await connection.execute(selectSql, selectParams);
    const foundIds = foundRows.map((r) => r.paper_id);

    if (foundIds.length === 0) {
      return { deletedCount: 0, deletedIds: [] };
    }

    const deletePlaceholders = foundIds.map(() => "?").join(",");
    const deleteSql = `DELETE FROM question_papers WHERE user_id = ? AND paper_id IN (${deletePlaceholders})`;
    const deleteParams = [userId, ...foundIds];
    const [result] = await connection.execute(deleteSql, deleteParams);

    return { deletedCount: result.affectedRows || 0, deletedIds: foundIds };
  } finally {
    if (connection) connection.release();
  }
}
async function getAdminByUserName(userName) {
  let connection;
  try {
    connection = await pool.getConnection();
    const query = `SELECT id, email FROM users WHERE full_name = ?`;

    // Execute query and destructure the results (rows and fields)
    const [rows] = await connection.execute(query, [userName]);

    // Return the first row found, or null if array is empty
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("DB Error in getAdminByUserName:", error);
    throw new Error("Database error during admin lookup.");
  } finally {
    if (connection) connection.release();
  }
}

async function getStudentByEmail(email) {
  let connection;
  try {
    connection = await pool.getConnection();
    const query = `SELECT id, user_id, user_name, email, password_hash, full_name, std, class FROM students WHERE email = ?`;

    const [rows] = await connection.execute(query, [email]);

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("DB Error in getStudentByEmail:", error);
    throw new Error("Database error during student lookup.");
  } finally {
    if (connection) connection.release();
  }
}

/**
 * 2. Creates a new student record, linking it to the organization via the Admin user_id.
 * * @param {number} adminUserId - Foreign key linking to the 'users' table.
 * @param {string} studentUserName - Student's unique username (e.g., email prefix).
 * @param {string} email - Student's email (must be unique).
 * @param {string} passwordHash - Hashed password.
 * @param {string | null} fullName - Student's full name.
 * @param {string | null} std - Student's current standard/grade.
 * @param {string | null} classVal - Student's class name/section.
 * @returns {Promise<number>} - The ID of the newly created student row.
 */
async function createStudent(
  adminUserId,
  studentUserName,
  email,
  passwordHash,
  fullName,
  std,
  classVal
) {
  let connection;
  try {
    connection = await pool.getConnection();

    const insertQuery = `
            INSERT INTO students 
            (user_id, user_name, email, password_hash, full_name, std, class) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

    const values = [
      adminUserId,
      studentUserName,
      email,
      passwordHash,
      fullName,
      std,
      classVal,
    ];

    const [result] = await connection.execute(insertQuery, values);

    // result.insertId contains the ID of the new row in the 'students' table
    return result.insertId;
  } catch (error) {
    console.error("DB Error in createStudent:", error);
    // Re-throw the error for the calling controller to handle (e.g., ER_DUP_ENTRY)
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export {
  createUser,
  getUserByEmail,
  getUserByFullName,
  getPapersByUserId,
  createNewPaperForUser,
  getPaperByIdForUser,
  deletePapersForUser,
  createStudent,
  getAdminByUserName,
  getStudentByEmail,
};
