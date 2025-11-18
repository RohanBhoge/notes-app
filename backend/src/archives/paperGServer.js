// src/server.js

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import paperRoutes from "../routes/paperGenerationRoutes.js";

// --- Path Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- App Initialization ---
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory at the project root level
// Assuming 'public' is one directory up from 'src'
app.use(express.static(path.join(__dirname, "..", "public")));

// --- Routes ---
app.use("/", paperRoutes);

// Global Error Handler (Good practice)
app.use((err, req, res, next) => {
  console.error("[Global Error Handler]", err.stack);
  res.status(500).send({
    error: "Something broke!",
    details: process.env.NODE_ENV === "production" ? null : err.message,
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log("Routes mounted from /src/routes/paperRoutes.js");
  console.log(`Frontend served from: ${path.join(__dirname, "..", "public")}`);
});
