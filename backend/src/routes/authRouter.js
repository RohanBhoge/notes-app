import {
  adminRegister,
  adminLogin,
  studentRegister,
  studentLogin,
} from "../controllers/authController.js";
import { Router } from "express";

const router = Router();

// Admin routes
router.post("/register", adminRegister);
router.post("/login", adminLogin);

// Student routes
router.post("/register/student", studentRegister);
router.post("/login/student", studentLogin);

export default router;
