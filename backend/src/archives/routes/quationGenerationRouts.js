import { Router } from "express";
import { getQuestionsHtml } from "../Controllers/paperGenerationController.js";

const questionGenerationRouter = Router();

questionGenerationRouter.get("/text-questions.html", getQuestionsHtml);

export default questionGenerationRouter;
