import express from "express";
import multer from "multer";
import { handleExtraction } from "../Controllers/ocrExtractController.js";
import fs from "fs/promises";

// --- Multer Configuration ---
const UPLOAD_DIR = "./uploads";

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (e) {
      cb(e, UPLOAD_DIR);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
const ocrRouter = express.Router();

ocrRouter.post("/ocr-extract", upload.single("file"), handleExtraction);

export default ocrRouter;
