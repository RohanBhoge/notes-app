import express from "express";
import {
  createNotification,
  getAllNotifications,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const notificationRouter = express.Router();

notificationRouter.post("/store-notification", requireAuth, createNotification);

notificationRouter.get(
  "/getAll-notification",
  requireAuth,
  getAllNotifications
);

export default notificationRouter;
