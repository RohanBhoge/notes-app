#!/usr/bin/env node
// scripts/run-init-db.js
// Reads backend/scripts/init-auth-schema.sql and executes statements against the configured MySQL DB.

import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_NAME = process.env.DB_NAME || "papergeneration";

async function run() {
  const sqlPath = path.resolve(
    process.cwd(),
    "scripts",
    "init-auth-schema.sql"
  );
  if (!fs.existsSync(sqlPath)) {
    console.error("SQL file not found:", sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");

  // Split statements on semicolon followed by newline; keep simple and filter empty
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Connecting to ${DB_USER}@${DB_HOST}/${DB_NAME}`);
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
  });
  try {
    // Ensure database exists
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await conn.query(`USE \`${DB_NAME}\``);

    const errors = [];

    // Execute all statements except the question_papers CREATE; we'll create that dynamically
    const questionPapersStmtIndex = statements.findIndex((s) =>
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+question_papers/i.test(s)
    );

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (i === questionPapersStmtIndex) {
        console.log(
          "Skipping question_papers CREATE; will create with matching user_id type"
        );
        continue;
      }
      try {
        await conn.query(stmt);
        console.log("OK:", stmt.split("\n")[0].slice(0, 120));
      } catch (err) {
        // Collect errors and continue so we can report all of them.
        console.error("ERROR executing statement:", err.code || err.message);
        console.error(stmt.split("\n")[0].slice(0, 160));
        errors.push({
          stmt: stmt.slice(0, 200),
          code: err.code,
          message: err.message,
        });
      }
    }

    // If we skipped question_papers creation earlier, create it now with matching user_id column type
    if (questionPapersStmtIndex !== -1) {
      try {
        // Inspect users.id column type
        const [idCols] = await conn.query(
          `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'`,
          [DB_NAME]
        );
        if (!idCols || idCols.length === 0) {
          throw new Error(
            "users.id column not found; cannot create question_papers with matching FK"
          );
        }

        const usersIdType = idCols[0].COLUMN_TYPE; // e.g. 'int(11)' or 'bigint(20) unsigned'
        // Build question_papers CREATE using the detected users id type for user_id
        const createQuestionPapers = `CREATE TABLE IF NOT EXISTS question_papers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id ${usersIdType} NOT NULL,
  paper_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  exam_name VARCHAR(255),
  class VARCHAR(100),
  subject VARCHAR(255),
  exam_date DATE,
  marks INT DEFAULT 0,
  paper_questions LONGTEXT,
  paper_answers LONGTEXT,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_user_id (user_id),
  UNIQUE KEY uq_paper_id (paper_id)
);`;

        await conn.query(createQuestionPapers);
        console.log(
          "Created question_papers with user_id type matching users.id ->",
          usersIdType
        );
      } catch (err) {
        console.error(
          "Failed to create question_papers table dynamically:",
          err && err.message ? err.message : err
        );
        errors.push({
          stmt: "CREATE TABLE question_papers (dynamic)",
          code: err.code,
          message: err.message,
        });
      }
    }

    if (errors.length) {
      console.error(`Init completed with ${errors.length} errors.`);
      for (const e of errors) {
        console.error(`- [${e.code}] ${e.message} -- ${e.stmt}`);
      }
      console.error("Aborting with non-zero exit due to init errors.");
      process.exit(2);
    }

    console.log("Database initialization finished successfully.");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("Failed to run init-db:", err);
  process.exit(1);
});
