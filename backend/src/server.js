import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { pool } from "./config/mySQLConfig.js";
import { paperRouter } from "./routes/paperRouter.js";
import authRouter from "./routes/authRouter.js";

dotenv.config();

const app = express();
const CORS_ORIGIN = "http://localhost:5173";

// --- 1. Define the Whitelist of Allowed Frontend Origins ---
// Ensure all possible development ports are included.
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174", // ⬅️ THIS MUST BE ADDED TO FIX THE CURRENT ERROR
  "http://localhost:5175",
  // Add any other ports your frontend might use
];

// --- 2. Fix Port Assignment ---
const port = process.env.PORT || 5000; // Use a dedicated PORT variable, defaulting to 5000

// --- Middleware ---
app.use(express.json({ limit: "5mb" }));

// 🚀 CRITICAL FIX: Apply the permissive CORS whitelist
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Ensure OPTIONS is included for preflight
    credentials: true,
  })
);

// --- Middleware ---
app.use(express.json({ limit: "5mb" }));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(morgan("dev"));

// --- Route Mounting ---
app.use("/api/v1/paper", paperRouter);
app.use("/api/v1/auth", authRouter);

// --- Global Error Handler ---
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

// --- Graceful shutdown on SIGINT ---
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

app.get("/", (req, res) => {
  res.send("API Working");
});

app.listen(port, () =>
  console.log(`sever started on port 
     ${port}`)
);
// --- Export app for Vercel serverless ---
export default app;
