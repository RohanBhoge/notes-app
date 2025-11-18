import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { pool } from "./config/mySQLConfig.js";
import { paperRouter } from "./routes/paperRouter.js";
import authRouter from "./routes/authRouter.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// --- 1. Middleware ---
app.use(express.json({ limit: "5mb" }));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(morgan("dev"));

// --- 2. Route Mounting ---
// Paper routes
app.use("/api/v1/paper", paperRouter);

// Auth routes
app.use("/api/v1/auth", authRouter);


// --- 4. Global Error Handler (CRITICAL for Express) ---
app.use((err, req, res, next) => {
  console.error(`\n--- ERROR START ---`);
  console.error(`[${req.method} ${req.originalUrl}]`);
  console.error(err.stack || err);
  console.error(`--- ERROR END ---\n`);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// --- 5. Start Server and Graceful Shutdown ---

process.on("SIGINT", async () => {
  console.log("\nClosing MySQL pool...");
  try {
    await pool.end();
    console.log("MySQL pool closed successfully.");
  } catch (e) {
    console.error("Error closing MySQL pool:", e);
  }
  process.exit(0);
});

async function startServer() {
  // await logDbSchemas();
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  );
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
