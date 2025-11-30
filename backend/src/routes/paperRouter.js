import { Router } from "express";
import {
  getPaper,
  deletePapers,
  getAllPaperSummaries,
  generatePaper,
  storePaper,
  getReplaceableQuestions,
} from "../controllers/paperController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const paperRouter = Router();

paperRouter.get("/get-paper/:id", requireAuth, getPaper);
paperRouter.delete("/delete-paper", requireAuth, deletePapers);
paperRouter.get("/get-paper-history", requireAuth, getAllPaperSummaries);
paperRouter.post("/generate-paper", requireAuth, generatePaper);
paperRouter.post("/store-paper", requireAuth, storePaper);
paperRouter.post("/replacements", requireAuth, getReplaceableQuestions);

export { paperRouter };