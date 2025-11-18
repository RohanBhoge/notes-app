import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware.js";
import { pool } from "../../config/mySQLConfig.js";

const router = Router();

router.get("/db-schema", requireAuth, async (req, res) => {
  try {
    const dbName = process.env.DB_NAME || "papergeneration";
    const [usersCols] = await pool.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [dbName]
    );
    const [papersCols] = await pool.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'question_papers'`,
      [dbName]
    );

    res.json({ users: usersCols, question_papers: papersCols });
  } catch (err) {
    console.error("Internal /db-schema error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch DB schema", details: err.message });
  }
});

export default router;
