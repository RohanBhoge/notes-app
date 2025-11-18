// src/routes/paperRoutes.js

import express from "express";
import * as controller from "../../controllers/paperController.js";

const paperGeneration = express.Router();

// // Health Check
// paperRoutes.get("/health", (req, res) => res.json({ ok: true, server: "up" }));

// // Debug Endpoints
// paperRoutes.get("/debug/status", async (req, res) => {
//   // Keep this simple check to avoid complexity, rely on controller for detailed logging
//   try {
//     const { loadQuestionsFromZip } = await import("../utils/zipLoader.js");
//     const zipRes = await loadQuestionsFromZip();
//     res.json({
//       serverTimestamp: new Date().toISOString(),
//       questionsCount: zipRes.questions?.length ?? 0,
//       zipPath: zipRes.zipPath,
//       loadStatus: zipRes.ok ? "OK" : zipRes.error,
//     });
//   } catch (e) {
//     res.status(500).json({ error: "Status check failed", details: e.message });
//   }
// });
// paperRoutes.get("/debug/subjects", controller.getDebugSubjects);

// Question Paper APIs
// paperRoutes.get(
//   "/api/generate-question-paper",
//   controller.generateQuestionPaperHtml
// );

// // NEW: Backend Storage API
paperGeneration.post(
  "/generate-backend-paper",
  controller.generateBackendPaper
);

// // Cache Management
// paperRoutes.post("/api/refresh-zip-cache", controller.refreshZipCache);

export default paperGeneration;
