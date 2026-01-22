import { Router } from 'express';
import {
  getPaper,
  deletePapers,
  getAllPaperSummaries,
  generatePaper,
  storePaper,
  getReplaceableQuestions,
} from '../controllers/paperController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  generatePaperSchema,
  storePaperSchema,
  deletePapersSchema,
  getReplacementsSchema
} from '../validators/paperValidator.js';

const paperRouter = Router();

paperRouter.get('/get-paper/:id', requireAuth, getPaper);
paperRouter.delete('/delete-paper', requireAuth, validate(deletePapersSchema), deletePapers);
paperRouter.get('/get-paper-history', requireAuth, getAllPaperSummaries);
paperRouter.post('/generate-paper', requireAuth, validate(generatePaperSchema), generatePaper);
paperRouter.post('/store-paper', requireAuth, validate(storePaperSchema), storePaper);
paperRouter.post('/replacements', requireAuth, validate(getReplacementsSchema), getReplaceableQuestions);

export { paperRouter };
