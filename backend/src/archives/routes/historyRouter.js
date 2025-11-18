import { Router } from "express";
import { NewPaper, getPaper } from "../Controllers/datastorageController.js";
const historyRouter = Router();

historyRouter.post("/paper", NewPaper);
historyRouter.get("/paper/:id", getPaper);

export { historyRouter };
