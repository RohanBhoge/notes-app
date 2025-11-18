import { Router } from "express";
import {
  getPaper,
  deletePapers,
  getAllPaperSummaries,
  generateBackendPaper,
} from "../controllers/paperController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const paperRouter = Router();

paperRouter.get("/get-paper/:id", requireAuth, getPaper);
paperRouter.delete("/delete-paper", requireAuth, deletePapers);
paperRouter.get("/get-paper-history", requireAuth, getAllPaperSummaries);
paperRouter.post("/generate-paper", requireAuth, generateBackendPaper);

export { paperRouter };
