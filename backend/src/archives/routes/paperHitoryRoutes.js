import express from "express";
import { getAllPaperSummaries } from "../Controllers/paperHistoryController.js";

const paperHistoryRouter = express.Router();

paperHistoryRouter.get("/get-paper-history", getAllPaperSummaries);

export default paperHistoryRouter;
