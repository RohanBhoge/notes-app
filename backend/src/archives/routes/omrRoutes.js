import multer from "multer";
import { omrProcessController } from "../Controllers/omrController.js";
import { Router } from "express";
const omrRouter = Router();

omrRouter.post(
  "/omrsheet",
  multer({ storage: multer.memoryStorage() }).fields([
    { name: "image", maxCount: 1 },
    { name: "omr", maxCount: 1 },
  ]),
  omrProcessController
);

export { omrRouter };
